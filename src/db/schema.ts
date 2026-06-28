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
