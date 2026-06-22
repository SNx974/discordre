import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

export interface DiscordProfile {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Upsert user à partir d'un profil Discord, puis retourne un JWT.
   * C'est ce que NextAuth appelle via notre endpoint /auth/discord/callback.
   */
  async loginWithDiscord(profile: DiscordProfile) {
    if (!profile.id) throw new UnauthorizedException('Discord profile missing id');

    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null;

    const user = await this.prisma.user.upsert({
      where: { discordId: profile.id },
      update: {
        username: profile.username,
        email: profile.email ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
      create: {
        discordId: profile.id,
        username: profile.username,
        email: profile.email,
        avatarUrl,
      },
    });

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      discordId: user.discordId,
    });

    return { accessToken, user };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}