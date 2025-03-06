import type { Context } from "hono";
import { PageService } from "services/pageService.js";

const pageService = new PageService();

export const getPage = (c: Context) => {
  const id = Number(c.req.query("id")); // Query param for simplicity
  if (isNaN(id)) {
    return c.json({ error: "Invalid ID" }, 400);
  }

  const page = pageService.getPage(id);
  if (page) {
    return c.json(page);
  }
  return c.json({ error: "Page not found" }, 404);
};