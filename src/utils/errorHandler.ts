import { MessageFlags, type ChatInputCommandInteraction, type MessageComponentInteraction } from 'discord.js';
import {
  PanelConnectionError,
  PanelAuthError,
  PanelTimeoutError,
  PanelNotConfiguredError,
  ServerNotFoundError,
  ServerActionError,
  PermissionError,
  ConfigurationError,
  EncryptionError,
} from '../errors.js';
import { errorEmbed } from './embeds.js';
import { getLogger } from './logger.js';

const ERROR_MESSAGES = {
  connection: 'Unable to connect to the panel. Please check if the panel is online.',
  auth: 'Authentication failed. Please run `/setup` again to reconnect.',
  timeout: 'The request timed out. Please try again.',
  notConfigured: 'Panel is not configured. Use `/setup` to connect your DiscoPanel instance.',
  serverNotFound: 'Server not found. It may have been removed from the panel.',
  permission: 'You do not have permission to use this command.',
  unknown: 'An unexpected error occurred. Please try again later.',
} as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof PanelNotConfiguredError) {
    return ERROR_MESSAGES.notConfigured;
  }

  if (error instanceof PanelAuthError) {
    return ERROR_MESSAGES.auth;
  }

  if (error instanceof PanelTimeoutError) {
    return ERROR_MESSAGES.timeout;
  }

  if (error instanceof PanelConnectionError) {
    return ERROR_MESSAGES.connection;
  }

  if (error instanceof ServerNotFoundError) {
    return ERROR_MESSAGES.serverNotFound;
  }

  if (error instanceof ServerActionError) {
    return error.message;
  }

  if (error instanceof PermissionError) {
    return error.message;
  }

  if (error instanceof ConfigurationError) {
    return `Configuration error: ${error.message}`;
  }

  if (error instanceof EncryptionError) {
    return 'Failed to process secure data. Please run `/setup` again.';
  }

  return ERROR_MESSAGES.unknown;
}

export async function handleCommandError(
  interaction: ChatInputCommandInteraction,
  error: unknown
): Promise<void> {
  const logger = getLogger();

  logger.error('Command error:', error);

  const message = getErrorMessage(error);

  const embed = errorEmbed('Error', message);

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  } catch (replyError) {
    logger.error('Failed to send error response:', replyError);
  }
}

export async function handleComponentError(
  interaction: MessageComponentInteraction,
  error: unknown
): Promise<void> {
  const logger = getLogger();

  logger.error('Component error:', error);

  const message = getErrorMessage(error);

  const embed = errorEmbed('Error', message);

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed], components: [] });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  } catch (replyError) {
    logger.error('Failed to send error response:', replyError);
  }
}
