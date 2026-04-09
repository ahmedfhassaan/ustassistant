# Cloudflare Pages Static Deployment — Complete

## Setup
- Pure static Vite + React project
- `wrangler.jsonc` deleted (was causing Cloudflare to run `wrangler deploy` instead of static hosting)
- No Wrangler dependency, no deploy scripts
- `public/_redirects` handles SPA routing

## Cloudflare Pages Dashboard Settings
- **Build command**: `bun run build`
- **Output directory**: `dist`
- **Deploy command**: (empty)
