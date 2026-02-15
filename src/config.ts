import { ConfigurationError } from './errors.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppConfig {
  discord: {
    token: string;
    clientId: string;
  };
  encryption: {
    key: string | null;
  };
  status: {
    intervalSeconds: number;
    maxRetries: number;
    retryDelayMs: number;
  };
  logging: {
    level: LogLevel;
  };
  panel: {
    requestTimeoutMs: number;
    tokenRefreshBufferSeconds: number;
    url: string | null;
    username: string | null;
    password: string | null;
  };
  multiGuild: boolean;
}

const DEFAULT_CONFIG = {
  status: {
    intervalSeconds: 30,
    maxRetries: 3,
    retryDelayMs: 5000,
  },
  logging: {
    level: 'info' as LogLevel,
  },
  panel: {
    requestTimeoutMs: 10000,
    tokenRefreshBufferSeconds: 300,
  },
} as const;

const VALID_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function parseIntEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigurationError(`${key} must be a valid integer, got "${value}"`, key);
  }
  return parsed;
}

function parseLogLevel(value: string | undefined): LogLevel {
  if (!value) {
    return DEFAULT_CONFIG.logging.level;
  }
  const lower = value.toLowerCase() as LogLevel;
  if (!VALID_LOG_LEVELS.includes(lower)) {
    throw new ConfigurationError(
      `LOG_LEVEL must be one of: ${VALID_LOG_LEVELS.join(', ')}`,
      'LOG_LEVEL'
    );
  }
  return lower;
}

function validateEncryptionKey(key: string): void {
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new ConfigurationError(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32',
      'ENCRYPTION_KEY'
    );
  }
}

export function loadConfig(): AppConfig {
  const missingRequired: string[] = [];

  const discordToken = process.env['DISCORD_TOKEN'];
  const discordClientId = process.env['DISCORD_CLIENT_ID'];
  const encryptionKey = process.env['ENCRYPTION_KEY'] || null;
  const multiGuild = process.env['MULTI_GUILD']?.toLowerCase() === 'true';

  const panelUrl = process.env['PANEL_URL'] || null;
  const panelUsername = process.env['PANEL_USERNAME'] || null;
  const panelPassword = process.env['PANEL_PASSWORD'] || null;

  if (!discordToken) missingRequired.push('DISCORD_TOKEN');
  if (!discordClientId) missingRequired.push('DISCORD_CLIENT_ID');

  if (multiGuild) {
    if (!encryptionKey) missingRequired.push('ENCRYPTION_KEY');
  } else {
    if (!panelUrl) missingRequired.push('PANEL_URL');
    if (!panelUsername) missingRequired.push('PANEL_USERNAME');
    if (!panelPassword) missingRequired.push('PANEL_PASSWORD');
  }

  if (missingRequired.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missingRequired.join(', ')}`
    );
  }

  if (encryptionKey) {
    validateEncryptionKey(encryptionKey);
  }

  return {
    discord: {
      token: discordToken!,
      clientId: discordClientId!,
    },
    encryption: {
      key: encryptionKey,
    },
    status: {
      intervalSeconds: parseIntEnv('STATUS_INTERVAL', DEFAULT_CONFIG.status.intervalSeconds),
      maxRetries: parseIntEnv('STATUS_MAX_RETRIES', DEFAULT_CONFIG.status.maxRetries),
      retryDelayMs: parseIntEnv('STATUS_RETRY_DELAY', DEFAULT_CONFIG.status.retryDelayMs),
    },
    logging: {
      level: parseLogLevel(process.env['LOG_LEVEL']),
    },
    panel: {
      requestTimeoutMs: parseIntEnv('PANEL_REQUEST_TIMEOUT', DEFAULT_CONFIG.panel.requestTimeoutMs),
      tokenRefreshBufferSeconds: parseIntEnv(
        'PANEL_TOKEN_REFRESH_BUFFER',
        DEFAULT_CONFIG.panel.tokenRefreshBufferSeconds
      ),
      url: panelUrl,
      username: panelUsername,
      password: panelPassword,
    },
    multiGuild,
  };
}
