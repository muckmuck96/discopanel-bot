import type { Client, Interaction } from 'discord.js';
import { Events } from 'discord.js';
import type { BotCommand, CommandContext } from '../types.js';
import { handleCommandError } from '../utils/errorHandler.js';
import { getLogger } from '../utils/logger.js';

export async function loadEvents(
  client: Client,
  commands: Map<string, BotCommand>,
  ctx: CommandContext
): Promise<void> {
  const logger = getLogger();

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction, ctx);
      } catch (error) {
        await handleCommandError(interaction, error);
      }
      return;
    }

    if (interaction.isAutocomplete()) {
      const command = commands.get(interaction.commandName);

      if (!command?.autocomplete) {
        return;
      }

      try {
        await command.autocomplete(interaction, ctx);
      } catch (error) {
        logger.error('Autocomplete error:', error);
      }
      return;
    }

    if (interaction.isButton()) {
      const [action, context, id] = interaction.customId.split(':');

      if (action === 'confirm' && context && id) {
        await handleConfirmation(interaction, context, id, ctx);
        return;
      }

      if (action === 'cancel') {
        await interaction.update({
          content: 'Action cancelled.',
          embeds: [],
          components: [],
        });
        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
    }
  });

  client.on(Events.GuildDelete, async (guild) => {
    logger.info(`Removed from guild: ${guild.id}`);
    ctx.db.deleteGuild(guild.id);
  });
}

async function handleConfirmation(
  interaction: import('discord.js').ButtonInteraction,
  action: string,
  serverId: string,
  ctx: CommandContext
): Promise<void> {
  const logger = getLogger();

  await interaction.deferUpdate();

  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply({
        content: 'This command can only be used in a server.',
        embeds: [],
        components: [],
      });
      return;
    }

    let result;
    let actionPast: string;

    switch (action) {
      case 'stop':
        result = await ctx.panelManager.stopServer(guildId, serverId);
        actionPast = 'stopped';
        break;
      case 'restart':
        result = await ctx.panelManager.restartServer(guildId, serverId);
        actionPast = 'restarted';
        break;
      default:
        await interaction.editReply({
          content: 'Unknown action.',
          embeds: [],
          components: [],
        });
        return;
    }

    if (result.success) {
      await interaction.editReply({
        content: `✅ Server has been ${actionPast}.`,
        embeds: [],
        components: [],
      });
    } else {
      await interaction.editReply({
        content: `❌ Failed to ${action} server: ${result.message ?? 'Unknown error'}`,
        embeds: [],
        components: [],
      });
    }
  } catch (error) {
    logger.error('Confirmation handler error:', error);
    await interaction.editReply({
      content: '❌ An error occurred while processing your request.',
      embeds: [],
      components: [],
    });
  }
}
