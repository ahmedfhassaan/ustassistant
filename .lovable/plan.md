

# Fix Deployment for Cloudflare Pages (Static Site)

## Problem
- `wrangler` is in `dependencies` (not even devDependencies) — bloats production
- `cf:deploy` and `cf:preview` scripts use `wrangler` commands
- `@vitejs/plugin-react-swc` is incorrectly in `dependencies` instead of `devDependencies`
- No code splitting configured despite 800KB bundle warning
- `wrangler.jsonc` still present (unnecessary if deploying via Cloudflare Pages dashboard)

## Changes

### 1. `package.json`
- Remove `wrangler` from dependencies entirely
- Move `@vitejs/plugin-react-swc` from dependencies to devDependencies
- Remove `cf:deploy` and `cf:preview` scripts
- Keep scripts clean: `build`, `dev`, `preview`, `lint`, `test`

### 2. `vite.config.ts`
- Add `build.rollupOptions.output.manualChunks` for code splitting (vendor chunk for react, radix, recharts)
- Remove `readFileSync` for version — use a simpler approach or hardcode
- Keep the static `defineConfig({...})` with literal `plugins: [react()]`

### 3. `wrangler.jsonc`
- Keep it — Cloudflare Pages uses `pages_build_output_dir` from it. It does no harm and helps if deploying via CLI later.

### 4. `public/_redirects`
- Already exists with `/* /index.html 200` — no change needed.

## Cloudflare Pages Dashboard Settings
After these changes, configure in Cloudflare:
- **Build command**: `bun run build`
- **Output directory**: `dist`
- No deploy command needed — Pages handles static hosting automatically.

## Result
- Clean static Vite project, no server/worker dependencies
- Bundle split into smaller chunks
- Ready for Cloudflare Pages with `bun run build` → `dist`

