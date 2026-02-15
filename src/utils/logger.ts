import type { LogLevel } from '../config.js';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

export function createLogger(minLevel: LogLevel): Logger {
  const minLevelValue = LOG_LEVELS[minLevel];

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= minLevelValue;
  }

  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', message), ...args);
      }
    },

    info(message: string, ...args: unknown[]): void {
      if (shouldLog('info')) {
        console.info(formatMessage('info', message), ...args);
      }
    },

    warn(message: string, ...args: unknown[]): void {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', message), ...args);
      }
    },

    error(message: string, ...args: unknown[]): void {
      if (shouldLog('error')) {
        console.error(formatMessage('error', message), ...args);
      }
    },
  };
}

let globalLogger: Logger | null = null;

export function getLogger(): Logger {
  if (!globalLogger) {
    return createLogger('info');
  }
  return globalLogger;
}

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}
