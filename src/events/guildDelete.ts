import { Events, type Guild } from 'discord.js';
import type { BotEvent, CommandContext } from '../types.js';
import { getLogger } from '../utils/logger.js';

export const event: BotEvent = {
  event: Events.GuildDelete,
  once: false,
  execute: async (guild: Guild, ctx: CommandContext) => {
    const logger = getLogger();
    logger.info(`Removed from guild: ${guild.id} (${guild.name})`);

    ctx.db.deleteGuild(guild.id);
    logger.debug(`Cleaned up data for guild ${guild.id}`);
  },
};
