import type {
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  Events,
  Client,
} from 'discord.js';
import type { Database } from './database/index.js';
import type { PanelManager } from './panel/manager.js';
import type { AppConfig } from './config.js';

export interface CommandContext {
  db: Database;
  panelManager: PanelManager;
  config: AppConfig;
  client: Client;
}

export interface BotCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (interaction: ChatInputCommandInteraction, ctx: CommandContext) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction, ctx: CommandContext) => Promise<void>;
}

export interface BotEvent<E extends keyof BotEventHandlers = keyof BotEventHandlers> {
  event: E;
  once?: boolean;
  execute: BotEventHandlers[E];
}

export interface BotEventHandlers {
  [Events.ClientReady]: (client: Client<true>, ctx: CommandContext) => Promise<void>;
  [Events.InteractionCreate]: (
    interaction: ChatInputCommandInteraction | AutocompleteInteraction,
    ctx: CommandContext
  ) => Promise<void>;
  [Events.GuildDelete]: (
    guild: { id: string },
    ctx: CommandContext
  ) => Promise<void>;
}

export type ServerStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'unknown';

export type ApiStyle = 'connect' | 'rest' | 'auto';
