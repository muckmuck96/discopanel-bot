import { EmbedBuilder, type APIEmbedField } from 'discord.js';
import type { PanelServer } from '../panel/types.js';
import type { ServerStatus } from '../types.js';

export const EMBED_COLORS = {
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  info: 0x5865f2,
  running: 0x57f287,
  stopped: 0xed4245,
  starting: 0xfee75c,
  stopping: 0xfee75c,
  unknown: 0x95a5a6,
} as const;

export const STATUS_ICONS: Record<ServerStatus, string> = {
  running: '🟢',
  stopped: '🔴',
  starting: '🟡',
  stopping: '🟡',
  unknown: '⚪',
};

export function getStatusColor(status: ServerStatus): number {
  return EMBED_COLORS[status] ?? EMBED_COLORS.unknown;
}

export function getStatusIcon(status: ServerStatus): string {
  return STATUS_ICONS[status] ?? STATUS_ICONS.unknown;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

export function formatPlayers(online: number | null, max: number | null): string {
  if (online === null) return 'N/A';
  if (max === null) return `${online}`;
  return `${online}/${max}`;
}

export function formatCpu(usage: number | null): string {
  if (usage === null) return 'N/A';
  return `${usage.toFixed(1)}%`;
}

export function formatMemory(usage: number | null): string {
  if (usage === null) return 'N/A';
  if (usage > 100) {
    return `${(usage / 1024).toFixed(1)} GB`;
  }
  return `${usage.toFixed(1)}%`;
}

export function formatTps(tps: number | null): string {
  if (tps === null) return 'N/A';
  return tps.toFixed(1);
}

export function formatStorage(used: number | null, total: number | null): string {
  if (used === null) return 'N/A';

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  if (total === null) {
    return formatBytes(used);
  }

  return `${formatBytes(used)} / ${formatBytes(total)}`;
}

export function successEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.success)
    .setTitle(`✅ ${title}`);

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.error)
    .setTitle(`❌ ${title}`);

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

export function warningEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.warning)
    .setTitle(`⚠️ ${title}`);

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.info)
    .setTitle(title);

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

export function serverStatusEmbed(server: PanelServer, fields: APIEmbedField[], updateIntervalSeconds?: number): EmbedBuilder {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  let footerText = `Last updated • Today at ${timeString}`;
  if (updateIntervalSeconds) {
    footerText += ` • Updates every ${updateIntervalSeconds}s`;
  }

  const embed = new EmbedBuilder()
    .setColor(getStatusColor(server.status))
    .setTitle(`${getStatusIcon(server.status)} ${server.name}`)
    .setFooter({ text: footerText });

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}

export function unreachableEmbed(serverName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EMBED_COLORS.warning)
    .setTitle(`⚠️ ${serverName}`)
    .setDescription('Unable to reach the panel')
    .setFooter({ text: 'Last updated' })
    .setTimestamp();
}

export function serverRemovedEmbed(serverName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(EMBED_COLORS.unknown)
    .setTitle(`🗑️ ${serverName}`)
    .setDescription('This server was deleted from the panel and has been unpinned.')
    .setFooter({ text: 'Removed' })
    .setTimestamp();
}
