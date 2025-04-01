import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { startWebsiteDownload, getAllWebsiteUrls } from "controllers/websiteController.js";
import { startPageDownload, getTask } from "controllers/pageController.js";
import { apiKeyAuth } from 'middleware/auth.js'

const app = new Hono();

// Apply API key authentication middleware to all routes
app.use('*', apiKeyAuth)

app.get("/websites/start-download", startWebsiteDownload);
app.get("/websites/get-all-urls", getAllWebsiteUrls);
app.get("/pages/start-download", startPageDownload);
app.get("/tasks/:taskId", getTask);

// Basic health check
app.get("/health", (c) => c.json({ status: 'healthy' }, 200));

// Test endpoint to receive callbacks
app.post("/test-pages-start-download-callback", async (c) => {
  const body = await c.req.json();
  console.log('Received callback:', {
    taskId: body.taskId,
    status: body.status,
    resultLength: body.result ? body.result.length : 0,
    error: body.error
  });
  return c.json({ received: true }, 200);
});

// Test endpoint to receive callbacks
app.post("/test-websites-get-all-urls-callback", async (c) => {
  const body = await c.req.json();
  console.log('Received callback:', {
    taskId: body.taskId,
    status: body.status,
    resultLength: body.result ? body.result.length : 0,
    error: body.error
  });
  return c.json({ received: true }, 200);
});

app.get("/", (c) => c.json({ status: 'Welcome to the API' }, 200));

serve({
    fetch: app.fetch,
    port: 8000
  }, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`)
  })
