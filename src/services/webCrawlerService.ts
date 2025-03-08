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
    const outputDir = process.env.NODE_ENV === 'production' 
      ? `/temp/crawler-outputs/${taskId}`
      : `./.temp/crawler-outputs/${taskId}`;
    
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
            // Listen to all page responses
            page.on('response', async (response: Response) => {
              const url = response.url();
              const contentType = response.headers()['content-type'] || '';
    
              // if (url.startsWith(task.url)) {
              //   console.log(`Response made: ${url}`);
              // }

              // Capture images, CSS and JavaScript files
              if (
                contentType.startsWith('image/') ||
                contentType.startsWith('text/css') ||
                contentType.startsWith('application/javascript')
              ) {
                try {
                  const buffer = await response.body();
                  const localPath = getLocalPath(url, outputDir);
                  // Only save assets from the same domain
                  const assetUrl = new URL(url);
                  const pageUrl = new URL(page.url());
                  if (assetUrl.hostname === pageUrl.hostname) {
                    await saveAsset(buffer, localPath);
                    assetMap.set(url, localPath);
                  }
                } catch (error) {
                  console.error(`Failed to save asset ${url}:`, error);
                }
              }

              // Wait a little for new requests
              // This is necessary to give other requests/responses time to happen,
              // otherwise the browser will close and the whole process will end
              await page.waitForTimeout(500);
            });
          },
        ],

        // Handle the page data
        async requestHandler({ page, request }) {
          // Wait for the page to load completely
          await page.waitForLoadState('networkidle');

          //
          // --- STEP ---
          // Process the HTML content.


          // Get the HTML content
          let htmlContent = await page.content();

          // Remove analytics and tracking scripts from the HTML content
          htmlContent = removeAnalyticsFromHtml(htmlContent);

          // Load all assets referenced in HTML into assetMap
          for (const [key, value] of (await getAllAssetsPathsFromHtml(htmlContent, task.url, outputDir)).entries()) {
            assetMap.set(key, value);
          }

          // Download all assets referenced in HTML (images, CSS, JS, favicons)
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


          //
          // --- STEP ---
          // Simulate user interaction to throw requests that will be intercepted by the crawler.
          //

          // Simulate hover events over all hoverable elements on the page
          const hoverableElements = await page.$$('button, a, [role="button"], [role="link"], input, select, img, video, audio, svg');
          for (const element of hoverableElements) {
            await element.hover({ timeout: 1000 }).catch(() => {
              // Ignore hover errors
            });
            await page.waitForTimeout(500); // Wait between hovers
          }

          //
          // --- STEP ---
          // Iterate over all the downloaded assets and check if there are any links to other assets.
          //
          // Note: Disabled for now.
          //

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

          // Download all assets (images, CSS, JS, favicons)
          // await downloadAssets(assetMap);

          //
          // --- STEP ---
          // Finishing up.
          //

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
