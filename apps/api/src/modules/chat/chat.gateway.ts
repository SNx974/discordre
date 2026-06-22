import { Logger, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WsEvents, WsResultUpdate, WsValidationUpdate } from '@matchmaking/shared';
import { MatchStatus, TeamSide } from '@prisma/client';

@WebSocketGateway({
  cors: { origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    // Redis adapter pour scale horizontal (multi-instance)
    // Sera activé quand Redis sera branché en prod.
    // const { createAdapter } = require('@socket.io/redis-adapter');
    // const pubClient = new IORedis(...); const subClient = pubClient.duplicate();
    // this.server.adapter(createAdapter(pubClient, subClient));
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) throw new Error('No token');
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('NEXTAUTH_SECRET'),
      });
      client.data.userId = payload.sub;
      client.data.discordId = payload.discordId;
      this.logger.log(`WS connect: ${payload.discordId} (${client.id})`);
    } catch (e) {
      this.logger.warn(`WS auth failed for ${client.id}: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnect: ${client.id}`);
  }

  @SubscribeMessage(WsEvents.JOIN_MATCH_ROOM)
  onJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId: string }) {
    const room = `match:${body.matchId}`;
    client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage(WsEvents.LEAVE_MATCH_ROOM)
  onLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() body: { matchId: string }) {
    client.leave(`match:${body.matchId}`);
    return { ok: true };
  }

  /** Émet un nouveau message (utilisé par le bot via webhook) */
  emitMessageNew(matchId: string, payload: unknown) {
    this.server.to(`match:${matchId}`).emit(WsEvents.MATCH_MESSAGE_NEW, payload);
  }

  emitStatusUpdate(matchId: string, status: MatchStatus) {
    this.server.to(`match:${matchId}`).emit(WsEvents.MATCH_STATUS_UPDATE, { matchId, status });
  }

  emitResultUpdate(payload: WsResultUpdate) {
    this.server.to(`match:${payload.matchId}`).emit(WsEvents.MATCH_RESULT_UPDATE, payload);
  }

  emitValidationUpdate(payload: WsValidationUpdate) {
    this.server.to(`match:${payload.matchId}`).emit(WsEvents.MATCH_VALIDATION_UPDATE, payload);
  }
}