import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';

let databaseSingleton: Database.Database | null = null;

export function createDatabase(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true });

  return new Database(dbPath);
}

export function getDatabase() {
  if (databaseSingleton) {
    return databaseSingleton;
  }

  databaseSingleton = createDatabase(
    process.env.GROUNDFLARE_DB_PATH ?? 'data/groundflare.sqlite',
  );

  return databaseSingleton;
}
