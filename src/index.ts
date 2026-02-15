import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { loadConfig } from './config.js';
import { createDatabase } from './database/index.js';
import { createPanelManager } from './panel/manager.js';
import { loadCommands } from './commands/_loader.js';
import { loadEvents } from './events/_loader.js';
import { loadStatusFields } from './status/fields/_loader.js';
import { createStatusUpdater } from './status/updater.js';
import { createLogger, setGlobalLogger } from './utils/logger.js';
import type { CommandContext } from './types.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logging.level);
  setGlobalLogger(logger);

  logger.info('Starting DiscoPanel Discord Bot...');

  const db = createDatabase();
  logger.info('Database initialized');

  loadStatusFields();
  logger.debug('Status fields loaded');

  const panelManager = createPanelManager(config, db);
  logger.debug('Panel manager initialized');

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  const ctx: CommandContext = {
    db,
    panelManager,
    config,
    client,
  };

  const commands = await loadCommands();
  logger.info(`Loaded ${commands.size} commands`);

  const rest = new REST().setToken(config.discord.token);

  try {
    logger.info('Registering slash commands...');
    const commandData = Array.from(commands.values()).map((cmd) => cmd.data.toJSON());

    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commandData,
    });

    logger.info('Slash commands registered successfully');
  } catch (error) {
    logger.error('Failed to register slash commands', error);
    process.exit(1);
  }

  await loadEvents(client, commands, ctx);
  logger.debug('Events loaded');

  try {
    await client.login(config.discord.token);
  } catch (error) {
    logger.error('Failed to login to Discord', error);
    process.exit(1);
  }

  client.once('ready', () => {
    const statusUpdater = createStatusUpdater(ctx);
    statusUpdater.start();
    logger.info('Status updater started');
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down...');
    client.destroy();
    db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
