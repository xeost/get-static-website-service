import { Website } from "@models/website.ts";

export class WebsiteService {
  private websites: Website[] = [
    { id: 1, name: "Example", url: "https://example.com" },
    { id: 2, name: "Test", url: "https://test.com" },
  ];

  getWebsite(id: number): Website | undefined {
    return this.websites.find((w) => w.id === id);
  }
}