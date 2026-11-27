#!/usr/bin/env node
// Generate dist-photos/ variants and photos.manifest.json for remote CDN deploys.
import { runPipeline } from "../pipeline/photos.ts";

const { default: config } = await import("../photobook.config.ts");

await runPipeline({
  root: process.cwd(),
  images: config.images,
  credit: config.credit,
  log: console.log,
});

console.log("Upload dist-photos/ to your bucket, then set source.kind to 'remote'.");
