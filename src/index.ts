import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { getWebsite } from "controllers/websiteController.js";
import { getPage, getTaskStatus } from "controllers/pageController.js";
import { apiKeyAuth } from 'middleware/auth.js'

const app = new Hono();

// Apply API key authentication middleware to all routes
app.use('*', apiKeyAuth)

app.get("/get-website", getWebsite);
app.get("/get-page", getPage);
app.get("/tasks/:taskId", getTaskStatus);

// Basic health check
app.get("/health", (c) => c.json({ status: 'healthy' }, 200));

// Test endpoint to receive callbacks
app.post("/test-callback", async (c) => {
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
