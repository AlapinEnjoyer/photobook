import { createReadStream } from "node:fs";
import { access, cp, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { MANIFEST, OUT_DIR, runPipeline, SRC_DIR } from "../../pipeline/photos.ts";
import { IMAGE_ROUTE } from "../core/images.ts";
import type { PhotobookConfig } from "../core/types";

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
};

export default function photos(book: PhotobookConfig): AstroIntegration {
  const local = book.source.kind === "local";
  let root = process.cwd();
  let base = "/";

  const run = (log: (message: string) => void) =>
    runPipeline({ root, images: book.images, credit: book.credit, log });

  return {
    name: "photobook:photos",
    hooks: {
      "astro:config:setup": async ({ command, config, logger }) => {
        root = fileURLToPath(config.root);
        base = config.base.endsWith("/") ? config.base : `${config.base}/`;
        if (command !== "dev" && command !== "build") return;

        if (local) {
          await run((message) => logger.info(message));
          return;
        }
        await access(join(root, MANIFEST)).catch(() => {
          throw new Error(`${MANIFEST} not found — generate it with \`node scripts/build-manifest.mjs\`.`);
        });
      },

      "astro:server:setup": ({ server, logger }) => {
        if (!local) return;
        const outDir = join(root, OUT_DIR);
        const prefix = `${base}${IMAGE_ROUTE}/`;

        server.middlewares.use(async (req, res, next) => {
          let pathname: string;
          try {
            pathname = decodeURIComponent((req.url ?? "").split("?")[0] ?? "");
          } catch {
            return next();
          }
          if (!pathname.startsWith(prefix)) return next();

          const path = resolve(outDir, pathname.slice(prefix.length));
          const inside = path.startsWith(outDir + sep);
          const found = inside && (await stat(path).catch(() => null))?.isFile();
          if (!found) return next();

          res.setHeader("Content-Type", MIME[extname(path)] ?? "application/octet-stream");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          createReadStream(path).pipe(res);
        });

        const srcDir = join(root, SRC_DIR);
        let timer: ReturnType<typeof setTimeout> | undefined;
        let queue = Promise.resolve();
        const onChange = (path: string) => {
          if (!path.startsWith(srcDir + sep)) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            queue = queue
              .then(async () => {
                await run((message) => logger.info(message));
              })
              .catch((err: unknown) => logger.error(String(err)));
          }, 200);
        };
        server.watcher.add(srcDir);
        for (const event of ["add", "change", "unlink"]) server.watcher.on(event, onChange);
      },

      "astro:build:done": async ({ dir, logger }) => {
        if (!local) return;
        const outDir = join(root, OUT_DIR);
        const present = await stat(outDir).then(
          (s) => s.isDirectory(),
          () => false,
        );
        if (!present) return;
        await cp(outDir, join(fileURLToPath(dir), IMAGE_ROUTE), { recursive: true });
        logger.info(`variants copied to ${IMAGE_ROUTE}/`);
      },
    },
  };
}
