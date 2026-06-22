# Architecture — MATCHMAKING

Document de référence pour toute l'équipe. À mettre à jour à chaque décision structurante.

---

## 1. Stack technique

| Couche | Techno | Pourquoi |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + TypeScript + Tailwind | SSR, RSC, écosystème mature Discord OAuth |
| **Backend** | NestJS 10 + TypeScript | Structure modulaire (matches/teams/discord/ocr), DI, WebSocket gateway natif |
| **Base de données** | PostgreSQL 16 + Prisma 5 | Relationnel strict, types bout-en-bout, JSONB pour metadata Discord |
| **Cache / PubSub** | Redis 7 | Socket.io multi-instance + BullMQ |
| **WebSocket** | Socket.io (NestJS gateway + client) | Rooms par match, reconnexion auto, fallback HTTP |
| **Bot Discord** | discord.js v14 | Stabilité, intents, communauté massive |
| **OCR** | GPT-4o (primaire) + Google Cloud Vision (fallback) | GPT-4o gère les UI de jeux avec contexte |
| **Queue** | BullMQ sur Redis | Async OCR + dialogue bot↔API |
| **Storage** | S3-compatible (MinIO dev / R2 prod) | Screenshots persistants |
| **Auth** | NextAuth.js v4 (Discord provider) + Passport JWT côté API | SSO Discord naturel |
| **Monorepo** | npm workspaces (parce que pnpm pas dispo sur la machine) | Partage de types TS |

---

## 2. Modèle de données (Prisma)

11 entités principales :

```
User ──┬── Membership ── Team
       ├── MatchPlayer ─┐
       ├── Validation   │
       └── Submission   │
                       Match ──┬── Channel (Discord)
                              ├── Player (A|B)
                              ├── Result (screenshot + OCR + winner)
                              └── Validation (approve|dispute par équipe)

AdminAction (audit)
```

Détails dans `prisma/schema.prisma`.

### Statuts Match (state machine)

```
PENDING
   ↓ (bot crée le channel)
AWAITING_PLAYERS
   ↓ (premier joueur signe)
IN_PROGRESS
   ↓ (screenshot uploadé)
RESULT_PENDING  ─── OCR en cours
   ↓
AWAITING_VALIDATION  ─── les 2 équipes doivent valider
   ↓                  ↓
COMPLETED          DISPUTED  ─── admin intervient
   ↓
CANCELLED (à tout moment)
```

---

## 3. Flux principaux

### 3.1 Création d'un match

```
Web UI ──POST /matches──► API NestJS
                              │
                              ├── 1. Crée Match + MatchPlayers (Postgres)
                              ├── 2. Enqueue job BullMQ 'createChannel'
                              │
Bot Discord ◄── worker BullMQ ──┘
   │
   ├── 3. Crée TextChannel + overwrites
   ├── 4. Notifie API → /internal/bot/channel-created (HMAC)
   ├── 5. Envoie embed d'accueil
   └── 6. DM chaque joueur avec lien d'invitation
```

### 3.2 Détection d'un screenshot (Discord)

```
Joueur upload PNG dans channel match
   ↓
Bot (event messageCreate)
   ├── Filtre : channelId ∈ matchChannels
   ├── Filtre : attachment est une image
   ├── Réaction ⏳ sur le message
   └── POST /internal/bot/screenshot-detected (HMAC)
              ↓
API NestJS
   ├── 1. Upload S3/R2
   ├── 2. Crée MatchResult (status=PROCESSING)
   ├── 3. Match.status = RESULT_PENDING
   ├── 4. Enqueue job OCR
   └── 5. WebSocket broadcast (rooms match:{id})
```

### 3.3 OCR + validation

```
Worker OCR (BullMQ, dans l'API)
   ├── 1. GET image depuis S3/R2
   ├── 2. POST OpenAI Vision (GPT-4o) avec prompt par jeu
   ├── 3. Parse JSON {scoreA, scoreB, winnerSide, confidence}
   ├── 4. UPDATE MatchResult (status=READY)
   ├── 5. Match.status = AWAITING_VALIDATION
   └── 6. Job bot 'notifyResultReady'
              ↓
Bot Discord
   └── Embed avec screenshot + boutons Validate/Dispute
              ↓
Joueur clique
   └── POST /validations (JWT) ou bouton Discord (HMAC)
              ↓
API
   ├── Upsert MatchValidation
   ├── Si les 2 APPROVE → Match.status = COMPLETED
   ├── Si DISPUTE → Match.status = DISPUTED
   └── WebSocket broadcast validationUpdate
```

### 3.4 Chat miroir (Sprint 3)

```
Discord message ──► Bot
                     │
                     └── WebSocket emit match:message:new
                              ↓
                         Tous les clients web dans la room match:{id}
                              ↓
                         <ChatWindow> append
```

L'envoi depuis le web :
```
<ChatWindow> POST /matches/:id/messages
              ↓
         API → bot (BullMQ 'sendMessage')
              ↓
         Bot REST POST message dans le channel
```

---

## 4. Sécurité

| Vecteur | Mitigation |
|---|---|
| Discord : exposer un channel | Overwrites calculés dynamiquement par joueur |
| API : injection SQL | Prisma (paramétré) + Zod validation |
| API : usurpation bot → API | HMAC SHA-256 sur tous les endpoints `/internal/bot/*` |
| API : usurpation user → API | JWT NextAuth (signé, expiration 7j) |
| Upload : fichiers malveillants | Limite taille (5 MB), validation content-type |
| WebSocket : accès non-auth | Vérification JWT à la connexion, disconnect si invalide |
| CORS | Whitelist `NEXTAUTH_URL` uniquement |
| Headers HTTP | Helmet (CSP, HSTS, etc.) |

---

## 5. Sprints

Voir `README.md` pour le détail.

- **S1 (1-2 sem)** — Fondations ✅
- **S2 (2 sem)** — Matchs + channels Discord
- **S3 (2 sem)** — Chat temps réel + uploads
- **S4 (2-3 sem)** — OCR + validation mutuelle

---

## 6. Variables d'environnement (résumé)

| Var | Requis | Sprint |
|---|---|---|
| `DATABASE_URL` | ✅ | S1 |
| `REDIS_URL` | ✅ | S1 |
| `DISCORD_*` (5 vars) | ✅ | S1 |
| `NEXTAUTH_SECRET` | ✅ | S1 |
| `INTERNAL_API_SECRET` | ✅ | S2 |
| `S3_*` (5 vars) | ✅ | S3 |
| `OPENAI_API_KEY` | ✅ | S4 |
| `GOOGLE_CLOUD_VISION_KEY` | optionnel | S4 |