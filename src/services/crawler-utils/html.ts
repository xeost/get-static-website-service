import * as cheerio from 'cheerio';
import path from 'path';
import { getLocalPath, toAbsoluteUrl } from './shared.js';

export async function getAllAssetsPathsFromHtml(html: string, baseUrl: string, outputDir: string): Promise<Map<string, string>> {
  const $ = cheerio.load(html);
  const assetMap = new Map<string, string>();

  const getAttrUrls = (selector: string, attr: string): string[] =>
    $(selector).map((_, el) => $(el).attr(attr)).get().filter(Boolean);

  const urls = [
    ...getAttrUrls('img', 'src'),
    ...getAttrUrls('img', 'srcset').flatMap(srcset =>
      srcset.split(',').map(src => src.trim().split(' ')[0])),
    ...getAttrUrls('link[rel="stylesheet"]', 'href'),
    ...getAttrUrls('link[rel="preload"]', 'href'),
    ...getAttrUrls('link[rel="manifest"]', 'href'),
    ...getAttrUrls('link[rel="alternate"][type="application/rss+xml"]', 'href'),
    ...getAttrUrls('link[rel*="icon"]', 'href'),
    ...getAttrUrls('script', 'src'),
    ...getAttrUrls('source', 'src'),
    ...getAttrUrls('source', 'srcset').flatMap(srcset =>
      srcset.split(',').map(src => src.trim().split(' ')[0])),
    ...getAttrUrls('video', 'src'),
    ...getAttrUrls('audio', 'src'),
    ...getAttrUrls('embed', 'src'),
    ...getAttrUrls('track', 'src'),
    ...getAttrUrls('object', 'data')
  ].filter(Boolean);

  // Convert all URLs to absolute and map them to local paths
  urls.forEach(url => {
    const absoluteUrl = toAbsoluteUrl(url, baseUrl);
    const localPath = getLocalPath(absoluteUrl, outputDir);
    assetMap.set(absoluteUrl, localPath);
  });

  return assetMap;
}

// Remove analytics and tracking scripts from HTML
export function removeAnalyticsFromHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove Google Analytics scripts
  $('script[src*="google-analytics.com"]').remove();
  $('script[src*="googletagmanager.com"]').remove();
  $('script:contains("ga\\(")')?.remove();
  $('script:contains("gtag")')?.remove();

  // Remove other common analytics
  $('script[src*="analytics"]').remove();
  $('script[src*="hotjar"]').remove();
  $('script[src*="segment"]').remove();
  $('script[src*="mixpanel"]').remove();
  $('script[src*="clarity"]').remove();

  // Remove tracking pixels
  $('img[src*="facebook.com"]').remove();
  $('img[src*="linkedin.com"]').remove();
  $('img[src*="doubleclick.net"]').remove();

  return $.html();
}

// Modify HTML to point to local assets
export function modifyHtml(html: string, assetMap: Map<string, string>, pageUrl: string, outputDir: string): string {
  if (!html) {
    console.error('No HTML content provided');
    return '';
  }

  try {
    const $ = cheerio.load(html);
    if (!$) {
      throw new Error('Failed to initialize cheerio');
    }

    // Helper function to convert relative to absolute URLs
    const toAbsoluteUrl = (relativeUrl: string, baseUrl: string): string => {
      try {
        return new URL(relativeUrl, baseUrl).href;
      } catch {
        return relativeUrl;
      }
    };

    const baseUrl = $('base').attr('href') || pageUrl; // You'll need to pass page URL as parameter

    // Update <img> src attributes
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        const absoluteSrc = toAbsoluteUrl(src, baseUrl);
        if (assetMap.has(absoluteSrc)) {
          $(el).attr('src', '/' + path.relative(outputDir, assetMap.get(absoluteSrc)!));
          //console.log(`Modified image src: ${src} -> ${absoluteSrc}`);
        }
      }
    });

    // Update <link rel="stylesheet"> href attributes
    $('link[rel="stylesheet"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        const absoluteHref = toAbsoluteUrl(href, baseUrl);
        if (assetMap.has(absoluteHref)) {
          $(el).attr('href', '/' + path.relative(outputDir, assetMap.get(absoluteHref)!));
          //console.log(`Modified stylesheet href: ${href} -> ${absoluteHref}`);
        }
      }
    });

    // Update favicon links
    $('link[rel*="icon"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        const absoluteHref = toAbsoluteUrl(href, baseUrl);
        if (assetMap.has(absoluteHref)) {
          $(el).attr('href', '/' + path.relative(outputDir, assetMap.get(absoluteHref)!));
          //console.log(`Modified favicon href: ${href} -> ${absoluteHref}`);
        }
      }
    });

    // Update <script> src attributes
    $('script[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        const absoluteSrc = toAbsoluteUrl(src, baseUrl);
        if (assetMap.has(absoluteSrc)) {
          $(el).attr('src', '/' + path.relative(outputDir, assetMap.get(absoluteSrc)!));
          //console.log(`Modified script src: ${src} -> ${absoluteSrc}`);
        }
      }
    });

    return $.html();
  } catch (error) {
    console.error('Error in modifyHtml:', error);
    return html; // Return original HTML if processing fails
  }
}
