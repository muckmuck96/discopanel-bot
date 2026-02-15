import type BetterSqlite3 from 'better-sqlite3';

export interface Migration {
  version: number;
  description: string;
  up: (db: BetterSqlite3.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS guilds (
          guild_id TEXT PRIMARY KEY,
          panel_url TEXT NOT NULL,
          api_style TEXT NOT NULL DEFAULT 'auto',
          username TEXT NOT NULL,
          encrypted_token TEXT,
          token_expires_at INTEGER,
          status_channel_id TEXT,
          admin_role_id TEXT,
          status_fields TEXT DEFAULT '{}',
          created_at INTEGER DEFAULT (unixepoch()),
          updated_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS pinned_servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
          server_id TEXT NOT NULL,
          server_name TEXT NOT NULL,
          status_message_id TEXT,
          created_at INTEGER DEFAULT (unixepoch()),
          UNIQUE(guild_id, server_id)
        );

        CREATE INDEX IF NOT EXISTS idx_pinned_servers_guild_id ON pinned_servers(guild_id);
      `);
    },
  },
];

export function runMigrations(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at INTEGER DEFAULT (unixepoch())
    );
  `);

  const appliedVersions = new Set(
    db
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => (row as { version: number }).version)
  );

  const runMigration = db.transaction((migration: Migration) => {
    migration.up(db);
    db.prepare('INSERT INTO schema_migrations (version, description) VALUES (?, ?)').run(
      migration.version,
      migration.description
    );
  });

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      runMigration(migration);
    }
  }
}
