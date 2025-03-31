import type { Page } from "models/page.js";
import type { Task } from "models/task.js";
import { TaskStoreService } from "./taskStoreService.js";
import { WebCrawlerService } from "./crawler/webCrawlerService.js";

export class PageService {
  private taskStore: TaskStoreService;
  private webCrawler: WebCrawlerService;

  constructor(taskStore: TaskStoreService, webCrawler: WebCrawlerService) {
    this.taskStore = taskStore;
    this.webCrawler = webCrawler;
  }

  /**
   * Start downloading a page by URL and return a task for tracking
   * @param url The URL to download
   * @param callbackUrl The URL to call with the result
   * @returns The created task
   */
  async startPageDownload(url: string, callbackUrl: string): Promise<Task> {
    // Create a new task
    const task = this.taskStore.createTask(url, callbackUrl);

    // Start processing the task in the background
    // We don't await this to return immediately
    this.webCrawler.downloadPage(task.id)
      .then(updatedTask => {
        if (updatedTask) {
          // Send the result to the callback URL
          this.sendCallback(updatedTask).catch(error => {
            console.error(`Error sending callback for task ${task.id}, URL: ${task.callbackUrl}`);
          });
        }
      })
      .catch(error => {
        console.error(`Error processing task ${task.id}:`, error);
      });

    return task;
  }

  /**
   * Send the task result to the callback URL
   * @param task The task with the result to send
   */
  private async sendCallback(task: Task): Promise<void> {
    // Send the result to the callback URL
    const response = await fetch(task.callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId: task.id,
        status: task.status,
        result: task.result,
        error: task.error
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send callback for task ${task.id}: ${response.statusText}`);
    }
  }
}