import type { Task } from "models/task.js";
import { TaskStoreService } from "./taskStoreService.js";
import { PageCrawler } from "../utils/crawlers/pageCrawler.js";

export class PageService {
  private taskStore: TaskStoreService;

  constructor(taskStore: TaskStoreService) {
    this.taskStore = taskStore;
  }

  /**
   * Start downloading a page by URL and return a task for tracking
   * @param url The URL to download
   * @param callbackUrl The URL to call with the result
   * @returns The created task
   */
  async startPageDownload(url: string, callbackUrl: string): Promise<Task> {
    const pageCrawler = new PageCrawler();

    // Create a new task
    const task = this.taskStore.createTask(url, callbackUrl);

    const outputDir = process.env.NODE_ENV === 'production' 
    ? `/temp/crawler-outputs/${task.id}`
    : `./.temp/crawler-outputs/${task.id}`;
    console.log(`Output directory: ${outputDir}`);

    // Update task status to processing
    this.taskStore.updateTask(task.id, { status: 'processing' });

    // Start processing the task in the background
    // We don't await this to return immediately
    pageCrawler.downloadPage(task.url, outputDir)
    .then(() => {
      // Update the task with the result
      this.taskStore.updateTask(task.id, {
        status: 'completed',
      });

      // Send the result to the callback URL
      this.sendCallback(task.id).catch(error => {
        console.error(`Error sending callback for task ${task.id}, URL: ${task.callbackUrl}`);
      });
    })
    .catch(error => {
      console.error(`Error processing task ${task.id}:`, error);

      // Update the task with the error
      this.taskStore.updateTask(task.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      });
    });

    return task;
  }

  /**
   * Send the task result to the callback URL
   * @param task The task with the result to send
   */
  private async sendCallback(taskId: string): Promise<void> {
    // Get the task
    const task = this.taskStore.getTask(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Send the result to the callback URL
    const response = await fetch(task.callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId: task.id,
        status: task.status,
        error: task.error
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send callback for task ${task.id}: ${response.statusText}`);
    }
  }
}