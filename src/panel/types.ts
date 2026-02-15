import type { ApiStyle, ServerStatus } from '../types.js';

export interface PanelConnection {
  url: string;
  token: string;
  apiStyle: ApiStyle;
}

export interface AuthResult {
  token: string;
  expiresAt: number | null;
  apiStyle: ApiStyle;
}

export interface ActionResult {
  success: boolean;
  message?: string;
}

export interface PanelServer {
  id: string;
  name: string;
  status: ServerStatus;
  mcVersion: string | null;
  modLoader: string | null;
  playersOnline: number | null;
  playersMax: number | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
  uptime: number | null;
  tps: number | null;
  diskUsage: number | null;
  diskTotal: number | null;
}

export interface ConnectServerResponse {
  id: string;
  name: string;
  status: string;
  mcVersion?: string;
  modLoader?: string;
  playersOnline?: number;
  players?: number;
  playerCount?: number;
  online?: number;
  maxPlayers?: number;
  playersMax?: number;
  playerLimit?: number;
  slots?: number;
  cpuPercent?: number;
  cpu?: number;
  cpuUsage?: number;
  memoryUsage?: string;
  memory?: number;
  ram?: number;
  lastStarted?: string;
  tps?: number;
  motd?: string;
  serverVersion?: string;
  diskUsage?: string;
  diskTotal?: string;
}

export interface RestServerResponse {
  id: string;
  name: string;
  status: string;
  mcVersion?: string;
  modLoader?: string;
  playersOnline?: number;
  playersMax?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  uptime?: number;
}

export interface PanelAdapter {
  authenticate(url: string, username: string, password: string): Promise<AuthResult>;
  listServers(connection: PanelConnection): Promise<PanelServer[]>;
  getServer(connection: PanelConnection, serverId: string): Promise<PanelServer>;
  startServer(connection: PanelConnection, serverId: string): Promise<ActionResult>;
  stopServer(connection: PanelConnection, serverId: string): Promise<ActionResult>;
  restartServer(connection: PanelConnection, serverId: string): Promise<ActionResult>;
}
