import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, DiscordProfile } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Endpoint appelé par NextAuth après le callback Discord.
   * NextAuth a déjà validé le code OAuth, il nous envoie le profil.
   */
  @Post('discord')
  async loginWithDiscord(@Body() body: DiscordProfile) {
    return this.auth.loginWithDiscord(body);
  }

  /**
   * Vérifie la validité du JWT (utilisé par NextAuth au refresh de session).
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: any) {
    return this.auth.validateUser(req.user.sub);
  }
}