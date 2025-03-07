import { getLocalPath, toAbsoluteUrl } from "./shared.js";
import * as fs from 'fs/promises';
import * as acorn from 'acorn';

// Extend the Node type with specific Acorn node types
interface LiteralNode extends acorn.Node {
  type: 'Literal';
  value: string | number | boolean | null | RegExp;
}

interface TemplateLiteralNode extends acorn.Node {
  type: 'TemplateLiteral';
  quasis: Array<{ value: { cooked: string | undefined } }>;
}

// Function to extract string literals from an AST node
function extractStringLiterals(node: acorn.Node): string[] {
  // Handle regular string literals with type guard
  if (node.type === 'Literal' && typeof (node as LiteralNode).value === 'string') {
    return [(node as LiteralNode).value as string];
  }
  // Handle template literals with type guard
  else if (node.type === 'TemplateLiteral') {
    const templateNode = node as TemplateLiteralNode;
    return templateNode.quasis
      .map((quasi) => quasi.value.cooked)
      .filter((str): str is string => str !== undefined);
  }

  // Handle regular string literals
  // if (node.type === 'Literal' && typeof node.value === 'string') {
  //   return [node.value];
  // }
  // // Handle template literals (extract static string parts)
  // else if (node.type === 'TemplateLiteral') {
  //   return node.quasis.map((quasi) => quasi.value.cooked).filter((str) => str !== undefined);
  // }

  // Recursively traverse child nodes
  let strings: string[] = [];
  for (const key in node) {
    const value = (node as any)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && 'type' in child) {
          strings = strings.concat(extractStringLiterals(child));
        }
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      strings = strings.concat(extractStringLiterals(value));
    }
  }
  return strings;
}

// Main function to scrape URLs and file paths
async function scrapeReferences(jsCode: string): Promise<{ urls: string[], filePaths: string[] }> {
  try {
    // Step 1: Get the .js file content
    const code = jsCode;

    // Step 2: Parse the code into an AST
    const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });

    // Step 3: Extract all string literals
    const stringLiterals = extractStringLiterals(ast);

    // Step 4: Define regex patterns
    const urlRegex = /https?:\/\/\S+/i; // Matches http:// or https:// followed by non-spaces
    const filePathRegex = /(\.\/|\.\.\/|\/|\\)/; // Matches strings with ./, ../, /, or \

    // Step 5: Filter strings into URLs and file paths
    const urls = stringLiterals.filter((str) => urlRegex.test(str));
    const filePaths = stringLiterals.filter((str) => filePathRegex.test(str) && !urlRegex.test(str)); // Exclude URLs

    return { urls, filePaths };
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

export async function getAllAssetsPathsFromJs(js: string, baseUrl: string, outputDir: string): Promise<Map<string, string>> {
  const assetMap = new Map<string, string>();

  const urls2: string[] = [];

  const { urls, filePaths } = await scrapeReferences(js);
  //console.log('URLs found:', urls);
  //console.log('File Paths found:', filePaths);

  // Convert all URLs to absolute and map them to local paths
  urls2.forEach(url => {
    const absoluteUrl = toAbsoluteUrl(url, baseUrl);
    const localPath = getLocalPath(absoluteUrl, outputDir);
    assetMap.set(absoluteUrl, localPath);
  });

  return assetMap;
}