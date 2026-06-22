import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { HmacGuard } from '../../common/guards/hmac.guard';
import { InternalService } from './internal.service';

@Controller('internal/bot')
@UseGuards(HmacGuard)
export class InternalController {
  constructor(private readonly internal: InternalService) {}

  /** Le bot confirme qu'il a créé le channel. */
  @Post('channel-created')
  onChannelCreated(@Body() body: { matchId: string; discordChannelId: string; guildId: string }) {
    return this.internal.onChannelCreated(body.matchId, body.discordChannelId, body.guildId);
  }

  /** Le bot détecte une image dans un channel match. */
  @Post('screenshot-detected')
  onScreenshot(@Body() body: any) {
    return this.internal.onScreenshotDetected(body);
  }
}