import type { Context } from "hono"; // Hono import
import { TaskStoreService } from "services/taskStoreService.js";
import { WebsiteService } from "services/websiteService.js";

// Create singleton instances of the services
const taskStore = new TaskStoreService();
const websiteService = new WebsiteService(taskStore);

export const getAllWebsiteUrls = async (c: Context) => {
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
    const task = await websiteService.getInternalUrls(url, callbackUrl);

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

export const startWebsiteDownload = (c: Context) => {
  const id = Number(c.req.query("id")); // Query param for simplicity
  if (isNaN(id)) {
    return c.json({ error: "Invalid ID" }, 400);
  }

  const website = websiteService.getWebsite(id);
  if (website) {
    return c.json(website);
  }
  return c.json({ error: "Website not found" }, 404);
};