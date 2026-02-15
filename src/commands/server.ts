import {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand, CommandContext } from '../types.js';
import { requireAdminPermission } from '../utils/permissions.js';
import {
  successEmbed,
  errorEmbed,
  infoEmbed,
  getStatusIcon,
  getStatusColor,
  formatPlayers,
  formatCpu,
  formatMemory,
  formatUptime,
} from '../utils/embeds.js';
import { handleCommandError } from '../utils/errorHandler.js';

export const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Control and view server information')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('start')
        .setDescription('Start a server')
        .addStringOption((option) =>
          option
            .setName('server')
            .setDescription('The server to start')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('stop')
        .setDescription('Stop a server')
        .addStringOption((option) =>
          option
            .setName('server')
            .setDescription('The server to stop')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('restart')
        .setDescription('Restart a server')
        .addStringOption((option) =>
          option
            .setName('server')
            .setDescription('The server to restart')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('List all pinned servers')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription('Get detailed server information')
        .addStringOption((option) =>
          option
            .setName('server')
            .setDescription('The server to get info for')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, ctx: CommandContext): Promise<void> {
    const { db, panelManager } = ctx;
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
      await panelManager.ensureGuildSetup(guildId);

      switch (subcommand) {
        case 'start':
          await handleStart(interaction, ctx);
          break;
        case 'stop':
          await handleStop(interaction, ctx);
          break;
        case 'restart':
          await handleRestart(interaction, ctx);
          break;
        case 'list':
          await handleList(interaction, ctx);
          break;
        case 'info':
          await handleInfo(interaction, ctx);
          break;
      }
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  async autocomplete(interaction: AutocompleteInteraction, ctx: CommandContext): Promise<void> {
    const { db } = ctx;
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.respond([]);
      return;
    }

    const focusedValue = interaction.options.getFocused().toLowerCase();
    const pinnedServers = db.getPinnedServers(guildId);

    const filtered = pinnedServers
      .filter((server) => server.server_name.toLowerCase().includes(focusedValue))
      .slice(0, 25)
      .map((server) => ({
        name: server.server_name,
        value: server.server_id,
      }));

    await interaction.respond(filtered);
  },
};

async function handleStart(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext
): Promise<void> {
  const guildId = interaction.guildId!;
  const serverId = interaction.options.getString('server', true);
  const { db, panelManager } = ctx;

  const pinnedServer = db.getPinnedServer(guildId, serverId);
  if (!pinnedServer) {
    await interaction.reply({
      embeds: [errorEmbed('Not Found', 'This server is not pinned.')],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const result = await panelManager.startServer(guildId, serverId);

  if (result.success) {
    await interaction.editReply({
      embeds: [successEmbed('Server Starting', `**${pinnedServer.server_name}** is starting.`)],
    });
  } else {
    await interaction.editReply({
      embeds: [
        errorEmbed('Start Failed', result.message ?? 'Failed to start the server.'),
      ],
    });
  }
}

async function handleStop(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext
): Promise<void> {
  const guildId = interaction.guildId!;
  const serverId = interaction.options.getString('server', true);
  const { db } = ctx;

  const pinnedServer = db.getPinnedServer(guildId, serverId);
  if (!pinnedServer) {
    await interaction.reply({
      embeds: [errorEmbed('Not Found', 'This server is not pinned.')],
      ephemeral: true,
    });
    return;
  }

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm:stop:${serverId}`)
    .setLabel('Confirm Stop')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

  await interaction.reply({
    embeds: [
      infoEmbed(
        'Confirm Stop',
        `Are you sure you want to stop **${pinnedServer.server_name}**?`
      ),
    ],
    components: [row],
    ephemeral: true,
  });
}

async function handleRestart(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext
): Promise<void> {
  const guildId = interaction.guildId!;
  const serverId = interaction.options.getString('server', true);
  const { db } = ctx;

  const pinnedServer = db.getPinnedServer(guildId, serverId);
  if (!pinnedServer) {
    await interaction.reply({
      embeds: [errorEmbed('Not Found', 'This server is not pinned.')],
      ephemeral: true,
    });
    return;
  }

  const confirmButton = new ButtonBuilder()
    .setCustomId(`confirm:restart:${serverId}`)
    .setLabel('Confirm Restart')
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

  await interaction.reply({
    embeds: [
      infoEmbed(
        'Confirm Restart',
        `Are you sure you want to restart **${pinnedServer.server_name}**?`
      ),
    ],
    components: [row],
    ephemeral: true,
  });
}

async function handleList(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext
): Promise<void> {
  const guildId = interaction.guildId!;
  const { db, panelManager } = ctx;

  await interaction.deferReply({ ephemeral: true });

  const pinnedServers = db.getPinnedServers(guildId);

  if (pinnedServers.length === 0) {
    await interaction.editReply({
      embeds: [
        infoEmbed(
          'No Pinned Servers',
          'No servers are pinned. Use `/pin` to select servers to monitor.'
        ),
      ],
    });
    return;
  }

  const serverStatuses: string[] = [];

  for (const pinned of pinnedServers) {
    try {
      const server = await panelManager.getServer(guildId, pinned.server_id);
      const icon = getStatusIcon(server.status);
      serverStatuses.push(`${icon} **${server.name}** - ${server.status}`);
    } catch {
      serverStatuses.push(`⚠️ **${pinned.server_name}** - Unreachable`);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('Pinned Servers')
    .setDescription(serverStatuses.join('\n'))
    .setFooter({ text: `${pinnedServers.length} server(s)` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleInfo(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext
): Promise<void> {
  const guildId = interaction.guildId!;
  const serverId = interaction.options.getString('server', true);
  const { db, panelManager } = ctx;

  const pinnedServer = db.getPinnedServer(guildId, serverId);
  if (!pinnedServer) {
    await interaction.reply({
      embeds: [errorEmbed('Not Found', 'This server is not pinned.')],
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const server = await panelManager.getServer(guildId, serverId);

  const embed = new EmbedBuilder()
    .setColor(getStatusColor(server.status))
    .setTitle(`${getStatusIcon(server.status)} ${server.name}`)
    .addFields(
      { name: 'Status', value: server.status, inline: true },
      { name: 'Version', value: server.mcVersion ?? 'N/A', inline: true },
      { name: 'Mod Loader', value: server.modLoader ?? 'Vanilla', inline: true },
      { name: 'Players', value: formatPlayers(server.playersOnline, server.playersMax), inline: true },
      { name: 'CPU', value: formatCpu(server.cpuUsage), inline: true },
      { name: 'RAM', value: formatMemory(server.memoryUsage), inline: true },
      { name: 'Uptime', value: server.uptime ? formatUptime(server.uptime) : 'N/A', inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
