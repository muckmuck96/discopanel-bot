import { Events, type Client } from 'discord.js';
import type { BotEvent, CommandContext } from '../types.js';
import { getLogger } from '../utils/logger.js';

export const event: BotEvent = {
  event: Events.ClientReady,
  once: true,
  execute: async (client: Client<true>, _ctx: CommandContext) => {
    const logger = getLogger();
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);
  },
};
