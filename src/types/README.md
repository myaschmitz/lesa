# `src/types`

Shared TypeScript types (e.g. the `Book` catalog row, reader props). Reading
position is an opaque, per-format token — EPUB locator/CFI vs PDF page+offset are
deliberately NOT unified.

_Phase 2: `book.ts` (`Book`, `BookFormat`, `NewBook`). More types land alongside
the features that use them._
