import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaClient, MatchStatus, ResultStatus, TeamSide } from '@prisma/client';
import { QueueService } from '../queue/queue.service';
import { ChatGateway } from '../chat/chat.gateway';
import { InternalService } from '../internal/internal.service';

interface OcrExtraction {
  scoreA: number;
  scoreB: number;
  winnerSide: TeamSide | null;
  confidence: number;
  raw: unknown;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly openai?: OpenAI;
  private readonly provider: string;

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
    private readonly queue: QueueService,
    private readonly chat: ChatGateway,
    private readonly internal: InternalService,
  ) {
    this.provider = this.config.get<string>('OCR_PROVIDER') ?? 'gpt4o';
    if (this.provider === 'gpt4o') {
      this.openai = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
    }
  }

  /**
   * Déclenche le pipeline OCR pour un MatchResult déjà créé.
   */
  async processResult(resultId: string, screenshotUrl: string) {
    await this.queue.ocr('extract', { resultId, screenshotUrl });
  }

  /**
   * Worker interne — appelé par le processor BullMQ (à brancher).
   * Pour l'instant exposé en méthode publique, on l'invoquera depuis le worker.
   */
  async runOcrJob(payload: { resultId: string; screenshotUrl: string }) {
    const { resultId, screenshotUrl } = payload;

    const result = await this.prisma.matchResult.findUnique({
      where: { id: resultId },
      include: { match: true },
    });
    if (!result) {
      this.logger.warn(`OCR job: result ${resultId} not found`);
      return;
    }

    try {
      const extraction = await this.extract(screenshotUrl, result.match.game);

      await this.prisma.matchResult.update({
        where: { id: resultId },
        data: {
          scoreA: extraction.scoreA,
          scoreB: extraction.scoreB,
          winnerSide: extraction.winnerSide,
          ocrConfidence: extraction.confidence,
          ocrProvider: this.provider,
          rawOcrJson: extraction.raw as any,
          status: ResultStatus.READY,
        },
      });

      await this.prisma.match.update({
        where: { id: result.matchId },
        data: { status: MatchStatus.AWAITING_VALIDATION },
      });

      this.chat.emitResultUpdate({
        matchId: result.matchId,
        resultId,
        status: ResultStatus.READY,
        scoreA: extraction.scoreA,
        scoreB: extraction.scoreB,
        winnerSide: extraction.winnerSide,
        ocrConfidence: extraction.confidence,
      });

      await this.internal.notifyResultReady(result.matchId, resultId);
    } catch (err) {
      this.logger.error(`OCR failed for ${resultId}`, err);
      await this.prisma.matchResult.update({
        where: { id: resultId },
        data: {
          status: ResultStatus.READY,
          rawOcrJson: { error: (err as Error).message } as any,
        },
      });
    }
  }

  private async extract(imageUrl: string, game: string): Promise<OcrExtraction> {
    if (this.provider !== 'gpt4o' || !this.openai) {
      throw new Error(`OCR provider "${this.provider}" not configured`);
    }

    const prompt = `Tu es un extracteur de scores pour un screenshot de fin de partie e-sport (${game}).
Analyse l'image et extrais le score final des deux équipes.
Réponds UNIQUEMENT avec ce JSON, sans texte autour :
{
  "scoreA": <int>,
  "scoreB": <int>,
  "winnerSide": "A" | "B" | null,
  "confidence": <float 0..1>
}
Si tu ne peux pas lire l'image, mets confidence à 0 et winnerSide à null.`;

    const resp = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Lis le score de cette image.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 200,
    });

    const json = JSON.parse(resp.choices[0].message.content ?? '{}');
    return {
      scoreA: Number(json.scoreA) || 0,
      scoreB: Number(json.scoreB) || 0,
      winnerSide: json.winnerSide === 'A' || json.winnerSide === 'B' ? json.winnerSide : null,
      confidence: Number(json.confidence) || 0,
      raw: json,
    };
  }
}