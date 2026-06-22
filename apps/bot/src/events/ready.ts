import { Events } from 'discord.js';
import { logger } from '../logger';
import type { Bot } from '../bot';

export function registerReady(bot: Bot) {
  bot.client.once(Events.ClientReady, (c) => {
    logger.info(`✅ Bot logged in as ${c.user.tag} (${c.user.id})`);
    logger.info(`   Serving ${c.guilds.cache.size} guild(s)`);
  });
}