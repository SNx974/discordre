# API Conventions

## Auth

- **JWT** (Bearer token) sur toutes les routes `/api/*` sauf `/health` et `/auth/discord`
- **HMAC** (header `x-internal-signature`) sur toutes les routes `/internal/*`
- Le bot possède sa propre clé HMAC (`INTERNAL_API_SECRET`)

## DTOs

Tous validés par **Zod** (voir `packages/shared/src/index.ts`). Les DTOs sont importés depuis `@matchmaking/shared` côté API.

## Erreurs

Format uniforme (cf. `HttpExceptionFilter`) :
```json
{
  "statusCode": 400,
  "path": "/api/matches",
  "timestamp": "2026-06-22T...",
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Conventions REST

| Méthode | Route | Effet |
|---|---|---|
| GET | `/matches` | Liste paginée |
| GET | `/matches/:id` | Détail |
| POST | `/matches` | Créer (déclenche bot) |
| POST | `/matches/:id/cancel` | Annuler |
| GET | `/teams` | Liste |
| POST | `/teams` | Créer |
| GET | `/users/me` | User courant |
| POST | `/validations` | Voter sur un résultat |
| POST | `/internal/bot/channel-created` | Callback bot |
| POST | `/internal/bot/screenshot-detected` | Callback bot |

## WebSocket events

Rooms : `match:{matchId}` (auto-rejoint quand on ouvre la page match).

Émis par le serveur :
- `match:message:new` — nouveau message dans le channel
- `match:result:update` — score OCR mis à jour
- `match:validation:update` — un joueur a validé
- `match:status:update` — transition d'état

Reçus par le serveur :
- `match:room:join` / `match:room:leave`