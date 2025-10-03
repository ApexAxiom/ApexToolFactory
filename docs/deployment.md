# Deployment Guide

## App Runner Configuration

The application is deployed to AWS App Runner using the configuration in `/apprunner.yaml`.

### Build Process

App Runner executes the following steps:

1. **Pre-build**: Install dependencies
   ```sh
   pnpm install --no-frozen-lockfile
   ```

2. **Build**: Compile TypeScript to JavaScript
   ```sh
   pnpm build
   ```
   
   This runs `pnpm -r build` which builds all workspace packages, including:
   - `apps/server`: Compiles TypeScript from `src/` to `dist/`
   - `apps/web`: Builds the frontend bundle

3. **Start**: Launch the server
   ```sh
   pnpm start
   ```
   
   This runs `pnpm -C apps/server start` which executes `node dist/index.js`

### TypeScript Build Configuration

The server app uses a specific TypeScript configuration to ensure correct build output:

**`apps/server/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"  // ← Critical for correct output structure
  },
  "include": ["src"]
}
```

The `rootDir: "src"` setting ensures:
- TypeScript only compiles files from `src/`
- Output files are placed directly in `dist/` without the `src/` prefix
- `src/index.ts` → `dist/index.js` (NOT `dist/src/index.js`)

### Health Checks

App Runner monitors the application using health check endpoints:

- **Primary**: `GET /healthz` → `{"status":"ok","mode":"demo"}`
- **Detailed**: `GET /api/_health` → Includes provider status

The server must respond with HTTP 200 on port 8080 for App Runner to consider the deployment healthy.

### Common Deployment Issues

#### Issue 1: Path Mismatch

**Symptom**: App crashes with `Error: Cannot find module '.../dist/src/index.js'`

**Cause**: Missing or incorrect `rootDir` in TypeScript config causes output to include `src/` prefix

**Solution**: Ensure `apps/server/tsconfig.json` has `"rootDir": "src"`

#### Issue 2: Lockfile Out of Sync

**Symptom**: `pnpm install --frozen-lockfile` fails with lockfile mismatch

**Cause**: `pnpm-lock.yaml` is out of sync with `package.json`

**Solution**: 
- Locally: Run `pnpm install` to update lockfile, commit changes
- App Runner: Changed to use `--no-frozen-lockfile` for flexibility

#### Issue 3: TypeScript Compilation Errors

**Symptom**: Build fails with type errors

**Cause**: Strict TypeScript settings (`exactOptionalPropertyTypes: true`) require careful handling of optional properties

**Solution**: 
- Don't assign `undefined` to optional properties
- Use conditional assignment or omit the property:
  ```typescript
  const obj: { prop?: string } = { base: "value" };
  if (value !== undefined) obj.prop = value;  // ✅
  // NOT: obj.prop = value;  // ❌ if value might be undefined
  ```

### Local Verification

Before pushing to trigger deployment, verify the build locally:

```sh
# 1. Clean build
cd /workspace
pnpm build

# 2. Verify output structure
ls apps/server/dist/  # Should show index.js, not src/index.js

# 3. Start server
cd apps/server
pnpm start

# 4. Test health endpoints (in another terminal)
curl http://localhost:8080/healthz
curl http://localhost:8080/api/_health

# 5. Run quality checks
pnpm typecheck  # TypeScript type checking
pnpm lint       # ESLint
pnpm test       # Vitest tests
```

### Rollback Procedure

If deployment fails or introduces issues:

1. **Identify stable commit**: Find the last known good deployment SHA
2. **Revert**: `git revert <sha>`
3. **Deploy**: Push to `main` branch to trigger App Runner
4. **Monitor**: Check App Runner logs and health endpoints

See [rollback.md](./rollback.md) for detailed instructions.

### Shared Packages (Future)

If adding shared packages with TypeScript path aliases:

1. **Keep `rootDir: "src"`** in app configs to prevent output structure changes
2. **Build shared packages first** in the App Runner pre-build step
3. **Reference compiled output** from apps, not source files
4. **Consider path mappings** in app tsconfig:
   ```json
   {
     "compilerOptions": {
       "rootDir": "src",
       "paths": {
         "@pkg/shared/*": ["../../packages/shared/dist/*"]
       }
     }
   }
   ```

This prevents TypeScript from emitting shared package files into the app's `dist/` folder.
