import * as postcss from 'postcss';
import valueParser from 'postcss-value-parser';

import { getLocalPath, toAbsoluteUrl } from "./shared.js";

export async function getAllAssetsPathsFromCss(css: string, baseUrl: string, outputDir: string): Promise<Map<string, string>> {
  const assetMap = new Map<string, string>();

  const urls2: string[] = [];

  const urls = extractUrlsFromCss(css);
  //console.log('CSS Extracted URLs:', urls);


  // Convert all URLs to absolute and map them to local paths
  urls2.forEach(url => {
    const absoluteUrl = toAbsoluteUrl(url, baseUrl);
    const localPath = getLocalPath(absoluteUrl, outputDir);
    assetMap.set(absoluteUrl, localPath);
  });

  return assetMap;
}

/**
 * Extracts all URL references and file paths from a compiled CSS file.
 * @param cssContent - The content of the CSS file as a string.
 * @returns An array of URL strings found in the CSS.
 */
function extractUrlsFromCss(cssContent: string): string[] {
  // Parse the CSS content into an AST
  const root = postcss.parse(cssContent);
  const urls: string[] = [];

  // Traverse all @import at-rules
  root.walkAtRules('import', (atRule) => {
    const parsedParams = valueParser(atRule.params);
    const firstNode = parsedParams.nodes[0];

    if (firstNode) {
      if (firstNode.type === 'string') {
        // Case: @import 'url';
        urls.push(firstNode.value);
      } else if (firstNode.type === 'function' && firstNode.value === 'url') {
        // Case: @import url('url');
        const arg = firstNode.nodes[0];
        if (arg && (arg.type === 'string' || arg.type === 'word')) {
          urls.push(arg.value);
        }
      }
    }
  });

  // Traverse all declarations (e.g., background-image, src)
  root.walkDecls((decl) => {
    const parsedValue = valueParser(decl.value);
    parsedValue.walk((node) => {
      if (node.type === 'function' && node.value === 'url') {
        const arg = node.nodes[0];
        if (arg && (arg.type === 'string' || arg.type === 'word')) {
          // Handles both url('path') and url(path)
          urls.push(arg.value);
        }
      }
    });
  });

  return urls;
}
