import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient, ResultSource, ResultStatus, TeamSide } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { OcrService } from '../ocr/ocr.service';
import { InternalService } from '../internal/internal.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ResultsService {
  private readonly logger = new Logger(ResultsService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly ocr: OcrService,
    private readonly chat: ChatGateway,
    private readonly internal: InternalService,
    private readonly storage: StorageService,
  ) {}

  async createFromDiscord(payload: {
    matchId: string;
    messageId: string;
    attachmentUrl: string;
    filename: string;
    authorDiscordId: string;
  }) {
    // 1) Upload vers S3/R2 pour persistance
    const stored = await this.storage.uploadFromUrl(payload.attachmentUrl, payload.filename);

    // 2) Crée le MatchResult en PROCESSING
    const result = await this.prisma.matchResult.upsert({
      where: { matchId_gameNumber: { matchId: payload.matchId, gameNumber: 1 } },
      update: {
        screenshotUrl: stored.url,
        status: ResultStatus.PROCESSING,
      },
      create: {
        matchId: payload.matchId,
        gameNumber: 1,
        scoreA: 0,
        scoreB: 0,
        screenshotUrl: stored.url,
        source: ResultSource.DISCORD,
        status: ResultStatus.PROCESSING,
      },
    });

    // 3) Match → RESULT_PENDING
    await this.prisma.match.update({
      where: { id: payload.matchId },
      data: { status: 'RESULT_PENDING' as any },
    });

    // 4) Dispatch OCR
    await this.ocr.processResult(result.id, stored.url);

    return result;
  }

  async getByMatch(matchId: string) {
    return this.prisma.matchResult.findMany({
      where: { matchId },
      orderBy: { gameNumber: 'asc' },
      include: { validations: true },
    });
  }

  async findById(id: string) {
    const r = await this.prisma.matchResult.findUnique({
      where: { id },
      include: { validations: true },
    });
    if (!r) throw new NotFoundException('Result not found');
    return r;
  }
}