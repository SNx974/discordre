import { Events, Message, ChannelType } from 'discord.js';
import { logger } from '../logger';
import { apiClient } from '../services/api-client';
import type { Bot } from '../bot';
import { config } from '../config';

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

function isImageAttachment(url: string, contentType?: string | null): boolean {
  if (contentType?.startsWith('image/')) return true;
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.includes(ext);
}

export function registerMessageCreate(bot: Bot) {
  bot.client.on(Events.MessageCreate, async (message: Message) => {
    // Filtres de base
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.GuildText) return;

    try {
      // 1) Channel match ?
      const matchContext = bot.matchChannels.get(message.channel.id);
      if (!matchContext) return; // pas un channel de match, on ignore

      // 2) Détection d'image
      const images = message.attachments.filter((a) => isImageAttachment(a.url, a.contentType));
      if (images.size === 0) return;

      logger.info(
        `📸 Screenshot detected in match ${matchContext.matchId} (msg ${message.id}, ${images.size} image(s))`,
      );

      // 3) Réaction visuelle
      await message.react('⏳');

      // 4) Pour chaque image, notifier l'API
      for (const [, attachment] of images) {
        try {
          await apiClient.notifyScreenshotDetected({
            matchId: matchContext.matchId,
            messageId: message.id,
            attachmentUrl: attachment.url,
            filename: attachment.name,
            authorDiscordId: message.author.id,
          });
        } catch (err) {
          logger.error({ err }, 'Failed to notify API of screenshot');
          await message.react('❌');
        }
      }
    } catch (err) {
      logger.error({ err }, 'messageCreate handler crashed');
    }
  });
}