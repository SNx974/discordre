import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatchesService } from '../matches/matches.service';
import { ResultsService } from '../results/results.service';
import { QueueService } from '../queue/queue.service';

/**
 * Façade que les modules métier utilisent pour parler au bot.
 * L'impl HTTP est dans InternalController (HMAC-protected).
 */
@Injectable()
export class InternalService {
  private readonly logger = new Logger(InternalService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly matches: MatchesService,
    private readonly results: ResultsService,
    private readonly queue: QueueService,
  ) {}

  async createDiscordChannel(matchId: string) {
    // Délègue au bot via la queue (le bot est un worker BullMQ)
    await this.queue.bot('createChannel', { matchId });
    this.logger.log(`Bot job enqueued: createChannel for match ${matchId}`);
  }

  async archiveChannel(matchId: string) {
    await this.queue.bot('archiveChannel', { matchId });
  }

  async postMatchEmbed(matchId: string) {
    await this.queue.bot('postMatchEmbed', { matchId });
  }

  async notifyResultReady(matchId: string, resultId: string) {
    await this.queue.bot('notifyResultReady', { matchId, resultId });
  }

  async notifyValidationUpdate(matchId: string) {
    await this.queue.bot('notifyValidationUpdate', { matchId });
  }

  /**
   * Appelé par le bot quand il a fini de créer le channel Discord
   * (callback /internal/bot/channel-created)
   */
  async onChannelCreated(matchId: string, discordChannelId: string, guildId: string) {
    await this.matches.recordChannel(matchId, discordChannelId, guildId);
  }

  /**
   * Appelé par le bot quand il détecte une image dans un channel match.
   * L'API se charge du téléchargement + OCR.
   */
  async onScreenshotDetected(payload: {
    matchId: string;
    messageId: string;
    attachmentUrl: string;
    filename: string;
    authorDiscordId: string;
  }) {
    // Crée un MatchResult PROCESSING et dispatch le job OCR
    await this.results.createFromDiscord(payload);
  }
}