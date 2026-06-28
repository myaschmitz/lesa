# Lesa

An **offline-first iOS e-reader** (Expo / React Native) for **EPUB** and **PDF**.

The point: imported books are stored in the app's own Documents directory and are
**never offloaded** — unlike Apple Books, which purges downloads under iCloud
storage pressure and leaves you stuck without a book when you're offline.

Goals: smooth scrolling (paging optional), an intuitive UI, and real reader
settings (font, size, line height, and light/dark/white/black/sepia themes).
Offline only for now, designed to allow optional cloud sync later.

## Docs
- [`docs/PLAN.md`](docs/PLAN.md) — phased, step-by-step build roadmap.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture and key decisions.
- [`AGENTS.md`](AGENTS.md) — conventions for anyone (or any agent) working here.

## Tech stack
- **Expo SDK 56** (dev client + EAS builds — **not** Expo Go; native modules are
  required). New Architecture is the default and only option on SDK 55+.
- **TypeScript** (`strict`), **Expo Router**, ESLint + Prettier.
- **PDF:** [`@kishannareshpal/expo-pdf`](https://github.com/kishannareshpal/expo-pdf)
  (Apple PDFKit on iOS).

## Project layout
```
app/            Expo Router screens
src/
  reader/       ReaderView interface + Epub/Pdf implementations
  library/      import + catalog logic
  db/           expo-sqlite schema + queries
  store/        Zustand stores
  theme/        design tokens
  types/        shared types
  components/    hooks/    constants/   (UI + helpers)
assets/         images, icons, sample.pdf
docs/           PLAN.md, ARCHITECTURE.md
```

## Develop
```bash
npm install
npm run ios        # build + run the dev client on a simulator/device (expo run:ios)
npm run typecheck  # tsc --noEmit
npm run lint       # expo lint (ESLint)
npm run format     # prettier --write .
```
> Expo Go won't work — the app ships native code. Use a dev/preview build.

## Build a preview build for your iPhone (EAS)
A `preview` profile is configured in [`eas.json`](eas.json) (internal
distribution, real device). With a **paid Apple Developer account**, the
installed app lasts ~1 year. One-time setup, run on your Mac:

```bash
npm install -g eas-cli      # if not already installed
eas login                   # log into your Expo account (free to create)
eas init                    # links this repo to an EAS project (writes the
                            # project id into app.json)
eas build --platform ios --profile preview
```

On the first iOS build, EAS prompts you to **log into Apple**, creates the
signing credentials for you, and asks you to **register your iPhone** (its UDID).
When the build finishes, open the EAS link / scan the QR code on the phone to
install. The **PDF** tab renders a bundled sample PDF — if it displays, the
native build pipeline works.

## Status
**Phase 1 — scaffold + build pipeline.** Expo app scaffolded with the New
Architecture, one native module (PDF) wired in to prove `expo prebuild` + EAS
produce an installable iOS build. No real reader features yet.