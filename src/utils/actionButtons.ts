import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { ServerStatus } from '../types.js';

export const ACTION_BUTTON_PREFIX = 'server_action';

export function createActionButtons(
  serverId: string,
  status: ServerStatus
): ActionRowBuilder<ButtonBuilder> | null {
  const row = new ActionRowBuilder<ButtonBuilder>();

  if (status === 'stopped') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${ACTION_BUTTON_PREFIX}:start:${serverId}`)
        .setLabel('Start')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️')
    );
  } else if (status === 'running') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`${ACTION_BUTTON_PREFIX}:stop:${serverId}`)
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️'),
      new ButtonBuilder()
        .setCustomId(`${ACTION_BUTTON_PREFIX}:restart:${serverId}`)
        .setLabel('Restart')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄')
    );
  } else {
    return null;
  }

  return row;
}

export function parseActionButton(customId: string): {
  action: 'start' | 'stop' | 'restart';
  serverId: string;
} | null {
  const parts = customId.split(':');
  if (parts.length !== 3 || parts[0] !== ACTION_BUTTON_PREFIX) {
    return null;
  }

  const action = parts[1] as 'start' | 'stop' | 'restart';
  if (!['start', 'stop', 'restart'].includes(action)) {
    return null;
  }

  return {
    action,
    serverId: parts[2],
  };
}
