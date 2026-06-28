import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './schema';

const DATABASE_NAME = 'lesa.db';

let databasePromise: Promise<SQLiteDatabase> | null = null;

/**
 * Returns the singleton catalog database, opening and migrating it on first use.
 * The connection is cached so every caller shares one handle for the app's life.
 */
export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await migrate(db);
      return db;
    })().catch((error) => {
      // Reset so a later call can retry rather than reusing a rejected promise.
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}
