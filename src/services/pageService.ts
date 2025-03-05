import { Page } from "@models/page.ts";

export class PageService {
  private pages: Page[] = [
    { id: 1, websiteId: 1, path: "/home", title: "Home Page" },
    { id: 2, websiteId: 1, path: "/about", title: "About Page" },
    { id: 3, websiteId: 2, path: "/index", title: "Index Page" },
  ];

  getPage(id: number): Page | undefined {
    return this.pages.find((p) => p.id === id);
  }
}