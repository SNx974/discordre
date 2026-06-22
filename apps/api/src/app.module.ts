import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { MatchesModule } from './modules/matches/matches.module';
import { ResultsModule } from './modules/results/results.module';
import { ValidationsModule } from './modules/validations/validations.module';
import { InternalModule } from './modules/internal/internal.module';
import { HealthModule } from './modules/health/health.module';
import { ChatGatewayModule } from './modules/chat/chat.module';
import { QueueModule } from './modules/queue/queue.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    StorageModule,
    QueueModule,
    ChatGatewayModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    MatchesModule,
    ResultsModule,
    ValidationsModule,
    OcrModule,
    InternalModule,
    HealthModule,
  ],
})
export class AppModule {}