import type { Client, Interaction } from 'discord.js';
import { Events, MessageFlags } from 'discord.js';
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
      const [prefix, action, id] = interaction.customId.split(':');

      if (prefix === 'server_action' && action && id) {
        await handleServerAction(interaction, action, id, ctx);
        return;
      }

      if (prefix === 'confirm' && action && id) {
        await handleConfirmation(interaction, action, id, ctx);
        return;
      }

      if (prefix === 'cancel') {
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

async function handleServerAction(
  interaction: import('discord.js').ButtonInteraction,
  action: string,
  serverId: string,
  ctx: CommandContext
): Promise<void> {
  const logger = getLogger();

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: '❌ This can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const disabledComponents = interaction.message.components.map((row) => ({
    type: row.type,
    components: row.components.map((btn) => ({
      ...btn.data,
      disabled: true,
    })),
  }));

  await interaction.update({ components: disabledComponents });

  try {
    let result;

    switch (action) {
      case 'start':
        result = await ctx.panelManager.startServer(guildId, serverId);
        break;
      case 'stop':
        result = await ctx.panelManager.stopServer(guildId, serverId);
        break;
      case 'restart':
        result = await ctx.panelManager.restartServer(guildId, serverId);
        break;
      default:
        await interaction.followUp({ content: '❌ Unknown action.', flags: MessageFlags.Ephemeral });
        return;
    }

    if (result.success) {
      await interaction.followUp({ content: `✅ Server ${action} request successful.`, flags: MessageFlags.Ephemeral });
      logger.info(`Server ${serverId} ${action} requested by ${interaction.user.tag} in guild ${guildId}`);
    } else {
      await interaction.followUp({
        content: `❌ Failed to ${action} server: ${result.message ?? 'Unknown error'}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    logger.error(`Failed to ${action} server ${serverId}:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    try {
      await interaction.followUp({ content: `❌ ${message}`, flags: MessageFlags.Ephemeral });
    } catch {
      logger.debug('Could not send error followUp');
    }
  }
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
