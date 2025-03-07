import path from "path";

// Generate a local path for an asset based on its URL
export function getLocalPath(url: string, outputDir: string): string {
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  const fileName = pathParts.pop() || 'index';
  const dirPath = pathParts.join('/');
  // Save directly in the root of outputDir without "assets" or the hostname
  return path.join(outputDir, dirPath, fileName);
}

// Convert relative URL to absolute URL
export const toAbsoluteUrl = (relativeUrl: string, baseUrl: string): string => {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
};
