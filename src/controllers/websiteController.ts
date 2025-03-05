import { Context } from "hono"; // Hono import
import { WebsiteService } from "@services/websiteService.ts";

const websiteService = new WebsiteService();

export const getWebsite = (c: Context) => {
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