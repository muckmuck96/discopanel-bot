import {
  SlashCommandBuilder,
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type TextChannel,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand, CommandContext } from '../types.js';
import { requireAdminPermission } from '../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../utils/embeds.js';
import { handleCommandError } from '../utils/errorHandler.js';

export const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('status-channel')
    .setDescription('Set the channel for auto-updating server status')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to post status updates (leave empty to disable)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const { db, panelManager, config } = ctx;
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const member = interaction.member;
    if (member && 'permissions' in member) {
      requireAdminPermission(member, guildId, db);
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = interaction.options.getChannel('channel') as TextChannel | null;

      await panelManager.ensureGuildSetup(guildId);

      const guild = db.getGuild(guildId);
      if (!guild) {
        const setupHint = config.multiGuild
          ? 'Use `/setup` to connect your DiscoPanel instance first.'
          : 'Panel connection failed. Check your environment variables.';
        await interaction.editReply({
          embeds: [
            errorEmbed('Not Configured', setupHint),
          ],
        });
        return;
      }

      const pinnedServers = db.getPinnedServers(guildId);
      if (pinnedServers.length === 0 && channel) {
        await interaction.editReply({
          embeds: [
            infoEmbed(
              'No Pinned Servers',
              'You need to pin servers first using `/pin` before setting up a status channel.'
            ),
          ],
        });
        return;
      }

      if (!channel) {
        db.updateStatusChannel(guildId, null);

        for (const server of pinnedServers) {
          db.updateStatusMessageId(guildId, server.server_id, null);
        }

        await interaction.editReply({
          embeds: [
            successEmbed(
              'Status Channel Disabled',
              'Auto-updating status has been disabled.'
            ),
          ],
        });
        return;
      }

      const botMember = interaction.guild?.members.me;
      if (botMember) {
        const permissions = channel.permissionsFor(botMember);
        if (!permissions?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
          await interaction.editReply({
            embeds: [
              errorEmbed(
                'Missing Permissions',
                `I need **View Channel**, **Send Messages**, and **Embed Links** permissions in ${channel}.`
              ),
            ],
          });
          return;
        }
      }

      db.updateStatusChannel(guildId, channel.id);

      for (const server of pinnedServers) {
        db.updateStatusMessageId(guildId, server.server_id, null);
      }

      await interaction.editReply({
        embeds: [
          successEmbed(
            'Status Channel Set',
            `Server status will now be displayed in ${channel}.\n\n` +
              `Status updates will appear within the next few seconds.`
          ),
        ],
      });
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
