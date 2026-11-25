// @ts-check
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import { defineConfig, envField } from "astro/config";
import config from "./photobook.config";
import photos from "./src/integrations/photos.ts";

export default defineConfig({
  site: config.site,
  integrations: [photos(config), preact(), sitemap()],

  env: {
    schema: {
      PHOTO_CDN_BASE: envField.string({ context: "server", access: "public", optional: true }),
    },
  },
});
