import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection!: IORedis;

  /** Bot jobs : api → bot */
  public botQueue!: Queue;

  /** OCR jobs : api → ocr worker (dans la même api pour l'instant) */
  public ocrQueue!: Queue;

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    this.botQueue = new Queue('bot', { connection: this.connection as any });
    this.ocrQueue = new Queue('ocr', { connection: this.connection as any });

    this.logger.log(`Queues ready (Redis: ${redisUrl})`);
  }

  async onModuleDestroy() {
    await this.botQueue?.close();
    await this.ocrQueue?.close();
    await this.connection?.quit();
  }

  bot(name: string, data: unknown) {
    return this.botQueue.add(name, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    });
  }

  ocr(name: string, data: unknown) {
    return this.ocrQueue.add(name, data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { age: 3600, count: 500 },
      removeOnFail: { age: 86400 },
    });
  }

  constructor(private readonly config: ConfigService) {}
}