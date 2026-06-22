import { Bot } from './bot';
import { logger } from './logger';

async function main() {
  const bot = new Bot();
  try {
    await bot.start();
  } catch (err) {
    logger.fatal({ err }, 'Bot failed to start');
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down');
    bot.client.destroy();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down');
    bot.client.destroy();
    process.exit(0);
  });
}

main();