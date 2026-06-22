import { Module } from '@nestjs/common';
import { ValidationsController } from './validations.controller';
import { ValidationsService } from './validations.service';
import { InternalModule } from '../internal/internal.module';
import { ChatGatewayModule } from '../chat/chat.module';

@Module({
  imports: [InternalModule, ChatGatewayModule],
  controllers: [ValidationsController],
  providers: [ValidationsService],
  exports: [ValidationsService],
})
export class ValidationsModule {}