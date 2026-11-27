# Deploying

`pnpm build` outputs plain static files to `dist/`. All configuration (`site`, `base`, and `PHOTO_CDN_BASE`) is read at build time and baked into the HTML.

## Before your first deploy

| Setting | Location | Notes |
| :-- | :-- | :-- |
| `site` | `photobook.config.ts` | Canonical URLs, `robots.txt`, and `sitemap-index.xml`. Replace `https://example.com`. |
| `public/og-image.jpg` | Replace file | Default 1200×630 JPEG or PNG preview card (avoid AVIF/WebP for social crawlers). |
| `base` | `astro.config.mjs` | Only for subpath deploys such as `user.github.io/<repo>` (`base: "/<repo>"`). Omit for root/custom domains. |

## Cloudflare Workers (static assets)

Recommended for photo-heavy static sites (free, unlimited static-asset requests and seamless R2 pairing). This is the default when you connect a repo under **Workers & Pages → Create** in the Cloudflare dashboard.

`wrangler.jsonc` at the repo root makes `wrangler deploy` upload `dist/` as a static-only Worker. Keep it: without a config file, wrangler tries to auto-configure the project (runs `astro add cloudflare` and adds wrangler as a dependency), which fails under pnpm with `ERR_PNPM_IGNORED_BUILDS` and would add an SSR adapter this site doesn't need. The `name` field must match the Worker name in the dashboard.

| Setting | Value |
| :-- | :-- |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |
| Node version | `22.23.4` or newer (`NODE_VERSION`) |
| `PHOTO_CDN_BASE` | Set as a build variable only if `source.kind` is `"remote"` |

Pushes to `main` deploy to production; other branches get preview URLs. Attach a domain under the Worker's **Settings → Domains & Routes → Add → Custom domain**. If the zone is on Cloudflare, the DNS record and certificate are created automatically, so don't add the record by hand first.

`public/_headers` sets one-year immutable caching for `/_astro/*` and `/img/*` (both have content-hashed filenames). It applies on both Workers and Pages.

## Cloudflare Pages

| Setting | Value |
| :-- | :-- |
| Build command | `pnpm build` |
| Output directory | `dist` |
| Node version | `22.23.4` or newer (`NODE_VERSION`) |
| `PHOTO_CDN_BASE` | Set for Production and Preview only if `source.kind` is `"remote"` |

## GitHub Pages

For project repositories (`user.github.io/<repo>`), set `base: "/<repo>"` in `astro.config.mjs`. For custom domains, omit `base` and add `public/CNAME` containing your domain.

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v6.1.1
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # Local source only — remove when using a remote CDN.
      - uses: actions/cache@v4
        with:
          path: dist-photos
          key: photos-${{ hashFiles('src/photos/**', 'photobook.config.ts') }}
          restore-keys: photos-
      - run: pnpm build
        env:
          PHOTO_CDN_BASE: ${{ vars.PHOTO_CDN_BASE }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

If your custom domain uses Cloudflare DNS, set the record to **DNS only** until GitHub issues the HTTPS certificate.

## VPS / Static server

Build locally and sync `dist/` to the server:

```sh
pnpm build
rsync -av --delete dist/ user@host:/var/www/photobook/
```

```nginx
server {
    root /var/www/photobook;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ ^/(_astro|img)/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Serving photos from a CDN

Default `local` mode serves variants from `dist/img/`. Switch to `remote` mode (for example with [Cloudflare R2](https://developers.cloudflare.com/r2/), Backblaze B2 + CDN, Bunny CDN, or S3 + CloudFront) once the library outgrows the repository.

Set `source` in `photobook.config.ts`:

```ts
source: {
  kind: "remote",
  base: import.meta.env?.PHOTO_CDN_BASE ?? process.env.PHOTO_CDN_BASE ?? "",
}
```

Set `PHOTO_CDN_BASE` at build time to your public bucket origin without a trailing slash (for example `https://photos.example.com`).

### Upload order

Upload new variants before deploying so the live site never points at missing URLs:

```sh
node scripts/build-manifest.mjs                        # generate dist-photos/ + photos.manifest.json
rclone copy dist-photos/ r2:my-bucket/                 # upload without deleting old variants
git add photos.manifest.json && git commit && git push # deploy updated manifest
rclone sync dist-photos/ r2:my-bucket/                 # remove stale variants once live
```

Commit `photos.manifest.json` — the build reads image dimensions and hashes from it without opening source files.

### Bucket layout

Variants follow the convention in `widthKey()` and `socialKey()` (`src/core/images.ts`):

```text
<base>/blue-hour-87f4b685-1200w.webp
<base>/iceland/01-morning-5dcd7d25-1200w.webp
<base>/iceland/01-morning-5dcd7d25-og.jpg
```

Each entry in `photos.manifest.json` records `{ collection, file, width, height, hash }`, where `collection` is `""` for loose photos.

## Troubleshooting

| Symptom | Cause / Fix |
| :-- | :-- |
| Build fails: `source.base is empty` | Set `PHOTO_CDN_BASE` in the build environment |
| Build fails: `photos.manifest.json not found` | Generate and commit `photos.manifest.json` |
| Images 404 on remote source | Verify public bucket access, `PHOTO_CDN_BASE`, and `images.widths` sync |
| Photo URLs 404 on subpath deploy | Set `base` in `astro.config.mjs` |
| Frosted glass missing in production build | Do not hand-write `-webkit-` prefixes next to standard CSS properties; Lightning CSS merges them down to the prefixed property only |
| Links point to `example.com` | Replace `site` in `photobook.config.ts` |
