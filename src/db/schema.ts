import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema versioning via `PRAGMA user_version`. Each migration bumps the version
 * by one. To evolve the schema later, append a new entry to `MIGRATIONS` — never
 * edit an existing one — so existing installs upgrade cleanly.
 */
const MIGRATIONS: ((db: SQLiteDatabase) => Promise<void>)[] = [
  // v1: initial book catalog. Metadata + relative paths only; never content.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        format TEXT NOT NULL,
        relativePath TEXT NOT NULL,
        coverRelativePath TEXT,
        lastPosition TEXT,
        sizeBytes INTEGER NOT NULL DEFAULT 0,
        sourceName TEXT NOT NULL DEFAULT '',
        addedAt INTEGER NOT NULL,
        lastOpenedAt INTEGER
      );
    `);
  },
  // v2: display-only reading progress (0–1). Never the opaque position token;
  // PDFs derive it from page/pageCount, EPUBs from the locator percentage.
  async (db) => {
    await db.execAsync(`ALTER TABLE books ADD COLUMN progress REAL;`);
  },
  // v3: persistent highlights & notes. Metadata + an OPAQUE per-format anchor
  // (EPUB cfiRange; PDF page+rect if ever supported) + a small selected-text
  // snapshot for the list — never book content. `color` is a palette token KEY
  // (e.g. `yellow`), not raw CSS, so theming maps it per mode. Anchors are never
  // unified across engines (see docs/ARCHITECTURE.md → golden rule #5).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY NOT NULL,
        bookId TEXT NOT NULL,
        anchor TEXT NOT NULL,
        color TEXT NOT NULL,
        text TEXT NOT NULL,
        note TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_highlights_book ON highlights (bookId, createdAt);
    `);
  },
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;

  for (let i = version; i < MIGRATIONS.length; i++) {
    await db.withTransactionAsync(async () => {
      await MIGRATIONS[i](db);
    });
    version = i + 1;
    // PRAGMA user_version does not accept bound params, so interpolate the
    // integer directly (safe: it is a loop index, never user input).
    await db.execAsync(`PRAGMA user_version = ${version};`);
  }
}
