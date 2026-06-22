import { z } from 'zod';

// =====================================================================
//  Enums (mirror du schema Prisma)
// =====================================================================

export const GameType = z.enum(['CS2', 'VALORANT', 'LOL', 'DOTA2', 'ROCKET_LEAGUE', 'CUSTOM']);
export type GameType = z.infer<typeof GameType>;

export const MatchStatus = z.enum([
  'PENDING',
  'AWAITING_PLAYERS',
  'IN_PROGRESS',
  'RESULT_PENDING',
  'AWAITING_VALIDATION',
  'DISPUTED',
  'COMPLETED',
  'CANCELLED',
]);
export type MatchStatus = z.infer<typeof MatchStatus>;

export const MatchFormat = z.enum(['BO1', 'BO3', 'BO5']);
export type MatchFormat = z.infer<typeof MatchFormat>;

export const TeamSide = z.enum(['A', 'B']);
export type TeamSide = z.infer<typeof TeamSide>;

export const ResultSource = z.enum(['DISCORD', 'WEB']);
export type ResultSource = z.infer<typeof ResultSource>;

export const ResultStatus = z.enum(['PROCESSING', 'READY', 'VALIDATED', 'REJECTED']);
export type ResultStatus = z.infer<typeof ResultStatus>;

export const ValidationDecision = z.enum(['APPROVE', 'DISPUTE']);
export type ValidationDecision = z.infer<typeof ValidationDecision>;

// =====================================================================
//  DTOs
// =====================================================================

export const CreateMatchDto = z.object({
  game: GameType,
  format: MatchFormat.default('BO1'),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  scheduledAt: z.string().datetime().optional(),
  playerIds: z.object({
    A: z.array(z.string()).min(1).max(10),
    B: z.array(z.string()).min(1).max(10),
  }),
});
export type CreateMatchDto = z.infer<typeof CreateMatchDto>;

export const SubmitValidationDto = z.object({
  resultId: z.string().min(1),
  teamSide: TeamSide,
  decision: ValidationDecision,
  comment: z.string().max(500).optional(),
});
export type SubmitValidationDto = z.infer<typeof SubmitValidationDto>;

export const SubmitScreenshotDto = z.object({
  matchId: z.string().min(1),
  gameNumber: z.number().int().min(1).max(5).default(1),
  screenshotUrl: z.string().url(),
  source: ResultSource,
  submittedByDiscordId: z.string().optional(),
});
export type SubmitScreenshotDto = z.infer<typeof SubmitScreenshotDto>;

// =====================================================================
//  WebSocket events (client ↔ server)
// =====================================================================

export const WsEvents = {
  MATCH_MESSAGE_NEW: 'match:message:new',
  MATCH_MESSAGE_DEL: 'match:message:del',
  MATCH_TYPING: 'match:typing',
  MATCH_RESULT_UPDATE: 'match:result:update',
  MATCH_VALIDATION_UPDATE: 'match:validation:update',
  MATCH_STATUS_UPDATE: 'match:status:update',
  JOIN_MATCH_ROOM: 'match:room:join',
  LEAVE_MATCH_ROOM: 'match:room:leave',
} as const;
export type WsEventName = (typeof WsEvents)[keyof typeof WsEvents];

export interface WsMatchMessageNew {
  matchId: string;
  messageId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  attachments: Array<{ url: string; contentType?: string; filename: string }>;
  createdAt: string;
}

export interface WsResultUpdate {
  matchId: string;
  resultId: string;
  status: ResultStatus;
  scoreA?: number;
  scoreB?: number;
  winnerSide?: TeamSide | null;
  ocrConfidence?: number | null;
}

export interface WsValidationUpdate {
  matchId: string;
  resultId: string;
  teamSide: TeamSide;
  decision: ValidationDecision;
  matchStatus: MatchStatus;
}

// =====================================================================
//  Bot ↔ API internal contract (HMAC-protected)
// =====================================================================

export const InternalCreateChannelDto = z.object({
  matchId: z.string().min(1),
});
export type InternalCreateChannelDto = z.infer<typeof InternalCreateChannelDto>;

export const InternalScreenshotDetectedDto = z.object({
  matchId: z.string().min(1),
  messageId: z.string().min(1),
  attachmentUrl: z.string().url(),
  filename: z.string(),
  authorDiscordId: z.string(),
});
export type InternalScreenshotDetectedDto = z.infer<typeof InternalScreenshotDetectedDto>;