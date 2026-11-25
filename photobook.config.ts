import type { PhotobookConfig } from "./src/core/types";

const config: PhotobookConfig = {
  site: "https://photobook.alapin.fyi",
  title: "Photobook",
  description: "Photobook to showcase my photography.",
  ogImage: "/og-image.jpg",
  personalSite: { label: "personal site", href: "https://alapin.fyi" },
  credit: { artist: "Ayrton Nardiello", copyright: "© 2026 Ayrton Nardiello" },

  grid: {
    rowHeight: 300,
    showCaptions: false,
  },

  theme: {
    default: "system",
  },

  images: {
    widths: [480, 800, 1200, 1800, 2560, 3840],
    format: "webp",
    quality: 82,
    sizes: "(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 33vw",
  },

  source: { kind: "local" }, // will do this later, basically locally or CDN
};

export default config;
