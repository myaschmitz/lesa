# Build Plan — Lesa e-reader

A step-by-step, phased roadmap. We build in **small, reviewable slices**, one
git branch + PR per phase, so the GitHub history stays clean and you can follow
along. Each phase ends with something you can actually see or use.

> Legend: `[ ]` not started · `[~]` in progress · `[x]` done

> **Status:** **v1 (Phases 0–7) is complete and merged to `main`.** Part 1 below
> is the shipped v1; **[Part 2](#part-2--v2-roadmap-next-features)** is the
> planned v2 feature roadmap (not started).

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

# Part 2 — v2 roadmap (next features)

**v1 (Phases 0–7) is complete and on `main`.** Everything below is planned but
**not started**. Same rules as before: one branch + PR per phase, small
reviewable slices, engines stay isolated behind `ReaderView`, relative paths in
the DB, opaque per-format position tokens.

> **Ordering is flexible.** These are grouped by theme, not locked into this
> exact sequence — we'll pick what to build next together. Each item includes an
> honest note on engine feasibility, since EPUB (epub.js / WebView) and PDF
> (`@kishannareshpal/expo-pdf` / native) support different things. Where a
> feature is realistic for one engine but not the other, we ship it for the
> engine that supports it and degrade gracefully on the other (the same approach
> we took for covers in Phase 7).

## Phase 8 — Library organization  `[ ]`
**Goal:** make a growing library easy to navigate. Pure app/DB work, no engine
changes — a cheap, high-value quick win.
- [ ] Sort options: **Last opened** (current default), **Title (A–Z)**,
      **Recently added**, **Author**. Persist the chosen sort in settings.
- [ ] **Pin / favorite** books: a `pinned` flag (migration v3); pinned books
      sort to the top within whatever sort is active; star/pin toggle on the
      card and/or long-press menu.
- [ ] Optional filters (e.g. **EPUB only / PDF only**, **favorites only**).
- Branch: `library-organization`.

## Phase 9 — App icon & identity  `[ ]`
**Goal:** replace the default Expo icon with a real Lesa icon so it looks like a
finished app on the home screen.
- [ ] Final app icon (1024×1024) wired via `app.json` `icon` / iOS icon set;
      matching adaptive splash if desired.
- [ ] Needs a source image — either you provide artwork or we generate/iterate
      on a simple mark. (This is the one item that needs a design asset from you.)
- Branch: `app-icon`.

## Phase 10 — Paged reading mode  `[ ]`
**Goal:** read by **turning pages** (swipe/tap) instead of scrolling, switchable
in settings. You mostly scroll, but this is the "page capability" from day one.
- [ ] **EPUB:** switch epub.js to paginated flow (`flow: 'paginated'`) with a
      scroll⇄page toggle. This is the real work — the reader is built
      scroll-first, so we re-validate position save/restore in paged mode.
- [ ] **PDF:** page mode already exists (`pdfPaging` from Phase 5) — just surface
      it consistently with the EPUB toggle.
- [ ] Decide whether the mode is **global** or **per-book** (lean: global setting,
      revisit per-book later).
- Branch: `paged-reading-mode`.

## Phase 11 — Bookmarks  `[ ]`
**Goal:** save specific spots in a book and jump back to them later (distinct
from the single auto-saved "last position").
- [ ] New `bookmarks` table: `bookId`, opaque **position token** (CFI for EPUB,
      page+offset for PDF — *not* unified), optional label, `createdAt`.
- [ ] Add/remove a bookmark for the current location from the reader chrome.
- [ ] Bookmarks list per book → tap to jump. Fits the opaque-token rule cleanly;
      no engine internals leak out.
- Branch: `bookmarks`.

## Phase 12 — Fast-scroll scrubber + jump-back  `[ ]`
**Goal:** an Apple Books-style draggable progress bar to move through a book
quickly, plus a one-tap "return to where I was."
- [ ] **Scrubber:** a draggable progress control (bottom of the reader) to jump
      to any % of the book; show a live page/chapter preview while dragging.
  - PDF: trivial — jump to `page = fraction × pageCount`.
  - EPUB: requires epub.js **locations generation** (`book.locations.generate()`)
    to map % ⇄ CFI; it's a one-time, somewhat slow pass per book, so we
    **cache** the generated locations. (This same work also unlocks Phase 16's
    accurate page counts — they'll likely land together.)
- [ ] **Jump-back:** keep an in-memory **navigation history** of recent
      positions; whenever the user jumps (scrubber, search, TOC, bookmark), show
      a transient "↩ Back" chip to return to the prior spot. Fully engine-agnostic
      (just a stack of opaque tokens).
- Branch: `fast-scroll-and-jumpback`.

## Phase 13 — In-book search  `[ ]`
**Goal:** find text within the open book and jump to a hit. (Exact UX TBD — we'll
sketch it before building.)
- [ ] **EPUB:** epub.js can search spine sections and return CFIs; we present a
      results list → tap to jump. Searching a whole long book is async/heavier,
      so we stream results and show progress.
- [ ] **PDF:** depends on what `@kishannareshpal/expo-pdf` exposes (iOS PDFKit
      has `findString`, but it may not be surfaced) — **verify first**; if it's
      not available, ship EPUB search and mark PDF search as a follow-up.
- [ ] Design pass on the search UI before implementing.
- Branch: `in-book-search`.

## Phase 14 — Text selection & copy  `[ ]`
**Goal:** the *system* selection you expect in any text view — long-press or
double-tap + drag to select, then the OS **Copy / Look Up / Share** menu. This is
transient selection, **not** saved highlights (that's Phase 15).
- [ ] **EPUB:** enable native text selection inside the epub.js WebView and the
      iOS selection menu (copy/share). Generally well-supported.
- [ ] **PDF:** depends on the engine — native PDFKit supports text selection, but
      `@kishannareshpal/expo-pdf` may not expose it; **verify**, ship where
      supported, degrade gracefully otherwise.
- Branch: `text-selection-copy`.

## Phase 15 — Highlights & annotations (persistent)  `[ ]`
**Goal:** the *other* kind of highlight — select text and **mark it in a color**
(yellow, etc.), **saved** to the book and retrievable later, like highlighting in
a physical book. Builds on Phase 14's selection.
- [ ] New `highlights` table: `bookId`, opaque **anchor** (EPUB: CFI **range**;
      PDF: page + rect(s) — per-format, *not* unified), `color`, selected text
      snapshot, optional note, `createdAt`.
- [ ] **EPUB:** epub.js `rendition.annotations.highlight(cfiRange, …)` renders
      colored highlights natively over the text — strong fit.
- [ ] **PDF:** PDFKit supports highlight annotations, but the current engine may
      not expose creating them; **verify** — likely **EPUB-first**, PDF
      highlights as a follow-up.
- [ ] Highlight color picker; a **Highlights list** per book → tap to jump;
      delete a highlight.
- Branch: `highlights-annotations`.

## Phase 16 — Exact EPUB page counts  `[ ]`
**Goal:** replace the EPUB "X%" indicator with real "Page X of Y" where feasible.
- [ ] Use epub.js **locations** (the same generated index as Phase 12) to derive
      a stable page count and current page. epub.js is reflowable so "pages" are
      synthetic (tied to font size / viewport), but locations give a consistent,
      restorable number. Cache it; regenerate when typography changes.
- [ ] Likely **bundled with Phase 12** since both depend on locations generation.
- Branch: `epub-page-counts`.

## Phase 17 — PDF cover thumbnails  `[ ]`
**Goal:** real cover art for PDFs (Phase 7 left them as styled placeholders).
- [ ] **Blocked by tooling:** `@kishannareshpal/expo-pdf` has no render-to-image
      API. Options to evaluate: (a) a small native module / config plugin that
      renders page 1 via iOS PDFKit to a JPEG, or (b) a JS PDF rasterizer. We
      revisit the engine rather than hack it — this is intentionally a later item.
- Branch: `pdf-cover-thumbnails`.

## Phase 18 — Cloud sync (the big future layer)  `[ ]`
**Goal:** optional sync of the library + reading positions across devices. The
architecture was built for this from day one (relative paths, isolated
persistence, opaque position tokens) — but it's a substantial layer (auth,
storage backend, conflict resolution, large file uploads) and stays **last**.
- [ ] Design spike first: backend choice, what syncs (metadata/positions vs full
      book bytes), conflict strategy, offline-first reconciliation. Offline must
      keep working with sync off.
- Branch: `cloud-sync` (design spike before any build).

---

## Still explicitly deferred (not planned yet)
- **Android.** The architecture is cross-platform, but the focus stays iOS.
- **Standalone / App Store production build** (so the app runs without a Metro
  dev server) — separate from features; do when you want to stop depending on
  `expo run:ios`.

## How we'll work together
- I'll explain each phase in plain language before building, and go deeper on
  request. We won't merge giant changes — small PRs you can review.
