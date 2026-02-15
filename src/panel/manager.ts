import { getAdapter, detectApiStyle } from './adapters/index.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { PanelNotConfiguredError, PanelAuthError } from '../errors.js';
import type { AppConfig } from '../config.js';
import type { Database } from '../database/index.js';
import type { PanelAdapter, PanelConnection, PanelServer, AuthResult, ActionResult } from './types.js';
import type { ApiStyle } from '../types.js';

export interface PanelManager {
  setup(guildId: string, panelUrl: string, username: string, password: string): Promise<AuthResult>;
  ensureGuildSetup(guildId: string): Promise<void>;
  getConnection(guildId: string): Promise<PanelConnection>;
  listServers(guildId: string): Promise<PanelServer[]>;
  getServer(guildId: string, serverId: string): Promise<PanelServer>;
  startServer(guildId: string, serverId: string): Promise<ActionResult>;
  stopServer(guildId: string, serverId: string): Promise<ActionResult>;
  restartServer(guildId: string, serverId: string): Promise<ActionResult>;
  disconnect(guildId: string): void;
  isSingleGuildMode(): boolean;
}

export function createPanelManager(config: AppConfig, db: Database): PanelManager {
  const credentialCache = new Map<string, { username: string; password: string }>();

  let singleGuildToken: string | null = null;
  let singleGuildTokenExpires: number | null = null;
  let singleGuildApiStyle: ApiStyle = 'auto';

  function getGuildAdapter(apiStyle: ApiStyle): PanelAdapter {
    return getAdapter(apiStyle);
  }

  function needsRefresh(expiresAt: number | null): boolean {
    if (expiresAt === null) return false;
    const now = Math.floor(Date.now() / 1000);
    return expiresAt - now < config.panel.tokenRefreshBufferSeconds;
  }

  async function refreshSingleGuildToken(): Promise<string> {
    const result = await detectApiStyle(
      config.panel.url!,
      config.panel.username!,
      config.panel.password!
    );
    singleGuildToken = result.token;
    singleGuildTokenExpires = result.expiresAt;
    singleGuildApiStyle = result.apiStyle;
    return result.token;
  }

  async function refreshToken(guildId: string): Promise<string> {
    if (!config.multiGuild) {
      return refreshSingleGuildToken();
    }

    const guild = db.getGuild(guildId);
    if (!guild) {
      throw new PanelNotConfiguredError(guildId);
    }

    const creds = credentialCache.get(guildId);
    if (!creds) {
      throw new PanelAuthError('Session expired. Please run /setup again to reconnect.');
    }

    const adapter = getGuildAdapter(guild.api_style);
    const result = await adapter.authenticate(guild.panel_url, creds.username, creds.password);

    const encryptedToken = encrypt(result.token, config.encryption.key!);
    db.updateGuildToken(guildId, encryptedToken, result.expiresAt);

    return result.token;
  }

  return {
    isSingleGuildMode(): boolean {
      return !config.multiGuild;
    },

    async ensureGuildSetup(guildId: string): Promise<void> {
      if (config.multiGuild) {
        return;
      }

      const guild = db.getGuild(guildId);
      if (guild) {
        return;
      }

      if (!singleGuildToken || needsRefresh(singleGuildTokenExpires)) {
        await refreshSingleGuildToken();
      }

      db.upsertGuild(
        guildId,
        config.panel.url!,
        singleGuildApiStyle,
        config.panel.username!,
        null,
        null
      );
    },

    async setup(guildId: string, panelUrl: string, username: string, password: string): Promise<AuthResult> {
      const normalizedUrl = panelUrl.replace(/\/+$/, '');
      const result = await detectApiStyle(normalizedUrl, username, password);
      const encryptedToken = encrypt(result.token, config.encryption.key!);

      db.upsertGuild(guildId, normalizedUrl, result.apiStyle, username, encryptedToken, result.expiresAt);
      credentialCache.set(guildId, { username, password });

      return result;
    },

    async getConnection(guildId: string): Promise<PanelConnection> {
      if (!config.multiGuild) {
        if (!singleGuildToken || needsRefresh(singleGuildTokenExpires)) {
          await refreshSingleGuildToken();
        }
        return {
          url: config.panel.url!,
          token: singleGuildToken!,
          apiStyle: singleGuildApiStyle,
        };
      }

      const guild = db.getGuild(guildId);
      if (!guild) {
        throw new PanelNotConfiguredError(guildId);
      }

      if (!guild.encrypted_token) {
        throw new PanelAuthError('No token stored. Please run /setup again.');
      }

      let token: string;

      if (needsRefresh(guild.token_expires_at)) {
        token = await refreshToken(guildId);
      } else {
        token = decrypt(guild.encrypted_token, config.encryption.key!);
      }

      return {
        url: guild.panel_url,
        token,
        apiStyle: guild.api_style,
      };
    },

    async listServers(guildId: string): Promise<PanelServer[]> {
      const connection = await this.getConnection(guildId);
      const adapter = getGuildAdapter(connection.apiStyle);

      try {
        return await adapter.listServers(connection);
      } catch (error) {
        if (error instanceof PanelAuthError) {
          const newToken = await refreshToken(guildId);
          const newConnection = { ...connection, token: newToken };
          return await adapter.listServers(newConnection);
        }
        throw error;
      }
    },

    async getServer(guildId: string, serverId: string): Promise<PanelServer> {
      const connection = await this.getConnection(guildId);
      const adapter = getGuildAdapter(connection.apiStyle);

      try {
        return await adapter.getServer(connection, serverId);
      } catch (error) {
        if (error instanceof PanelAuthError) {
          const newToken = await refreshToken(guildId);
          const newConnection = { ...connection, token: newToken };
          return await adapter.getServer(newConnection, serverId);
        }
        throw error;
      }
    },

    async startServer(guildId: string, serverId: string): Promise<ActionResult> {
      const connection = await this.getConnection(guildId);
      const adapter = getGuildAdapter(connection.apiStyle);

      try {
        return await adapter.startServer(connection, serverId);
      } catch (error) {
        if (error instanceof PanelAuthError) {
          const newToken = await refreshToken(guildId);
          const newConnection = { ...connection, token: newToken };
          return await adapter.startServer(newConnection, serverId);
        }
        throw error;
      }
    },

    async stopServer(guildId: string, serverId: string): Promise<ActionResult> {
      const connection = await this.getConnection(guildId);
      const adapter = getGuildAdapter(connection.apiStyle);

      try {
        return await adapter.stopServer(connection, serverId);
      } catch (error) {
        if (error instanceof PanelAuthError) {
          const newToken = await refreshToken(guildId);
          const newConnection = { ...connection, token: newToken };
          return await adapter.stopServer(newConnection, serverId);
        }
        throw error;
      }
    },

    async restartServer(guildId: string, serverId: string): Promise<ActionResult> {
      const connection = await this.getConnection(guildId);
      const adapter = getGuildAdapter(connection.apiStyle);

      try {
        return await adapter.restartServer(connection, serverId);
      } catch (error) {
        if (error instanceof PanelAuthError) {
          const newToken = await refreshToken(guildId);
          const newConnection = { ...connection, token: newToken };
          return await adapter.restartServer(newConnection, serverId);
        }
        throw error;
      }
    },

    disconnect(guildId: string): void {
      credentialCache.delete(guildId);
      db.deleteGuild(guildId);
    },
  };
}
