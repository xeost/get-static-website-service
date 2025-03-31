import type { Context } from "hono";
import { TaskStoreService } from "services/taskStoreService.js";
import { WebCrawlerService } from "services/crawler/webCrawlerService.js";
import { PageService } from "services/pageService.js";

// Create singleton instances of the services
const taskStore = new TaskStoreService();
const webCrawler = new WebCrawlerService(taskStore);
const pageService = new PageService(taskStore, webCrawler);

/**
 * Get a page by URL using the webhook pattern
 * This endpoint accepts a URL and a callback URL, and returns a task ID
 * The HTML content will be sent to the callback URL when ready
 */
export const getPage = async (c: Context) => {
  // Get the URL and callback URL from the request
  const url = c.req.query("url");
  const callbackUrl = c.req.query("callback_url");

  // Validate the URL and callback URL
  if (!url) {
    return c.json({ error: "URL is required" }, 400);
  }

  if (!callbackUrl) {
    return c.json({ error: "Callback URL is required" }, 400);
  }

  try {
    // Use PageService to handle the page download
    const task = await pageService.startPageDownload(url, callbackUrl);

    // Return the task ID and status
    return c.json({
      task_id: task.id,
      status: task.status,
      message: "Task created successfully. Results will be sent to the callback URL when ready."
    }, 202); // 202 Accepted
  } catch (error) {
    console.error("Error creating task:", error);
    return c.json({ 
      error: "Failed to create task",
      message: error instanceof Error ? error.message : String(error)
    }, 500);
  }
};

/**
 * Get the status of a task by ID
 */
export const getTaskStatus = (c: Context) => {
  const taskId = c.req.param("taskId");
  
  if (!taskId) {
    return c.json({ error: "Task ID is required" }, 400);
  }

  const task = taskStore.getTask(taskId);
  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  return c.json({
    task_id: task.id,
    status: task.status,
    url: task.url,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  });
};