import { chromium, type Browser, type Page } from "playwright";

export class WebsiteCrawler {
  /**
   * Gets all internal URLs from a website
   * @param url The base URL of the website to crawl
   * @param browser An optional Playwright browser instance (will create one if not provided)
   * @returns An array of internal URLs found on the website
   */
  async getInternalUrls(url: string, browser?: Browser): Promise<string[]> {
    const shouldCloseBrowser = !browser;
    if (!browser) {
      browser = await chromium.launch();
    }

    const page = await browser.newPage();
    const internalUrls = new Set<string>();
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    const visitedUrls = new Set<string>();

    try {
      await this.crawlPage(page, url, baseUrl, internalUrls, visitedUrls);
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    } finally {
      await page.close();
      if (shouldCloseBrowser) {
        await browser.close();
      }
    }

    return Array.from(internalUrls);
  }

  /**
   * Helper method to recursively crawl pages and collect internal URLs
   */
  private async crawlPage(
    page: Page,
    url: string,
    baseUrl: string,
    internalUrls: Set<string>,
    visitedUrls: Set<string>
  ): Promise<void> {
    if (visitedUrls.has(url)) {
      return;
    }
    
    visitedUrls.add(url);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Extract all links from the page
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href'))
          .filter(href => href !== null && href !== '') as string[];
      });
      
      // Process each link
      for (const link of links) {
        let fullUrl: string;
        
        // Handle relative URLs
        if (link.startsWith('/')) {
          fullUrl = `${baseUrl}${link}`;
        } else if (!link.startsWith('http')) {
          // Skip anchors, javascript:, mailto:, etc.
          continue;
        } else {
          fullUrl = link;
        }
        
        // Check if the URL belongs to the same domain
        if (fullUrl.startsWith(baseUrl)) {
          // Remove hash and query parameters for deduplication
          const cleanUrl = fullUrl.split('#')[0].split('?')[0];
          internalUrls.add(cleanUrl);
          
          // Recursively crawl this URL if we haven't visited it yet
          if (!visitedUrls.has(cleanUrl)) {
            await this.crawlPage(page, cleanUrl, baseUrl, internalUrls, visitedUrls);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
    }
  }


}