import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand, CommandContext } from '../types.js';
import { requireAdminPermission } from '../utils/permissions.js';
import { successEmbed, errorEmbed } from '../utils/embeds.js';

const MODAL_ID = 'setup_modal';

export const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Connect your DiscoPanel instance to this Discord server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const { db, config } = ctx;
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({
        embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    if (!config.multiGuild) {
      await interaction.reply({
        embeds: [errorEmbed('Disabled', 'This command is disabled in single-guild mode. The panel connection is configured via environment variables.')],
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member;
    if (member && 'permissions' in member) {
      requireAdminPermission(member, guildId, db);
    }

    const modal = new ModalBuilder()
      .setCustomId(MODAL_ID)
      .setTitle('DiscoPanel Setup');

    const urlInput = new TextInputBuilder()
      .setCustomId('panel_url')
      .setLabel('Panel URL')
      .setPlaceholder('http://localhost:8080 or https://panel.example.com')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const usernameInput = new TextInputBuilder()
      .setCustomId('username')
      .setLabel('Username')
      .setPlaceholder('Your DiscoPanel username')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const passwordInput = new TextInputBuilder()
      .setCustomId('password')
      .setLabel('Password')
      .setPlaceholder('Your DiscoPanel password')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(urlInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(passwordInput)
    );

    await interaction.showModal(modal);

    let modalInteraction: ModalSubmitInteraction;
    try {
      modalInteraction = await interaction.awaitModalSubmit({
        filter: (i) => i.customId === MODAL_ID && i.user.id === interaction.user.id,
        time: 300000,
      });
    } catch {
      return;
    }

    await modalInteraction.deferReply({ ephemeral: true });

    try {
      const panelUrl = modalInteraction.fields.getTextInputValue('panel_url');
      const username = modalInteraction.fields.getTextInputValue('username');
      const password = modalInteraction.fields.getTextInputValue('password');

      const result = await ctx.panelManager.setup(guildId, panelUrl, username, password);

      await modalInteraction.editReply({
        embeds: [
          successEmbed(
            'Connected!',
            `Successfully connected to DiscoPanel.\n\n` +
              `**Panel URL:** ${panelUrl}\n` +
              `**API Style:** ${result.apiStyle}\n` +
              `**Username:** ${username}\n\n` +
              `Use \`/pin\` to select servers to monitor.`
          ),
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      await modalInteraction.editReply({
        embeds: [errorEmbed('Connection Failed', message)],
      });
    }
  },
};
