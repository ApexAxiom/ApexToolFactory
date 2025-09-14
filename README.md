# Book Lens

Book Lens is a camera-first PWA for exploring places and works of art mentioned in physical books.

## Environment Setup
- Node.js 18+
- pnpm 8+

Install dependencies:
```sh
pnpm install
```

Copy environment examples:
```sh
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.local.example apps/web/.env.local
```

## Scripts
- `pnpm dev` – start web and server concurrently
- `pnpm build` – build all workspaces
- `pnpm lint` – run ESLint
- `pnpm typecheck` – strict TypeScript check
- `pnpm test` – run Vitest

## Privacy Statement
Camera frames never leave the device. Only structured OCR spans and hints are sent to the server.

## Content Security Policy
Lock down to self, allow APIs required for Wikidata, Wikipedia and Google Images. Avoid inline scripts and use nonces.

## Binary Size Gate
No binary files or files over 500 KB should be committed. Large assets must use Git LFS. Tip:
```sh
git config --global core.bigFileThreshold 500k
```
Run `pnpm run size-check` to validate.

## Porting Plan (Web → React Native/Expo)
- Reuse TypeScript types and React components.
- Use `react-native-vision-camera` for camera access.
- Leverage iOS Vision / Android ML Kit for on-device OCR.
- Store Journey items with SQLite (e.g., `expo-sqlite`).

## Rollback
See [docs/rollback.md](docs/rollback.md).
