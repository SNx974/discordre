import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../logger';
import { config } from '../config';
import type { Bot } from '../bot';

interface CreateChannelJob {
  matchId: string;
}

interface PostMatchEmbedJob {
  matchId: string;
}

interface ArchiveChannelJob {
  matchId: string;
}

interface NotifyResultReadyJob {
  matchId: string;
  resultId: string;
}

interface NotifyValidationUpdateJob {
  matchId: string;
}

type BotJob =
  | ({ name: 'createChannel' } & CreateChannelJob)
  | ({ name: 'postMatchEmbed' } & PostMatchEmbedJob)
  | ({ name: 'archiveChannel' } & ArchiveChannelJob)
  | ({ name: 'notifyResultReady' } & NotifyResultReadyJob)
  | ({ name: 'notifyValidationUpdate' } & NotifyValidationUpdateJob);

export function startBotWorker(bot: Bot) {
  const connection = new IORedis(config.redis.url, { maxRetriesPerRequest: null });

  const worker = new Worker(
    'bot',
    async (job: Job<BotJob>) => {
      logger.info({ jobId: job.id, name: job.name }, 'Processing bot job');

      switch (job.name) {
        case 'createChannel':
          await bot.handleCreateChannel((job.data as any).matchId);
          break;
        case 'postMatchEmbed':
          await bot.handlePostMatchEmbed((job.data as any).matchId);
          break;
        case 'archiveChannel':
          await bot.handleArchiveChannel((job.data as any).matchId);
          break;
        case 'notifyResultReady':
          await bot.handleNotifyResultReady((job.data as any).matchId, (job.data as any).resultId);
          break;
        case 'notifyValidationUpdate':
          await bot.handleNotifyValidationUpdate((job.data as any).matchId);
          break;
        default:
          logger.warn({ name: job.name }, 'Unknown job name');
      }

      return { ok: true };
    },
    { connection: connection as any, concurrency: 4 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Bot job failed');
  });
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Bot job completed');
  });

  return worker;
}