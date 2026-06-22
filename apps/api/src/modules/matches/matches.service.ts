import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient, GameType, MatchFormat, MatchStatus, TeamSide } from '@prisma/client';
import { CreateMatchDto } from '@matchmaking/shared';
import { InternalService } from '../internal/internal.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly internal: InternalService,
    private readonly chat: ChatGateway,
  ) {}

  /**
   * Crée un match + déclenche la création du channel Discord côté bot.
   */
  async create(dto: CreateMatchDto, createdByDiscordId: string) {
    if (dto.teamAId === dto.teamBId) throw new BadRequestException('A team cannot play itself');

    const creator = await this.prisma.user.findUnique({ where: { discordId: createdByDiscordId } });
    if (!creator) throw new BadRequestException('Creator not found');

    // 1) Création DB en transaction
    const match = await this.prisma.$transaction(async (tx) => {
      const m = await tx.match.create({
        data: {
          game: dto.game as GameType,
          format: (dto.format ?? 'BO1') as MatchFormat,
          teamAId: dto.teamAId,
          teamBId: dto.teamBId,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          status: MatchStatus.PENDING,
          players: {
            create: [
              ...dto.playerIds.A.map((discordId) => ({ teamSide: TeamSide.A, user: { connect: { discordId } } })),
              ...dto.playerIds.B.map((discordId) => ({ teamSide: TeamSide.B, user: { connect: { discordId } } })),
            ],
          },
        },
        include: {
          teamA: true,
          teamB: true,
          players: { include: { user: true } },
        },
      });
      return m;
    });

    // 2) Demande au bot de créer le channel Discord (fire-and-forget mais loggé)
    try {
      await this.internal.createDiscordChannel(match.id);
      await this.prisma.match.update({
        where: { id: match.id },
        data: { status: MatchStatus.AWAITING_PLAYERS },
      });
    } catch (err) {
      this.logger.error(`Bot failed to create channel for match ${match.id}`, err);
      // Le match reste PENDING, on pourra retry plus tard
    }

    // 3) Notifier les clients web (rooms par match pour le futur chat)
    this.chat.emitStatusUpdate(match.id, MatchStatus.AWAITING_PLAYERS);

    return this.findById(match.id);
  }

  async findById(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        teamA: true,
        teamB: true,
        players: { include: { user: true } },
        channel: true,
        results: { orderBy: { gameNumber: 'asc' } },
        validations: true,
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  list(status?: MatchStatus) {
    return this.prisma.match.findMany({
      where: status ? { status } : undefined,
      include: { teamA: true, teamB: true },
      orderBy: { scheduledAt: 'desc' },
      take: 100,
    });
  }

  async cancel(id: string, requesterDiscordId: string) {
    const match = await this.findById(id);
    await this.prisma.match.update({
      where: { id },
      data: { status: MatchStatus.CANCELLED, cancelledAt: new Date() },
    });
    await this.internal.archiveChannel(id);
    this.chat.emitStatusUpdate(id, MatchStatus.CANCELLED);
    this.logger.log(`Match ${id} cancelled by ${requesterDiscordId}`);
    return { ok: true };
  }

  async recordChannel(matchId: string, discordChannelId: string, guildId: string) {
    return this.prisma.discordChannel.upsert({
      where: { matchId },
      update: { discordChannelId, guildId },
      create: { matchId, discordChannelId, guildId },
    });
  }
}