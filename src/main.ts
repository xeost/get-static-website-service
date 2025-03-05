import { Hono } from "hono";
import { getWebsite } from "@controllers/websiteController.ts";
import { getPage } from "@controllers/pageController.ts";
import { apiKeyAuth } from '@middleware/auth.ts'

const app = new Hono();

// Apply API key authentication middleware to all routes
app.use('*', apiKeyAuth)

app.get("/get-website", getWebsite);
app.get("/get-page", getPage);

// Basic health check
app.get("/", (c) => c.json({ status: 'healthy' }, 200));

Deno.serve({ port: 8000 }, app.fetch); // Deno's built-in server