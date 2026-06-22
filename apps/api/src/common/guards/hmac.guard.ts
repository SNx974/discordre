import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

/**
 * HMAC guard pour les routes /internal/* (bot ↔ api)
 * Header requis : x-internal-signature: hex(HMAC-SHA256(secret, rawBody))
 */
@Injectable()
export class HmacGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const signature = req.headers['x-internal-signature'] as string | undefined;
    const secret = this.config.get<string>('INTERNAL_API_SECRET');

    if (!secret) throw new UnauthorizedException('Internal API secret not configured');
    if (!signature) throw new UnauthorizedException('Missing signature header');

    const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!valid) throw new UnauthorizedException('Invalid signature');

    return true;
  }
}