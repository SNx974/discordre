import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient, MatchStatus, TeamSide, ValidationDecision } from '@prisma/client';
import { SubmitValidationDto } from '@matchmaking/shared';
import { ChatGateway } from '../chat/chat.gateway';
import { InternalService } from '../internal/internal.service';

@Injectable()
export class ValidationsService {
  private readonly logger = new Logger(ValidationsService.name);

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly chat: ChatGateway,
    private readonly internal: InternalService,
  ) {}

  async submit(dto: SubmitValidationDto, validatorDiscordId: string) {
    const validator = await this.prisma.user.findUnique({ where: { discordId: validatorDiscordId } });
    if (!validator) throw new BadRequestException('Validator not found');

    const result = await this.prisma.matchResult.findUnique({
      where: { id: dto.resultId },
      include: { match: { include: { players: true } } },
    });
    if (!result) throw new NotFoundException('Result not found');

    // Le validateur doit être dans la bonne team
    const isPlayer = result.match.players.some(
      (p) => p.userId === validator.id && p.teamSide === dto.teamSide,
    );
    if (!isPlayer) throw new BadRequestException('Not a player of this side');

    // Upsert (un seul vote par équipe par résultat)
    await this.prisma.matchValidation.upsert({
      where: { resultId_teamSide: { resultId: dto.resultId, teamSide: dto.teamSide } },
      update: { decision: dto.decision, comment: dto.comment, validatorId: validator.id },
      create: {
        matchId: result.matchId,
        resultId: dto.resultId,
        validatorId: validator.id,
        teamSide: dto.teamSide,
        decision: dto.decision,
        comment: dto.comment,
      },
    });

    // Cas DISPUTE → status match = DISPUTED + ping admin
    if (dto.decision === ValidationDecision.DISPUTE) {
      await this.prisma.match.update({
        where: { id: result.matchId },
        data: { status: MatchStatus.DISPUTED },
      });
      await this.internal.notifyValidationUpdate(result.matchId);
      this.chat.emitValidationUpdate({
        matchId: result.matchId,
        resultId: dto.resultId,
        teamSide: dto.teamSide,
        decision: dto.decision,
        matchStatus: MatchStatus.DISPUTED,
      });
      return { status: MatchStatus.DISPUTED };
    }

    // Cas APPROVE → check si les deux équipes ont APPROVE
    const validations = await this.prisma.matchValidation.findMany({
      where: { resultId: dto.resultId },
    });
    const bothApproved =
      validations.some((v) => v.teamSide === TeamSide.A && v.decision === ValidationDecision.APPROVE) &&
      validations.some((v) => v.teamSide === TeamSide.B && v.decision === ValidationDecision.APPROVE);

    if (bothApproved) {
      await this.prisma.matchResult.update({
        where: { id: dto.resultId },
        data: { status: 'VALIDATED' },
      });
      await this.prisma.match.update({
        where: { id: result.matchId },
        data: { status: MatchStatus.COMPLETED, finishedAt: new Date() },
      });
      await this.internal.notifyValidationUpdate(result.matchId);
      this.chat.emitValidationUpdate({
        matchId: result.matchId,
        resultId: dto.resultId,
        teamSide: dto.teamSide,
        decision: dto.decision,
        matchStatus: MatchStatus.COMPLETED,
      });
      return { status: MatchStatus.COMPLETED };
    }

    // Sinon le match reste AWAITING_VALIDATION
    const next = await this.prisma.match.update({
      where: { id: result.matchId },
      data: { status: MatchStatus.AWAITING_VALIDATION },
    });
    this.chat.emitValidationUpdate({
      matchId: result.matchId,
      resultId: dto.resultId,
      teamSide: dto.teamSide,
      decision: dto.decision,
      matchStatus: next.status,
    });
    return { status: next.status };
  }

  listForResult(resultId: string) {
    return this.prisma.matchValidation.findMany({ where: { resultId } });
  }
}