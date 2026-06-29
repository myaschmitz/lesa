# AGENTS.md

Guidance for AI agents (and humans) working in this repository.

## What this project is
**Lesa** is an offline-first iOS e-reader built with Expo / React Native. It
reads **EPUB** and **PDF** files stored locally on the device. The defining
goal: imported books are **never offloaded** — unlike Apple Books, which purges
downloads under iCloud storage pressure. The reading experience must be smooth
(scrolling-first, paging optional), intuitive, and themable.

Scope right now: **offline only**. But every decision should leave the door open
for an optional cloud-sync layer later — never bake assumptions that block it.

## Golden rules
1. **Books live in `Paths.document/books/`.** Copy imported files into the app's
   Documents directory. Never rely on the picker's original file URI — it is a
   temporary, sandboxed grant that does not survive.
2. **Store RELATIVE paths in the database**, e.g. `books/mybook.epub` — never the
   absolute `file:///var/mobile/.../books/...`. The iOS container UUID changes on
   every reinstall, so absolute paths break. Reconstruct the absolute URI at
   runtime from `Paths.document` + the stored relative path.
3. **Never put book content in the database.** DB holds metadata + relative paths
   only. Bytes stay on the filesystem.
4. **The two rendering engines must stay isolated** behind the `ReaderView`
   abstraction (see `docs/ARCHITECTURE.md`). App screens talk to the interface,
   never to epub.js / Readium / pdf libraries directly. Swapping an engine must
   be a one-file change.
5. **Reading position is an opaque, per-format token.** EPUB uses a locator/CFI;
   PDF uses page + offset. Do NOT try to unify them into one shared shape.
6. **New Architecture stays ON.** It is the RN default and retrofitting later is
   painful.

## Tech stack (intended)
- **Runtime:** Expo (dev client + EAS preview builds). NOT Expo Go — native
  modules are required.
- **Language:** TypeScript, `strict` mode.
- **Navigation:** Expo Router.
- **State:** Zustand (light global store).
- **Catalog & positions:** `expo-sqlite`.
- **Settings (key/value):** `react-native-mmkv` (or AsyncStorage).
- **Files:** new `expo-file-system` `File` / `Directory` / `Paths` API.
- **PDF:** `@kishannareshpal/expo-pdf` (New-Arch friendly). Fallback: wonday
  `react-native-pdf`.
- **EPUB:** start with `@epubjs-react-native/core` (WebView, easy theming);
  upgrade to `react-native-readium` (native) if scroll feel is not good enough.

> Library names/APIs move fast. **Verify the current API and version before
> using one** rather than trusting these names blindly.

## Project conventions
- Folder layout (target):
  ```
  app/            Expo Router screens (Library, Reader, Settings)
  src/
    reader/       ReaderView interface + EpubReader, PdfReader impls
    library/      import, file copy, catalog logic
    db/           expo-sqlite schema + queries
    store/        Zustand stores
    theme/        design tokens (themes shared by chrome + readers)
    types/        shared types
  docs/           PLAN.md, ARCHITECTURE.md
  ```
- Keep components presentational; put logic in hooks/modules under `src/`.
- Design themes as **tokens in one place** (`src/theme/`) so app chrome and both
  reader engines stay visually consistent.
- Comment only where intent is non-obvious. Prefer clear names over comments.

## Workflow
- **One branch per phase**, descriptive kebab-case names tied to the work
  (e.g. `import-and-persistence`, `pdf-reader`). No nonsense names.
- Open a PR per phase; keep commits focused. Don't land multiple phases at once.
- Run lint + typecheck before opening a PR (once tooling exists).
- Update `docs/PLAN.md` checkboxes as phases complete.

### Dependencies & the lockfile (READ before touching package.json)
The project pins **Node 22 / npm 10** (see `.nvmrc` + `engines`), and that is
what **EAS uses** — its "Install dependencies" phase runs `npm ci`. The pain we
hit repeatedly: **npm 11+ rewrites `package-lock.json` differently than npm 10**
— it prunes some platform-optional transitive deps (the `@emnapi/*` WASM-fallback
packages pulled in by the ESLint resolver `unrs-resolver`). The result installs
fine locally but makes EAS's `npm ci` fail with `Missing: @emnapi/core ... from
lock file`. Worse, `eas build` can upload your *uncommitted* working-dir lockfile,
so a single local `npm install` with npm 11 silently re-breaks the build.

What protects us now (don't undo these):
- **`@emnapi/core` and `@emnapi/runtime` are declared as direct `devDependencies`**
  even though nothing in our code imports them. They are only there so that *no*
  npm version can prune them from the lockfile — this makes the lock immune to the
  npm 10 vs 11 churn above. Verified: after `npm install` with npm 11 the lock
  still passes `npm ci` under Node 22 / npm 10. **Do not remove them.**
- **`.github/workflows/ci.yml`** runs the exact EAS install (`npm ci` on the
  `.nvmrc` Node) plus typecheck/lint on every push/PR, so a desynced lock is
  caught in ~1 min instead of a 15-min EAS build.

Rules:
- To install after pulling, prefer **`npm ci`** — it installs the committed lock
  exactly (and runs the `patch-package` postinstall) **without rewriting the lock**.
- Only change the lock deliberately, with npm 10: `npm run lock:fix` (or
  `npx npm@10.9.4 install <pkg>`). Then run **`npm run lock:check`** before the PR.
- If your local lock got churned by npm 11, just `git checkout package-lock.json`.

## Definition of done for a feature
- Type-checks and lints clean.
- Reading position persists and restores correctly.
- Works fully **offline / airplane mode** (the whole point).
- Survives an app reinstall (relative-path resolution verified).
