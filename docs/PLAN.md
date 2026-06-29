# Build Plan — Lesa e-reader

A step-by-step, phased roadmap. We build in **small, reviewable slices**, one
git branch + PR per phase, so the GitHub history stays clean and you can follow
along. Each phase ends with something you can actually see or use.

> Legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## Why this app exists (the problem)
Apple Books offloads your downloaded books under iCloud "Optimize Storage." When
you're on a plane or have no service, the book you wanted is gone. **Lesa fixes
this by owning the files in the app's own Documents folder, which iOS does not
purge.** Everything below serves that goal plus a smooth, intuitive reader.

---

## Phase 0 — Planning & docs  `[x]`
- [x] Assess the proposed architecture.
- [x] `AGENTS.md`, `docs/PLAN.md`, `docs/ARCHITECTURE.md`.
- Branch: `project-planning-and-docs`.

## Phase 1 — Scaffold + get a build on your phone  `[x]`
**Goal:** prove the native-module pipeline works BEFORE writing features. This is
where most projects get stuck, so we de-risk it on day one.
- [x] `create-expo-app` with TypeScript + Expo Router.
- [x] Enable New Architecture; set `strict` TS; add ESLint + Prettier.
- [x] Add ONE native lib (`@kishannareshpal/expo-pdf`) to prove prebuild works.
- [x] `expo prebuild` verified; EAS `preview` profile configured (`eas.json`).
- [x] Produced an EAS preview build; installed on iPhone — PDF renders, and it
      still renders in airplane mode (offline-first confirmed).
- [x] **Signing decided:** using a **paid Apple Developer account** — preview
      builds last ~1 year, so no 7-day re-install churn.
- Branch: `scaffold-and-build-pipeline`.

## Phase 2 — Import + persistence (this already solves offloading)  `[x]`
**Goal:** get books onto the device, permanently, and list them. No reading yet,
but the core problem is solved here.
- [x] Document picker → copy file into `Paths.document/books/`.
- [x] Register app as a handler for `.epub` / `.pdf` (share-sheet "Open in…").
- [x] `expo-sqlite` schema; store metadata + **relative** path.
- [x] Library screen: list/grid of imported books.
- [x] Launch-time migration that re-resolves relative paths (survives app
      **offload** / update — see note below).
- Branch: `import-and-persistence`.

> **What "survives reinstall" means.** Installing a new build **over** the
> existing app (an app update — *don't delete first*) keeps the app's
> `Documents/` and SQLite catalog but may change the container path's UUID.
> Storing **relative** paths and rebuilding the absolute URI at launch keeps
> books resolvable across that change. (iOS *Offload App* is the same scenario,
> but that option only appears for App Store apps, not dev/ad-hoc builds.) A full
> **Delete App** destroys the entire data container (books + catalog) — nothing
> survives that until an optional cloud-sync layer exists. Test reinstall-over,
> not delete.

## Phase 3 — PDF reader  `[x]`
**Goal:** open a PDF, scroll smoothly, remember where you were.
- [x] Integrate the PDF engine behind the `ReaderView` interface.
- [x] Vertical scroll mode + optional page snapping.
- [x] Save/restore position (page + offset) per book.
- Branch: `pdf-reader`.

## Phase 4 — EPUB reader  `[x]`
**Goal:** same interface, EPUB engine. **Validate scroll feel early with a long
book** — if it's laggy, we evaluate the native Readium path.
- [x] Integrate epub.js (WebView) behind `ReaderView`.
- [x] Scroll-first flow; chapter navigation / table of contents.
- [x] Save/restore position (locator/CFI) per book.
- [ ] Scroll-smoothness check → decide keep epub.js vs switch to Readium.
- Branch: `epub-reader`.

## Phase 5 — Reader settings  `[x]`
**Goal:** the settings you care about, done cleanly (the part other apps get
wrong). Themes first — cheap and high impact.
- [x] Theme tokens: light, dark, white, black, sepia (shared by chrome + reader).
- [x] EPUB typography: font family, font size, line height.
- [x] PDF: scroll/page toggle, zoom, light/dark tint. **Gray out typography
      controls for PDFs** (fixed-layout — they don't apply).
- [x] Persist settings; apply consistently across both engines.
- Branch: `reader-settings`.

## Phase 6 — Immersive reader chrome  `[x]`
**Goal:** a distraction-free, Apple Books-style reading screen. Replace the solid
top bar with minimal, floating, auto-hiding controls so the book fills the
screen. Applies to both PDF and EPUB via the existing `ReaderView` abstraction.
- [x] Hide the navigation/top bar; book content goes edge-to-edge.
- [x] **Tap center** to toggle chrome (overlays fade in/out); chrome auto-hides
      after a short idle while reading.
- [x] **Title bubble** top-center: just the title (no clutter), solid pill
      background so it stays legible over any page.
- [x] **Close (X)** top-right in a solid circle → back to Library.
- [x] **Settings** bottom-right: circular FAB with an icon → opens the existing
      reader-settings sheet.
- [x] **Page indicator** bottom-center: "page X of Y" (PDF: real pages; EPUB:
      best-effort from locator/progress).
- [x] Respect safe-area insets; theme overlays from theme tokens; smooth fade.
- Branch: `immersive-reader-chrome`.

## Phase 7 — Polish  `[x]`
- [x] Cover extraction + thumbnails. **EPUB:** cover extracted from epub.js
      metadata on first open, saved to `covers/<id>.jpg` (relative path in DB,
      bytes on disk). **PDF:** `@kishannareshpal/expo-pdf` exposes no
      render-to-image API, so PDFs keep the styled placeholder card (graceful
      fallback) rather than pulling in another native engine this phase.
- [x] Sort by last-read; reading-progress indicator. Library orders by
      `lastOpenedAt` (falls back to `addedAt`); a thin progress bar on each card
      shows PDF page-% / EPUB locator-% from a display-only `progress` column.
- [x] Empty states, delete/remove book, basic error handling. Empty Library has
      a clear call-to-action; delete removes file + cover + row; reconcile prunes
      orphaned covers; store errors surface as a dismissible banner.
- [x] Manual offline / reinstall test pass. Steps documented in the PR.
- Branch: `phase7-polish`.

---

## Explicitly deferred (future, not now)
- Cloud sync of books and positions. Architecture leaves room (opaque position
  tokens, relative paths, isolated persistence layer) but we build offline-only.
- Annotations / highlights / bookmarks beyond last-position.
- Android. The architecture is cross-platform, but the focus is iOS.

## How we'll work together
- I'll explain each phase in plain language before building, and go deeper on
  request. We won't merge giant changes — small PRs you can review.
