import type { TextChannel, APIEmbedField, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import type { CommandContext } from '../types.js';
import type { PanelServer } from '../panel/types.js';
import { getEnabledFields } from './fieldRegistry.js';
import { serverStatusEmbed, unreachableEmbed, serverRemovedEmbed } from '../utils/embeds.js';
import { getLogger } from '../utils/logger.js';
import { ServerNotFoundError } from '../errors.js';
import { createActionButtons } from '../utils/actionButtons.js';

export interface StatusUpdater {
  start(): void;
  stop(): void;
  updateGuild(guildId: string): Promise<void>;
}

export function createStatusUpdater(ctx: CommandContext): StatusUpdater {
  const { db, panelManager, config, client } = ctx;
  const logger = getLogger();

  let intervalId: NodeJS.Timeout | null = null;

  function buildFields(server: PanelServer, settings: Record<string, boolean>): APIEmbedField[] {
    const enabledFields = getEnabledFields(settings);
    const fields: APIEmbedField[] = [];

    for (const field of enabledFields) {
      const value = field.extract(server);
      if (value !== null) {
        fields.push({
          name: `> ${field.label.toUpperCase()}`,
          value: `\`\`\`\n${value}\n\`\`\``,
          inline: field.inline,
        });
      }
    }

    return fields;
  }

  async function updateServer(
    guildId: string,
    serverId: string,
    serverName: string,
    statusMessageId: string | null,
    statusChannelId: string,
    statusFields: Record<string, boolean>,
    quickActionsEnabled: boolean
  ): Promise<void> {
    try {
      const channel = await client.channels.fetch(statusChannelId);
      if (!channel || !(channel instanceof Object) || !('send' in channel)) {
        logger.warn(`Status channel ${statusChannelId} not found or not a text channel`);
        return;
      }

      const textChannel = channel as TextChannel;

      let server: PanelServer | null = null;
      let embed;
      let serverRemoved = false;
      let actionRow: ActionRowBuilder<ButtonBuilder> | null = null;

      try {
        server = await panelManager.getServer(guildId, serverId);
        const fields = buildFields(server, statusFields);
        embed = serverStatusEmbed(server, fields, config.status.intervalSeconds);

        if (quickActionsEnabled) {
          actionRow = createActionButtons(serverId, server.status);
        }
      } catch (error) {
        if (error instanceof ServerNotFoundError) {
          serverRemoved = true;
          embed = serverRemovedEmbed(serverName);
          db.deletePinnedServer(guildId, serverId);
          logger.info(`Server "${serverName}" (${serverId}) was removed from panel, unpinned from guild ${guildId}`);
        } else {
          embed = unreachableEmbed(serverName);
        }
      }

      const messagePayload = {
        embeds: [embed],
        components: actionRow ? [actionRow] : [],
      };

      if (statusMessageId) {
        try {
          const message = await textChannel.messages.fetch(statusMessageId);
          await message.edit(messagePayload);

          if (serverRemoved) {
            setTimeout(async () => {
              try {
                await message.delete();
              } catch {
                logger.debug(`Could not delete removed server message ${statusMessageId}`);
              }
            }, 10000);
          }
          return;
        } catch {
          logger.debug(`Status message ${statusMessageId} not found, creating new one`);
        }
      }

      if (serverRemoved) {
        return;
      }

      const newMessage = await textChannel.send(messagePayload);
      db.updateStatusMessageId(guildId, serverId, newMessage.id);
    } catch (error) {
      logger.error(`Failed to update status for server ${serverId} in guild ${guildId}:`, error);
    }
  }

  async function updateGuild(guildId: string): Promise<void> {
    const guild = db.getGuild(guildId);
    if (!guild || !guild.status_channel_id) {
      return;
    }

    const pinnedServers = db.getPinnedServers(guildId);
    const statusFields = db.parseStatusFields(guild.status_fields);
    const quickActionsEnabled = guild.quick_actions_enabled === 1;

    for (const server of pinnedServers) {
      await updateServer(
        guildId,
        server.server_id,
        server.server_name,
        server.status_message_id,
        guild.status_channel_id,
        statusFields,
        quickActionsEnabled
      );
    }
  }

  async function updateAll(): Promise<void> {
    const guilds = db.getAllGuilds();

    for (const guild of guilds) {
      if (guild.status_channel_id) {
        await updateGuild(guild.guild_id);
      }
    }
  }

  return {
    start(): void {
      if (intervalId) {
        return;
      }

      const intervalMs = config.status.intervalSeconds * 1000;
      logger.info(`Starting status updater with ${config.status.intervalSeconds}s interval`);

      updateAll().catch((error) => {
        logger.error('Status update failed:', error);
      });

      intervalId = setInterval(() => {
        updateAll().catch((error) => {
          logger.error('Status update failed:', error);
        });
      }, intervalMs);
    },

    stop(): void {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info('Status updater stopped');
      }
    },

    async updateGuild(guildId: string): Promise<void> {
      await updateGuild(guildId);
    },
  };
}
