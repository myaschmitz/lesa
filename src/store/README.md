# `src/store`

Zustand stores: the library catalog (loaded from SQLite) and reader settings
(theme + typography). Persistence is explicit — stores read/write SQLite/MMKV.

- `library-store.ts` — catalog state (init/reconcile, import, remove, positions).
- `settings-store.ts` — global reader prefs (theme, font family/size/line height,
  PDF paging/fit), persisted via `settings-storage.ts` (MMKV, AsyncStorage
  fallback). Content/secrets are never stored.
