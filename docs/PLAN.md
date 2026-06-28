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

## Phase 2 — Import + persistence (this already solves offloading)  `[ ]`
**Goal:** get books onto the device, permanently, and list them. No reading yet,
but the core problem is solved here.
- [ ] Document picker → copy file into `Paths.document/books/`.
- [ ] Register app as a handler for `.epub` / `.pdf` (share-sheet "Open in…").
- [ ] `expo-sqlite` schema; store metadata + **relative** path.
- [ ] Library screen: list/grid of imported books.
- [ ] Launch-time migration that re-resolves relative paths (survives reinstall).
- Branch: `import-and-persistence`.

## Phase 3 — PDF reader  `[ ]`
**Goal:** open a PDF, scroll smoothly, remember where you were.
- [ ] Integrate the PDF engine behind the `ReaderView` interface.
- [ ] Vertical scroll mode + optional page snapping.
- [ ] Save/restore position (page + offset) per book.
- Branch: `pdf-reader`.

## Phase 4 — EPUB reader  `[ ]`
**Goal:** same interface, EPUB engine. **Validate scroll feel early with a long
book** — if it's laggy, we evaluate the native Readium path.
- [ ] Integrate epub.js (WebView) behind `ReaderView`.
- [ ] Scroll-first flow; chapter navigation / table of contents.
- [ ] Save/restore position (locator/CFI) per book.
- [ ] Scroll-smoothness check → decide keep epub.js vs switch to Readium.
- Branch: `epub-reader`.

## Phase 5 — Reader settings  `[ ]`
**Goal:** the settings you care about, done cleanly (the part other apps get
wrong). Themes first — cheap and high impact.
- [ ] Theme tokens: light, dark, white, black, sepia (shared by chrome + reader).
- [ ] EPUB typography: font family, font size, line height.
- [ ] PDF: scroll/page toggle, zoom, light/dark tint. **Gray out typography
      controls for PDFs** (fixed-layout — they don't apply).
- [ ] Persist settings; apply consistently across both engines.
- Branch: `reader-settings`.

## Phase 6 — Polish  `[ ]`
- [ ] Cover extraction + thumbnails.
- [ ] Sort by last-read; reading-progress indicator.
- [ ] Empty states, delete/remove book, basic error handling.
- [ ] Manual offline / reinstall test pass.
- Branch: `polish`.

---

## Explicitly deferred (future, not now)
- Cloud sync of books and positions. Architecture leaves room (opaque position
  tokens, relative paths, isolated persistence layer) but we build offline-only.
- Annotations / highlights / bookmarks beyond last-position.
- Android. The architecture is cross-platform, but the focus is iOS.

## How we'll work together
- I'll explain each phase in plain language before building, and go deeper on
  request. We won't merge giant changes — small PRs you can review.
