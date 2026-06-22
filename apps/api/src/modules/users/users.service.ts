import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  findByDiscordId(discordId: string) {
    return this.prisma.user.findUnique({ where: { discordId } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { memberships: { include: { team: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  list(limit = 50) {
    return this.prisma.user.findMany({ take: limit, orderBy: { createdAt: 'desc' } });
  }
}