import type BetterSqlite3 from 'better-sqlite3';
import type { ApiStyle } from '../types.js';

export interface GuildConfig {
  guild_id: string;
  panel_url: string;
  api_style: ApiStyle;
  username: string;
  encrypted_token: string | null;
  token_expires_at: number | null;
  status_channel_id: string | null;
  admin_role_id: string | null;
  status_fields: string;
  created_at: number;
  updated_at: number;
}

export interface PinnedServer {
  id: number;
  guild_id: string;
  server_id: string;
  server_name: string;
  status_message_id: string | null;
  created_at: number;
}

export function createQueries(db: BetterSqlite3.Database) {
  const statements = {
    getGuild: db.prepare<[string], GuildConfig>(
      'SELECT * FROM guilds WHERE guild_id = ?'
    ),
    upsertGuild: db.prepare<[string, string, ApiStyle, string, string | null, number | null]>(`
      INSERT INTO guilds (guild_id, panel_url, api_style, username, encrypted_token, token_expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        panel_url = excluded.panel_url,
        api_style = excluded.api_style,
        username = excluded.username,
        encrypted_token = excluded.encrypted_token,
        token_expires_at = excluded.token_expires_at,
        updated_at = unixepoch()
    `),
    updateGuildToken: db.prepare<[string | null, number | null, string]>(
      'UPDATE guilds SET encrypted_token = ?, token_expires_at = ?, updated_at = unixepoch() WHERE guild_id = ?'
    ),
    updateGuildApiStyle: db.prepare<[ApiStyle, string]>(
      'UPDATE guilds SET api_style = ?, updated_at = unixepoch() WHERE guild_id = ?'
    ),
    updateStatusChannel: db.prepare<[string | null, string]>(
      'UPDATE guilds SET status_channel_id = ?, updated_at = unixepoch() WHERE guild_id = ?'
    ),
    updateAdminRole: db.prepare<[string | null, string]>(
      'UPDATE guilds SET admin_role_id = ?, updated_at = unixepoch() WHERE guild_id = ?'
    ),
    updateStatusFields: db.prepare<[string, string]>(
      'UPDATE guilds SET status_fields = ?, updated_at = unixepoch() WHERE guild_id = ?'
    ),
    deleteGuild: db.prepare<[string]>('DELETE FROM guilds WHERE guild_id = ?'),
    getAllGuilds: db.prepare<[], GuildConfig>('SELECT * FROM guilds'),
    getPinnedServers: db.prepare<[string], PinnedServer>(
      'SELECT * FROM pinned_servers WHERE guild_id = ? ORDER BY server_name'
    ),
    getPinnedServer: db.prepare<[string, string], PinnedServer>(
      'SELECT * FROM pinned_servers WHERE guild_id = ? AND server_id = ?'
    ),
    upsertPinnedServer: db.prepare<[string, string, string]>(`
      INSERT INTO pinned_servers (guild_id, server_id, server_name)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id, server_id) DO UPDATE SET
        server_name = excluded.server_name
    `),
    updateStatusMessageId: db.prepare<[string | null, string, string]>(
      'UPDATE pinned_servers SET status_message_id = ? WHERE guild_id = ? AND server_id = ?'
    ),
    deletePinnedServer: db.prepare<[string, string]>(
      'DELETE FROM pinned_servers WHERE guild_id = ? AND server_id = ?'
    ),
    deleteAllPinnedServers: db.prepare<[string]>(
      'DELETE FROM pinned_servers WHERE guild_id = ?'
    ),
    getAllPinnedServersWithChannel: db.prepare<[], PinnedServer & { status_channel_id: string }>(`
      SELECT ps.*, g.status_channel_id
      FROM pinned_servers ps
      JOIN guilds g ON ps.guild_id = g.guild_id
      WHERE g.status_channel_id IS NOT NULL
    `),
  };

  return {
    getGuild(guildId: string): GuildConfig | undefined {
      return statements.getGuild.get(guildId);
    },

    upsertGuild(
      guildId: string,
      panelUrl: string,
      apiStyle: ApiStyle,
      username: string,
      encryptedToken: string | null,
      tokenExpiresAt: number | null
    ): void {
      statements.upsertGuild.run(guildId, panelUrl, apiStyle, username, encryptedToken, tokenExpiresAt);
    },

    updateGuildToken(guildId: string, encryptedToken: string | null, tokenExpiresAt: number | null): void {
      statements.updateGuildToken.run(encryptedToken, tokenExpiresAt, guildId);
    },

    updateGuildApiStyle(guildId: string, apiStyle: ApiStyle): void {
      statements.updateGuildApiStyle.run(apiStyle, guildId);
    },

    updateStatusChannel(guildId: string, channelId: string | null): void {
      statements.updateStatusChannel.run(channelId, guildId);
    },

    updateAdminRole(guildId: string, roleId: string | null): void {
      statements.updateAdminRole.run(roleId, guildId);
    },

    updateStatusFields(guildId: string, fields: Record<string, boolean>): void {
      statements.updateStatusFields.run(JSON.stringify(fields), guildId);
    },

    deleteGuild(guildId: string): void {
      statements.deleteGuild.run(guildId);
    },

    getAllGuilds(): GuildConfig[] {
      return statements.getAllGuilds.all();
    },

    getPinnedServers(guildId: string): PinnedServer[] {
      return statements.getPinnedServers.all(guildId);
    },

    getPinnedServer(guildId: string, serverId: string): PinnedServer | undefined {
      return statements.getPinnedServer.get(guildId, serverId);
    },

    upsertPinnedServer(guildId: string, serverId: string, serverName: string): void {
      statements.upsertPinnedServer.run(guildId, serverId, serverName);
    },

    updateStatusMessageId(guildId: string, serverId: string, messageId: string | null): void {
      statements.updateStatusMessageId.run(messageId, guildId, serverId);
    },

    deletePinnedServer(guildId: string, serverId: string): void {
      statements.deletePinnedServer.run(guildId, serverId);
    },

    deleteAllPinnedServers(guildId: string): void {
      statements.deleteAllPinnedServers.run(guildId);
    },

    getAllPinnedServersWithChannel(): (PinnedServer & { status_channel_id: string })[] {
      return statements.getAllPinnedServersWithChannel.all();
    },

    parseStatusFields(json: string): Record<string, boolean> {
      try {
        return JSON.parse(json) as Record<string, boolean>;
      } catch {
        return {};
      }
    },
  };
}

export type Queries = ReturnType<typeof createQueries>;
