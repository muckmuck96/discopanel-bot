export class PanelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PanelError';
  }
}

export class PanelConnectionError extends PanelError {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PanelConnectionError';
  }
}

export class PanelAuthError extends PanelError {
  constructor(
    message: string = 'Authentication failed',
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'PanelAuthError';
  }
}

export class PanelTimeoutError extends PanelError {
  constructor(
    message: string = 'Request timed out',
    public readonly timeoutMs?: number
  ) {
    super(message);
    this.name = 'PanelTimeoutError';
  }
}

export class PanelNotConfiguredError extends PanelError {
  constructor(public readonly guildId: string) {
    super('Panel is not configured for this server. Use /setup to connect.');
    this.name = 'PanelNotConfiguredError';
  }
}

export class ServerNotFoundError extends PanelError {
  constructor(public readonly serverId: string) {
    super(`Server with ID "${serverId}" not found`);
    this.name = 'ServerNotFoundError';
  }
}

export class ServerActionError extends PanelError {
  constructor(
    public readonly action: string,
    public readonly serverId: string,
    message?: string
  ) {
    super(message ?? `Failed to ${action} server "${serverId}"`);
    this.name = 'ServerActionError';
  }
}

export class PermissionError extends Error {
  constructor(message: string = 'You do not have permission to use this command.') {
    super(message);
    this.name = 'PermissionError';
  }
}

export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly key?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}
