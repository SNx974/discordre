import crypto from 'crypto';
import { config } from '../config';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Override the body used for signature (default: JSON.stringify(body)) */
  rawBody?: string;
}

/**
 * Client HTTP vers l'API NestJS, avec signature HMAC sur tous les appels.
 * Le HMAC est calculé sur le body brut (string) envoyé.
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(baseUrl = config.api.url, secret = config.api.internalSecret) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.secret = secret;
  }

  async call<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = opts.method ?? 'POST';
    const raw = opts.rawBody ?? (opts.body !== undefined ? JSON.stringify(opts.body) : '');
    const signature = crypto.createHmac('sha256', this.secret).update(raw).digest('hex');

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-signature': signature,
      },
      body: method === 'GET' || method === 'DELETE' ? undefined : raw,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`API ${method} ${path} → ${res.status}: ${txt}`);
    }
    return (await res.json()) as T;
  }

  notifyChannelCreated(matchId: string, discordChannelId: string, guildId: string) {
    return this.call('/internal/bot/channel-created', {
      body: { matchId, discordChannelId, guildId },
    });
  }

  notifyScreenshotDetected(payload: {
    matchId: string;
    messageId: string;
    attachmentUrl: string;
    filename: string;
    authorDiscordId: string;
  }) {
    return this.call('/internal/bot/screenshot-detected', { body: payload });
  }
}

export const apiClient = new ApiClient();