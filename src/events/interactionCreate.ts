import { Events, type Interaction } from 'discord.js';
import type { BotEvent, CommandContext } from '../types.js';
import { getLogger } from '../utils/logger.js';

export const event: BotEvent = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (_interaction: Interaction, _ctx: CommandContext) => {
    const logger = getLogger();
    logger.debug('Interaction received');
  },
};
