import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, TeamRole } from '@prisma/client';

export interface CreateTeamDto {
  name: string;
  tag: string;
  logoUrl?: string;
  captainDiscordId: string;
}

@Injectable()
export class TeamsService {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async create(dto: CreateTeamDto) {
    const captain = await this.prisma.user.findUnique({ where: { discordId: dto.captainDiscordId } });
    if (!captain) throw new BadRequestException('Captain user not found (must sign in first)');

    return this.prisma.team.create({
      data: {
        name: dto.name,
        tag: dto.tag,
        logoUrl: dto.logoUrl,
        members: {
          create: { userId: captain.id, role: TeamRole.CAPTAIN },
        },
      },
      include: { members: { include: { user: true } } },
    });
  }

  async addMember(teamId: string, discordId: string, role: TeamRole = TeamRole.PLAYER) {
    const user = await this.prisma.user.findUnique({ where: { discordId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.teamMembership.upsert({
      where: { userId_teamId: { userId: user.id, teamId } },
      update: { role },
      create: { userId: user.id, teamId, role },
    });
  }

  list() {
    return this.prisma.team.findMany({
      include: { members: { include: { user: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }
}