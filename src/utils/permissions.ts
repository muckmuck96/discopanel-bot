import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { PermissionError } from '../errors.js';
import type { Database } from '../database/index.js';

export function hasAdminPermission(
  member: GuildMember | null,
  guildId: string,
  db: Database
): boolean {
  if (!member) {
    return false;
  }

  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  const guild = db.getGuild(guildId);
  if (guild?.admin_role_id) {
    return member.roles.cache.has(guild.admin_role_id);
  }

  return false;
}

export function requireAdminPermission(
  member: GuildMember | null,
  guildId: string,
  db: Database
): void {
  if (!hasAdminPermission(member, guildId, db)) {
    throw new PermissionError(
      'You need the **Manage Server** permission or the configured admin role to use this command.'
    );
  }
}
