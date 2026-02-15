import {
  PanelConnectionError,
  PanelAuthError,
  PanelTimeoutError,
  ServerNotFoundError,
} from '../../errors.js';
import type {
  PanelAdapter,
  PanelConnection,
  PanelServer,
  AuthResult,
  ActionResult,
  ConnectServerResponse,
} from '../types.js';
import type { ServerStatus } from '../../types.js';
import { getLogger } from '../../utils/logger.js';

const ENDPOINTS = {
  login: '/discopanel.v1.AuthService/Login',
  listServers: '/discopanel.v1.ServerService/ListServers',
  startServer: '/discopanel.v1.ServerService/StartServer',
  stopServer: '/discopanel.v1.ServerService/StopServer',
  restartServer: '/discopanel.v1.ServerService/RestartServer',
} as const;

const REQUEST_TIMEOUT = 10000;

function normalizeStatus(status: string): ServerStatus {
  const cleaned = status.replace(/^SERVER_STATUS_/i, '').toLowerCase();
  if (cleaned === 'running' || cleaned === 'online') return 'running';
  if (cleaned === 'stopped' || cleaned === 'offline') return 'stopped';
  if (cleaned === 'starting') return 'starting';
  if (cleaned === 'stopping') return 'stopping';
  return 'unknown';
}

function normalizeModLoader(modLoader: string | undefined): string | null {
  if (!modLoader) return null;
  const cleaned = modLoader.replace(/^MOD_LOADER_/i, '');
  const loaderMap: Record<string, string> = {
    'AUTO_CURSEFORGE': 'CurseForge',
    'FORGE': 'Forge',
    'FABRIC': 'Fabric',
    'NEOFORGE': 'NeoForge',
    'PAPER': 'Paper',
    'SPIGOT': 'Spigot',
    'VANILLA': 'Vanilla',
    'QUILT': 'Quilt',
  };
  return loaderMap[cleaned.toUpperCase()] ?? cleaned;
}

function calculateUptime(lastStarted: string | undefined): number | null {
  if (!lastStarted) return null;
  try {
    const startTime = new Date(lastStarted).getTime();
    const now = Date.now();
    return Math.floor((now - startTime) / 1000);
  } catch {
    return null;
  }
}

function normalizeServer(server: ConnectServerResponse): PanelServer {
  let memoryUsage: number | null = null;
  if (server.memoryUsage) {
    memoryUsage = parseFloat(server.memoryUsage);
  } else if (typeof server.memory === 'number') {
    memoryUsage = server.memory;
  } else if (typeof server.ram === 'number') {
    memoryUsage = server.ram;
  }

  const status = normalizeStatus(server.status);
  const playersOnlineRaw = server.playersOnline ?? server.players ?? server.playerCount ?? server.online;
  const playersMax = server.maxPlayers ?? server.playersMax ?? server.playerLimit ?? server.slots ?? null;
  const cpuUsage = server.cpuPercent ?? server.cpu ?? server.cpuUsage ?? null;

  let playersOnline: number | null = null;
  if (typeof playersOnlineRaw === 'number') {
    playersOnline = playersOnlineRaw;
  } else if (status === 'running' && typeof playersMax === 'number') {
    playersOnline = 0;
  }

  return {
    id: server.id,
    name: server.name,
    status,
    mcVersion: server.mcVersion ?? server.serverVersion ?? null,
    modLoader: normalizeModLoader(server.modLoader),
    playersOnline,
    playersMax: typeof playersMax === 'number' ? playersMax : null,
    cpuUsage: typeof cpuUsage === 'number' ? cpuUsage : null,
    memoryUsage: memoryUsage,
    uptime: calculateUptime(server.lastStarted),
  };
}

async function request<T>(
  url: string,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    token?: string;
    timeout?: number;
  } = {}
): Promise<T> {
  const { method = 'POST', body, token, timeout = REQUEST_TIMEOUT } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${url}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new PanelAuthError('Authentication failed', 401);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new PanelConnectionError(`Request failed: ${response.status} ${text}`, url);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof PanelAuthError || error instanceof PanelConnectionError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new PanelTimeoutError('Request timed out', timeout);
    }

    throw new PanelConnectionError(
      `Failed to connect to panel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      url,
      error instanceof Error ? error : undefined
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export const connectAdapter: PanelAdapter = {
  async authenticate(url: string, username: string, password: string): Promise<AuthResult> {
    interface LoginResponse {
      token: string;
      expires_at?: number;
    }

    const response = await request<LoginResponse>(url, ENDPOINTS.login, {
      body: { username, password },
    });

    return {
      token: response.token,
      expiresAt: response.expires_at ?? null,
      apiStyle: 'connect',
    };
  },

  async listServers(connection: PanelConnection): Promise<PanelServer[]> {
    const logger = getLogger();

    const response = await request<unknown>(connection.url, ENDPOINTS.listServers, {
      method: 'POST',
      token: connection.token,
      body: {},
    });

    logger.debug('ListServers raw response:', JSON.stringify(response, null, 2));

    const data = response as Record<string, unknown>;
    let servers: ConnectServerResponse[] = [];

    if (Array.isArray(data)) {
      servers = data as ConnectServerResponse[];
    } else if (Array.isArray(data['servers'])) {
      servers = data['servers'] as ConnectServerResponse[];
    } else if (Array.isArray(data['items'])) {
      servers = data['items'] as ConnectServerResponse[];
    }

    logger.debug('Parsed servers:', JSON.stringify(servers, null, 2));

    return servers.map(normalizeServer);
  },

  async getServer(connection: PanelConnection, serverId: string): Promise<PanelServer> {
    const servers = await this.listServers(connection);
    const server = servers.find((s) => s.id === serverId);

    if (!server) {
      throw new ServerNotFoundError(serverId);
    }

    return server;
  },

  async startServer(connection: PanelConnection, serverId: string): Promise<ActionResult> {
    await request(connection.url, ENDPOINTS.startServer, {
      token: connection.token,
      body: { id: serverId },
    });

    return { success: true };
  },

  async stopServer(connection: PanelConnection, serverId: string): Promise<ActionResult> {
    await request(connection.url, ENDPOINTS.stopServer, {
      token: connection.token,
      body: { id: serverId },
    });

    return { success: true };
  },

  async restartServer(connection: PanelConnection, serverId: string): Promise<ActionResult> {
    await request(connection.url, ENDPOINTS.restartServer, {
      token: connection.token,
      body: { id: serverId },
    });

    return { success: true };
  },
};
