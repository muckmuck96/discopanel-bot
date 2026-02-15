import BetterSqlite3 from 'better-sqlite3';
import { join } from 'path';
import { runMigrations } from './migrations.js';
import { createQueries, type Queries } from './queries.js';

const DATABASE_PATH = join(process.cwd(), 'data', 'discopanel.db');

export interface Database extends Queries {
  close(): void;
}

export function createDatabase(): Database {
  const db = new BetterSqlite3(DATABASE_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  const queries = createQueries(db);

  return {
    ...queries,
    close: () => db.close(),
  };
}
