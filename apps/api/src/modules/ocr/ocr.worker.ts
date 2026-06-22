import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { OcrService } from './ocr.service';

@Injectable()
export class OcrWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OcrWorker.name);
  private worker!: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly ocr: OcrService,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    this.worker = new Worker(
      'ocr',
      async (job: Job<{ resultId: string; screenshotUrl: string }>) => {
        this.logger.log(`OCR job ${job.id} for result ${job.data.resultId}`);
        await this.ocr.runOcrJob(job.data);
        return { ok: true };
      },
      { connection: connection as any, concurrency: 2 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`OCR job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}