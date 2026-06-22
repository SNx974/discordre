import { Module, forwardRef } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { InternalModule } from '../internal/internal.module';
import { ChatGatewayModule } from '../chat/chat.module';

@Module({
  imports: [InternalModule, ChatGatewayModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}