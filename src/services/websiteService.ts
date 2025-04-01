import { WebsiteCrawler } from "utils/crawlers/websiteCrawler.js";
import type { TaskStoreService } from "./taskStoreService.js";
import type { Task } from "models/task.js";

export class WebsiteService {
  private taskStore: TaskStoreService;

  constructor(taskStore: TaskStoreService) {
    this.taskStore = taskStore;
  }

  getWebsite(id: number): undefined {
    // return this.websites.find((w) => w.id === id);
  }

  async getInternalUrls(url: string, callbackUrl: string): Promise<Task> {
    const websiteCrawler = new WebsiteCrawler();
 
    // Create a new task
    const task = this.taskStore.createTask(url, callbackUrl);

    // Update task status to processing
    this.taskStore.updateTask(task.id, { status: 'processing' });

    // Start processing the task in the background
    // We don't await this to return immediately
    websiteCrawler.getInternalUrls(url)
    .then((urls) => {
      // Update the task with the result
      this.taskStore.updateTask(task.id, {
        status: 'completed',
        result: urls,
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
        result: task.result,
        error: task.error
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send callback for task ${task.id}: ${response.statusText}`);
    }
  }
}