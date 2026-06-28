# `src/store`

Zustand stores: the library catalog (loaded from SQLite) and reader settings
(theme + typography). Persistence is explicit — stores read/write SQLite/MMKV.

_Phase 2: `library-store.ts` (catalog state — init/reconcile, import, remove).
Reader settings land in the reader-settings phase._
