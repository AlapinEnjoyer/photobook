import type { APIRoute } from "astro";
import config from "../../photobook.config";
import { publicPath } from "../core/routes";

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL(config.site);
  const sitemap = new URL(publicPath("sitemap-index.xml"), origin);
  return new Response(`User-agent: *\nAllow: ${publicPath("/")}\nSitemap: ${sitemap.href}\n`);
};
