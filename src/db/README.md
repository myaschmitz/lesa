# `src/db`

`expo-sqlite` schema + queries for the book catalog and reading positions.
Holds metadata and relative paths only — never book content.

_Implemented in Phase 2: `database.ts` (singleton + migrations), `schema.ts`
(`books` table, `user_version` migrations), `books.ts` (catalog queries)._
