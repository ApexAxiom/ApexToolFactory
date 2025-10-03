# Rollback Guide

1. Revert to the previous stable commit:
   ```sh
   git revert <sha>
   ```
2. Push the revert commit to `main` to trigger App Runner deployment.
3. Monitor App Runner logs and ensure /healthz returns 200.

## Build & Start Configuration

### Current Setup (Working)

The server app (`apps/server`) uses the following configuration:

- **TypeScript Config**: `tsconfig.json` sets `"rootDir": "src"` which strips the `src/` prefix from build output
- **Build Output**: `dist/index.js` (NOT `dist/src/index.js`)
- **Start Command**: `node dist/index.js`
- **App Runner Command**: `pnpm start` (which runs the above)

### Why This Works

With `rootDir: "src"` in `apps/server/tsconfig.json`, TypeScript knows to:
1. Only compile files from the `src/` directory
2. Strip the `src/` prefix when outputting to `dist/`
3. Maintain the internal folder structure (`lib/`, `routes/`, etc.) without the `src/` prefix

This means:
- `src/index.ts` → `dist/index.js` ✅
- `src/lib/http.ts` → `dist/lib/http.js` ✅

### Common Issues & Solutions

#### Issue: Path mismatch with shared packages

If you add a shared package (e.g., `packages/shared`) with TypeScript path aliases like `@rl/shared/*`:

**Problem**: Without `rootDir` set, TypeScript might emit both app and shared files into `dist/`, creating `dist/apps/server/src/index.js` instead of `dist/index.js`.

**Solution**: Keep `rootDir: "src"` in the app's tsconfig.json to ensure clean output structure.

#### Issue: App Runner frozen lockfile failure

**Problem**: `pnpm install --frozen-lockfile` fails if lockfile is out of sync.

**Solution**: Updated `apprunner.yaml` to use `--no-frozen-lockfile` for more flexible dependency installation.

### Verification Steps

Before deploying, verify locally:

```sh
cd /workspace/apps/server
pnpm build              # Should complete without errors
pnpm start             # Should start server on port 8080
curl http://localhost:8080/healthz  # Should return {"status":"ok"}
```
