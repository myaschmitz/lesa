# Architecture — Lesa e-reader

This document explains *how the app is structured and why*. It's written to be
readable even if you're newer to mobile architecture — each section says what a
thing is and why we chose it.

## Guiding principles
1. **Offline-first.** The app must work fully in airplane mode. Nothing depends
   on the network.
2. **Own your files.** Books live in the app's Documents directory so iOS never
   purges them. This is the whole reason the app exists.
3. **Isolation.** The messy, format-specific rendering code is sealed behind a
   single interface so the rest of the app stays clean and a future engine swap
   is trivial.
4. **Future-proof, not future-built.** We only build offline now, but we avoid
   choices that would block adding cloud sync later.

## Layered overview

```
┌─────────────────────────────────────────────┐
│ Presentation (Expo Router screens)           │
│   Library · Reader · Settings                │
├─────────────────────────────────────────────┤
│ Reader abstraction                           │
│   ReaderView interface                       │
│   ├─ EpubReader   (epub.js / Readium)        │
│   └─ PdfReader    (expo-pdf)                  │
├─────────────────────────────────────────────┤
│ Domain / State (Zustand)                     │
│   library catalog · reader settings          │
├─────────────────────────────────────────────┤
│ Persistence                                  │
│   expo-sqlite (catalog + positions)          │
│   MMKV/AsyncStorage (settings)               │
├─────────────────────────────────────────────┤
│ Files & Import                               │
│   expo-file-system (Paths.document/books/)   │
│   document picker / share-sheet handler      │
└─────────────────────────────────────────────┘
```

Each layer only talks to the one directly below it. Screens never reach past the
reader abstraction into a specific library.

## The storage model (the most important part)

**Where books live:** `Paths.document/books/`. The iOS **Documents** directory
is not purged by the system under storage pressure (unlike `Caches` and `tmp`).
That is what makes "I'm on a plane and my book is still here" true.

**On import:** copy the picked file *into* `books/`. The URI you get from the
document picker is a temporary sandboxed grant — it will not survive, so we never
store or depend on it.

**Paths are stored RELATIVE.** The absolute path contains a container UUID that
iOS regenerates on every reinstall:

```
file:///var/mobile/Containers/Data/Application/<UUID-changes!>/Documents/books/x.epub
```

So the database stores only `books/x.epub`. At runtime we rebuild the absolute
URI from `Paths.document` + the relative path. A small launch-time step
re-resolves these so a reinstall never orphans a book.

**Content is never in the database.** SQLite holds metadata and the relative
path; the actual bytes stay on the filesystem.

## Data model

A book row:

| field              | type                       | notes                                   |
|--------------------|----------------------------|-----------------------------------------|
| `id`               | text (uuid)                | primary key                             |
| `title`            | text                       |                                         |
| `author`           | text                       | nullable                                |
| `format`           | `'epub' \| 'pdf'`          |                                         |
| `relativePath`     | text                       | e.g. `books/x.epub` — never absolute    |
| `coverRelativePath`| text                       | nullable; e.g. `covers/x.jpg`           |
| `lastPosition`     | text (opaque token)        | EPUB locator/CFI OR PDF page+offset     |
| `addedAt`          | int (epoch ms)             |                                         |
| `lastOpenedAt`     | int (epoch ms)             | nullable; used for last-read sorting    |

**`lastPosition` is deliberately opaque and per-format.** We do NOT unify EPUB
and PDF positions — an EPUB locator and a PDF page+offset are different things.
Each reader serializes/deserializes its own token.

## The reader abstraction

One interface, two implementations. This is what keeps the two rendering engines
from leaking into the rest of the app.

```ts
type ReaderTheme = {
  background: string;
  text: string;
  // ...design tokens shared with app chrome
};

type ReaderTypography = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

interface ReaderViewProps {
  absolutePath: string;          // resolved at runtime from relativePath
  initialPosition?: string;      // opaque per-format token
  theme: ReaderTheme;
  typography?: ReaderTypography; // EPUB only; ignored by PDF
  onPositionChange: (position: string) => void; // opaque token back out
  onReady?: () => void;
}
```

- `EpubReader` and `PdfReader` both implement this shape.
- Library and Reader screens only ever import `ReaderView` — never epub.js,
  Readium, or the PDF lib directly.
- Swapping epub.js for Readium later is a single-file change inside `EpubReader`.

## State management

**Zustand** holds two things globally:
- the **library catalog** (loaded from SQLite), and
- the **reader settings** (theme + typography).

Zustand is chosen over Redux for this size of app: less boilerplate, simple
hooks, easy to reason about. Persistence is explicit — the store reads from /
writes to SQLite and MMKV rather than being magically synced.

## Theming

Themes (light, dark, white, black, sepia) are defined **once** as design tokens
in `src/theme/`. Both the app chrome and the reader engines consume the same
tokens so colors stay consistent everywhere. A theme is essentially a
`{ background, text, ... }` token set; switching theme swaps the token set.

## Format reality: EPUB vs PDF
- **EPUB is reflowable** — font family, size, line height, and themes all apply.
- **PDF is fixed-layout** — typography controls do NOT apply. PDFs get
  scroll/page mode, zoom, and a light/dark tint only. The settings UI grays out
  typography controls when a PDF is open so expectations are clear.

## Build & distribution (Expo)
- **Not Expo Go.** The PDF and EPUB engines ship native code, which Expo Go
  cannot load.
- **Dev build** (`expo prebuild` + EAS or local) for day-to-day work with hot
  reload.
- **Preview build** — an EAS profile that produces an installable app you
  sideload onto your own device. That is the "native app on my phone" artifact.
- **New Architecture stays ON** (RN default; retrofitting later is painful).
- **Signing:** using a **paid Apple Developer account**, so preview builds last
  ~1 year (a free Apple ID would expire sideloaded apps after 7 days).

## Designed-for-later: cloud sync (NOT built now)
The current design leaves clean seams for an optional future sync layer:
- The persistence layer is isolated, so a sync engine can sit beside it.
- Positions are opaque tokens that can be shipped to a server as-is.
- Relative paths + content-addressable files map naturally to remote storage.

We are **not** building any of this yet — it's only a constraint on today's
decisions so we don't paint ourselves into a corner.
