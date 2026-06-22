import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { OcrWorker } from './ocr.worker';
import { QueueModule } from '../queue/queue.module';
import { StorageModule } from '../storage/storage.module';
import { ChatGatewayModule } from '../chat/chat.module';
import { InternalModule } from '../internal/internal.module';

@Module({
  imports: [QueueModule, StorageModule, ChatGatewayModule, InternalModule],
  providers: [OcrService, OcrWorker],
  exports: [OcrService],
})
export class OcrModule {}