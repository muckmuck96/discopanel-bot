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
import { successEmbed, errorEmbed, infoEmbed, warningEmbed } from '../utils/embeds.js';
import { handleCommandError } from '../utils/errorHandler.js';
import { getFields } from '../status/fieldRegistry.js';

export const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure bot settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('admin-role')
        .setDescription('Set which role can use bot commands (besides Manage Server)')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('The admin role (leave empty to clear)')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status-config')
        .setDescription('Configure which fields appear in the status embed')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('disconnect')
        .setDescription('Remove panel connection and all data for this server')
    ),

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const { db } = ctx;
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();

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

    try {
      switch (subcommand) {
        case 'admin-role':
          await handleAdminRole(interaction, ctx);
          break;
        case 'status-config':
          await handleStatusConfig(interaction, ctx);
          break;
        case 'disconnect':
          await handleDisconnect(interaction, ctx);
          break;
      }
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};

async function handleAdminRole(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext
): Promise<void> {
  const guildId = interaction.guildId!;
  const { db } = ctx;

  const role = interaction.options.getRole('role');

  const guild = db.getGuild(guildId);
  if (!guild) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          'Not Configured',
          'Panel is not configured. Use `/setup` to connect your DiscoPanel instance first.'
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  db.updateAdminRole(guildId, role?.id ?? null);

  if (role) {
    await interaction.reply({
      embeds: [
        successEmbed(
          'Admin Role Set',
          `Members with the ${role} role can now use bot commands.`
        ),
      ],
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      embeds: [
        successEmbed(
          'Admin Role Cleared',
          'Only members with **Manage Server** permission can use bot commands now.'
        ),
      ],
      ephemeral: true,
    });
  }
}

async function handleStatusConfig(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext
): Promise<void> {
  const guildId = interaction.guildId!;
  const { db } = ctx;

  const guild = db.getGuild(guildId);
  if (!guild) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          'Not Configured',
          'Panel is not configured. Use `/setup` to connect your DiscoPanel instance first.'
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  const allFields = getFields();
  const currentSettings = db.parseStatusFields(guild.status_fields);

  const options = allFields.map((field) => {
    const isEnabled = currentSettings[field.id] ?? field.defaultEnabled;
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(field.label)
      .setDescription(`${field.emoji} ${isEnabled ? 'Currently enabled' : 'Currently disabled'}`)
      .setValue(field.id);

    if (isEnabled) {
      option.setDefault(true);
    }

    return option;
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('status_fields')
    .setPlaceholder('Select fields to display')
    .setMinValues(0)
    .setMaxValues(options.length)
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const response = await interaction.reply({
    embeds: [
      infoEmbed(
        'Status Fields',
        'Select which fields to display in the status embed.'
      ),
    ],
    components: [row],
    ephemeral: true,
  });

  try {
    const selectInteraction = await response.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === interaction.user.id,
      time: 300000,
    });

    await selectInteraction.deferUpdate();

    const selectedIds = new Set(selectInteraction.values);
    const newSettings: Record<string, boolean> = {};

    for (const field of allFields) {
      newSettings[field.id] = selectedIds.has(field.id);
    }

    db.updateStatusFields(guildId, newSettings);

    const enabledCount = selectInteraction.values.length;
    await selectInteraction.editReply({
      embeds: [
        successEmbed(
          'Status Fields Updated',
          `${enabledCount} field(s) will be displayed in the status embed.`
        ),
      ],
      components: [],
    });
  } catch {
    await interaction.editReply({
      embeds: [errorEmbed('Timed Out', 'Selection timed out. Please try again.')],
      components: [],
    });
  }
}

async function handleDisconnect(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext
): Promise<void> {
  const guildId = interaction.guildId!;
  const { db, panelManager } = ctx;

  const guild = db.getGuild(guildId);
  if (!guild) {
    await interaction.reply({
      embeds: [
        infoEmbed(
          'Not Connected',
          'This server is not connected to any DiscoPanel instance.'
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    embeds: [
      warningEmbed(
        'Confirm Disconnect',
        'Are you sure you want to disconnect from DiscoPanel?\n\n' +
          '**This will:**\n' +
          '• Remove the panel connection\n' +
          '• Unpin all servers\n' +
          '• Stop status updates\n' +
          '• Delete all stored data for this server\n\n' +
          'Type `/setup` to reconnect later.'
      ),
    ],
    ephemeral: true,
  });

  panelManager.disconnect(guildId);

  await interaction.followUp({
    embeds: [
      successEmbed(
        'Disconnected',
        'Successfully disconnected from DiscoPanel. All data has been removed.'
      ),
    ],
    ephemeral: true,
  });
}
