import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand, CommandContext } from '../types.js';
import { requireAdminPermission } from '../utils/permissions.js';
import { successEmbed, errorEmbed, infoEmbed } from '../utils/embeds.js';
import { handleCommandError } from '../utils/errorHandler.js';

export const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('pin')
    .setDescription('Select servers to monitor in this Discord server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const { db, panelManager } = ctx;
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member;
    if (member && 'permissions' in member) {
      requireAdminPermission(member, guildId, db);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const servers = await panelManager.listServers(guildId);

      if (servers.length === 0) {
        await interaction.editReply({
          embeds: [
            infoEmbed(
              'No Servers Found',
              'No servers were found on your DiscoPanel instance.'
            ),
          ],
        });
        return;
      }

      const pinnedServers = db.getPinnedServers(guildId);
      const pinnedIds = new Set(pinnedServers.map((s) => s.server_id));

      const options = servers.map((server) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(server.name)
          .setDescription(`Status: ${server.status}`)
          .setValue(server.id);

        if (pinnedIds.has(server.id)) {
          option.setDefault(true);
        }

        return option;
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('pin_servers')
        .setPlaceholder('Select servers to pin')
        .setMinValues(0)
        .setMaxValues(options.length)
        .addOptions(options);

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      const response = await interaction.editReply({
        embeds: [
          infoEmbed(
            'Select Servers',
            'Choose which servers to monitor. These servers will appear in the status channel and be available for control commands.'
          ),
        ],
        components: [row],
      });

      try {
        const selectInteraction = await response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          filter: (i) => i.user.id === interaction.user.id,
          time: 300000,
        });

        await selectInteraction.deferUpdate();

        const selectedIds = selectInteraction.values;
        const selectedServers = servers.filter((s) => selectedIds.includes(s.id));

        for (const pinned of pinnedServers) {
          if (!selectedIds.includes(pinned.server_id)) {
            db.deletePinnedServer(guildId, pinned.server_id);
          }
        }

        for (const server of selectedServers) {
          db.upsertPinnedServer(guildId, server.id, server.name);
        }

        if (selectedServers.length === 0) {
          await selectInteraction.editReply({
            embeds: [
              infoEmbed('Servers Unpinned', 'All servers have been unpinned.'),
            ],
            components: [],
          });
        } else {
          const serverList = selectedServers.map((s) => `• ${s.name}`).join('\n');
          await selectInteraction.editReply({
            embeds: [
              successEmbed(
                'Servers Pinned',
                `The following servers are now pinned:\n\n${serverList}\n\n` +
                  `Use \`/status-channel\` to set up the status display.`
              ),
            ],
            components: [],
          });
        }
      } catch {
        await interaction.editReply({
          embeds: [
            errorEmbed('Timed Out', 'Server selection timed out. Please try again.'),
          ],
          components: [],
        });
      }
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
