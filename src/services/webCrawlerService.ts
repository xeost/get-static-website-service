import { PlaywrightCrawler } from 'crawlee';
import * as cheerio from 'cheerio';
import path from 'path';
import { type Response } from 'playwright-core';
import type { Task } from './taskStoreService.js';
import { TaskStoreService } from './taskStoreService.js';
import { createDirectory, deleteDirectory, downloadAssets, saveAsset } from './crawler-utils/fs.js';
import { getLocalPath } from './crawler-utils/shared.js';
import { getAllAssetsPathsFromHtml, modifyHtml, removeAnalyticsFromHtml } from './crawler-utils/html.js';

export class WebCrawlerService {
  private taskStore: TaskStoreService;

  constructor(taskStore: TaskStoreService) {
    this.taskStore = taskStore;
  }

  /**
   * Download HTML content from a URL using crawlee with playwright
   * @returns The updated task after processing
   */
  async downloadPage(taskId: string): Promise<Task | undefined> {
    const outputDir = `./output/${taskId}`;
    
    // Map to store original URLs and their local paths
    const assetMap = new Map<string, string>();

    const task = this.taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Update task status to processing
    this.taskStore.updateTask(taskId, { status: 'processing' });

    try {
      // Store reference to this for use in the crawler
      const self = this;
      
      // Create a new PlaywrightCrawler
      const crawler = new PlaywrightCrawler({
        // Use headless browser
        headless: true,
        // Only process the initial URL
        maxRequestsPerCrawl: 1,

        // Add maxRequestRetries and timeout settings
        maxRequestRetries: 3,
        navigationTimeoutSecs: 30,
        requestHandlerTimeoutSecs: 60,      

        preNavigationHooks: [
          async ({ page }) => {
            // Listen to all page requests
            page.on('request', async (request) => {
              if (request.url().startsWith(task.url)) {
                console.log(`Request made: ${request.url()}`);
              }
      
              await page.waitForTimeout(500); // Wait a little for new requests
            });
      
            page.on('response', async (response: Response) => {
              const url = response.url();
              const contentType = response.headers()['content-type'] || '';
      
              // Enhanced favicon detection
              const isFavicon =
                url.includes('favicon') ||
                url.endsWith('.ico') ||
                url.includes('icon') && (
                  contentType.includes('image/') ||
                  contentType.includes('icon') ||
                  contentType === ''  // Some servers don't set content-type for favicons
                );
      
              // Capture images, CSS, JavaScript files, and favicons
              if (
                contentType.startsWith('image/') ||
                contentType.startsWith('text/css') ||
                contentType.startsWith('application/javascript') ||
                isFavicon
              ) {
                //console.log(`Asset path: ${url}`);
                try {
                  const buffer = await response.body();
                  const localPath = getLocalPath(url, outputDir);
                  // Only save assets from the same domain
                  const assetUrl = new URL(url);
                  const pageUrl = new URL(page.url());
                  if (assetUrl.hostname === pageUrl.hostname) {
                    await saveAsset(buffer, localPath);
                    assetMap.set(url, localPath);
                    //console.log(`Successfully saved asset: ${url}`);
                  }
                } catch (error) {
                  console.error(`Failed to save asset ${url}:`, error);
                }
              }
            });
          },
        ],

        // Handle the page data
        async requestHandler({ page, request }) {
          // Wait for the page to load completely
          await page.waitForLoadState('networkidle');
          
          // Get the HTML content
          let htmlContent = await page.content();

          // Remove analytics and tracking scripts from the HTML content
          htmlContent = removeAnalyticsFromHtml(htmlContent);

          // Load all assets referenced in HTML into assetMap
          for (const [key, value] of (await getAllAssetsPathsFromHtml(htmlContent, task.url, outputDir)).entries()) {
            assetMap.set(key, value);
          }

          // Download all assets (images, CSS, JS, favicons)
          await downloadAssets(assetMap);

          // Update HTML to use local paths for downloaded assets
          const modifiedHtml = modifyHtml(htmlContent, assetMap, page.url(), outputDir);

          // Create a local path for the HTML file based on the URL path
          const pageUrl = new URL(page.url());
          const pathParts = pageUrl.pathname.split('/').filter(Boolean);
          const fileName = 'index.html';
          const dirPath = path.join(outputDir, ...pathParts);

          // Create directory and save HTML file
          await createDirectory(dirPath);
          await saveAsset(Buffer.from(modifiedHtml), path.join(dirPath, fileName));

          // Hover over all hoverable elements on the page
          const hoverableElements = await page.$$('button, a, [role="button"], [role="link"], input, select, img, video, audio, svg');
          for (const element of hoverableElements) {
            await element.hover({ timeout: 1000 }).catch(() => {
              // Ignore hover errors
            });
            await page.waitForTimeout(500); // Wait between hovers
          }

          //console.log(`Page processing completed: ${page.url()}`);


          //console.log('------- POST PAGE PROSESSING STARTED -------');

          // assetMap.clear();

          // const allFiles = await fs.readdir(outputDir, { recursive: true });
          // for (const file of allFiles) {
          //   if (file.endsWith('.js')) {
          //     const fileContent = await fs.readFile(path.join(outputDir, file), 'utf-8');
          //     // Load all assets referenced in JS file into assetMap
          //     (await getAllAssetsPathsFromJs(fileContent, targetUrl, outputDir)).entries().forEach(([key, value]) => {
          //       assetMap.set(key, value);
          //     });
          //   } else if (file.endsWith('.css')) {
          //     const fileContent = await fs.readFile(path.join(outputDir, file), 'utf-8');
          //     // Load all assets referenced in CSS file into assetMap
          //     (await getAllAssetsPathsFromCss(fileContent, targetUrl, outputDir)).entries().forEach(([key, value]) => {
          //       assetMap.set(key, value);
          //     });
          //   }
          // }

          //console.log('Asset map:', assetMap);

          // Download all assets (images, CSS, JS, favicons)
          // await downloadAssets(assetMap);

          // Extract links from the current page
          // and add them to the crawling queue.
          // await enqueueLinks();
          
          // Update the task with the result
          self.taskStore.updateTask(taskId, {
            status: 'completed',
            result: {
              url: request.url,
              html: htmlContent
            }
          });
        }
      });

      // Delete the output directory if it exists
      await deleteDirectory(outputDir);

      // Start the crawler with the task URL
      await crawler.run([task.url]);
      
      // Return the updated task
      return this.taskStore.getTask(taskId);
    } catch (error) {
      console.error(`Error processing task ${taskId}:`, error);
      
      // Update the task with the error
      this.taskStore.updateTask(taskId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      });

      // Return the updated task with error
      return this.taskStore.getTask(taskId);
    }
  }
}
