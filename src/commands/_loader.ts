import type { BotCommand } from '../types.js';
import { getLogger } from '../utils/logger.js';

export async function loadCommands(): Promise<Map<string, BotCommand>> {
  const logger = getLogger();
  const commands = new Map<string, BotCommand>();

  const modules = await Promise.all([
    import('./setup.js'),
    import('./pin.js'),
    import('./server.js'),
    import('./status-channel.js'),
    import('./settings.js'),
  ]);

  for (const module of modules) {
    const command = module.command as BotCommand;

    if (!command?.data?.name) {
      logger.warn('Invalid command module found');
      continue;
    }

    const name = command.data.name;
    commands.set(name, command);
    logger.debug(`Loaded command: ${name}`);
  }

  return commands;
}
