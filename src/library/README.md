# `src/library`

Import + catalog logic: document picker, copying picked files into
`Paths.document/books/`, and building the catalog. Stores RELATIVE paths only.

_Implemented in Phase 2: `paths.ts` (Documents/books helpers, relative↔absolute),
`import.ts` (picker + copy + catalog insert), `reconcile.ts` (launch-time
integrity pass), `incoming.ts` (share-sheet hand-off), `duplicate-prompt.ts`._
