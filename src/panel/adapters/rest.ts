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
  RestServerResponse,
} from '../types.js';
import type { ServerStatus } from '../../types.js';

const ENDPOINTS = {
  login: '/api/v1/auth/login',
  servers: '/api/v1/servers',
  serverAction: (serverId: string, action: string) => `/api/v1/servers/${serverId}/${action}`,
} as const;

const REQUEST_TIMEOUT = 10000;

function normalizeStatus(status: string): ServerStatus {
  const lower = status.toLowerCase();
  if (lower === 'running' || lower === 'online') return 'running';
  if (lower === 'stopped' || lower === 'offline') return 'stopped';
  if (lower === 'starting') return 'starting';
  if (lower === 'stopping') return 'stopping';
  return 'unknown';
}

function normalizeServer(server: RestServerResponse): PanelServer {
  return {
    id: server.id,
    name: server.name,
    status: normalizeStatus(server.status),
    mcVersion: server.mcVersion ?? null,
    modLoader: server.modLoader ?? null,
    playersOnline: server.playersOnline ?? null,
    playersMax: server.playersMax ?? null,
    cpuUsage: server.cpuUsage ?? null,
    memoryUsage: server.memoryUsage ?? null,
    uptime: server.uptime ?? null,
  };
}

async function request<T>(
  url: string,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    token?: string;
    timeout?: number;
  } = {}
): Promise<T> {
  const { method = 'GET', body, token, timeout = REQUEST_TIMEOUT } = options;

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

    if (response.status === 404) {
      throw new ServerNotFoundError(endpoint);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new PanelConnectionError(`Request failed: ${response.status} ${text}`, url);
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    if (
      error instanceof PanelAuthError ||
      error instanceof PanelConnectionError ||
      error instanceof ServerNotFoundError
    ) {
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

export const restAdapter: PanelAdapter = {
  async authenticate(url: string, username: string, password: string): Promise<AuthResult> {
    interface LoginResponse {
      token: string;
      expiresAt?: number;
    }

    const response = await request<LoginResponse>(url, ENDPOINTS.login, {
      method: 'POST',
      body: { username, password },
    });

    return {
      token: response.token,
      expiresAt: response.expiresAt ?? null,
      apiStyle: 'rest',
    };
  },

  async listServers(connection: PanelConnection): Promise<PanelServer[]> {
    const response = await request<RestServerResponse[] | { servers: RestServerResponse[] }>(
      connection.url,
      ENDPOINTS.servers,
      { token: connection.token }
    );

    const servers = Array.isArray(response) ? response : response.servers ?? [];
    return servers.map(normalizeServer);
  },

  async getServer(connection: PanelConnection, serverId: string): Promise<PanelServer> {
    const response = await request<RestServerResponse>(
      connection.url,
      `${ENDPOINTS.servers}/${serverId}`,
      { token: connection.token }
    );

    return normalizeServer(response);
  },

  async startServer(connection: PanelConnection, serverId: string): Promise<ActionResult> {
    await request(connection.url, ENDPOINTS.serverAction(serverId, 'start'), {
      method: 'POST',
      token: connection.token,
    });

    return { success: true };
  },

  async stopServer(connection: PanelConnection, serverId: string): Promise<ActionResult> {
    await request(connection.url, ENDPOINTS.serverAction(serverId, 'stop'), {
      method: 'POST',
      token: connection.token,
    });

    return { success: true };
  },

  async restartServer(connection: PanelConnection, serverId: string): Promise<ActionResult> {
    await request(connection.url, ENDPOINTS.serverAction(serverId, 'restart'), {
      method: 'POST',
      token: connection.token,
    });

    return { success: true };
  },
};
