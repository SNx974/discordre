# 🎮 Matchmaking — Plateforme E-sport avec sync Discord

Monorepo TypeScript : **Next.js** (web) + **NestJS** (API) + **discord.js** (bot) + **Prisma/PostgreSQL**.
Tout est synchronisé en temps réel via **Socket.io** et **BullMQ**.

---

## 📐 Architecture

Voir [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) pour le détail.

```
apps/
├── web/      Next.js 14 (App Router, NextAuth, Socket.io client)
├── api/      NestJS (REST + WebSocket + Prisma + BullMQ workers)
└── bot/      discord.js v14 (channel manager, screenshot detection, HMAC API client)

packages/
└── shared/   Types Zod partagés (DTOs, events WS, contrats internes)

infra/
└── docker-compose.yml   Postgres + Redis + MinIO

prisma/
└── schema.prisma        Modèle de données complet
```

---

## ⚡ Démarrage rapide

### 1. Pré-requis

- **Node.js ≥ 20** (testé sur 22)
- **Docker Desktop** (ou alternatives : Postgres + Redis + MinIO installés nativement)
- Une **app Discord** créée sur https://discord.com/developers/applications

### 2. Variables d'environnement

```bash
cp .env.example .env
```

Remplis au minimum :
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN` (depuis ton app Discord)
- `DISCORD_GUILD_ID` (clic droit sur ton serveur → "Copier l'identifiant du serveur")
- `NEXTAUTH_SECRET` (génère avec `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `INTERNAL_API_SECRET` (pareil)
- `OPENAI_API_KEY` (pour l'OCR Sprint 4)

### 3. Infrastructure (Postgres + Redis + MinIO)

```bash
npm run infra:up        # démarre les containers
npm run infra:logs      # voir les logs
```

Console MinIO dispo sur http://localhost:9001 (login: `minioadmin` / `minioadmin`).

### 4. Base de données

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
```

### 5. Démarrer les 3 apps en parallèle

```bash
npm run dev
```

- **Web** : http://localhost:3000
- **API** : http://localhost:4000 (+ Swagger sur http://localhost:4000/docs)
- **Bot** : connecté à Discord (vérifier les logs)

---

## 🧪 Tester le flow end-to-end

1. Va sur http://localhost:3000, connecte-toi avec Discord.
2. Crée une équipe (POST `/api/teams`) ou via Prisma Studio (`npm run prisma:studio`).
3. Crée un match (POST `/api/matches`) avec teamA/teamB + liste de joueurs (Discord IDs).
4. Le bot va créer un channel privé sur ton serveur Discord et DM chaque joueur avec un lien d'invitation.
5. Dans le channel, upload un screenshot de fin de partie → le bot réagit ⏳ puis l'OCR extrait le score.
6. Sur http://localhost:3000/matches/{id}, valide (✅) ou conteste (❌) le résultat.

---

## 🗂️ Scripts npm (à la racine)

| Script | Effet |
|---|---|
| `npm run dev` | Démarre les 3 apps en parallèle (api + web + bot) |
| `npm run build` | Build prod des 3 apps |
| `npm run typecheck` | TypeScript check sur les 3 apps |
| `npm run lint` | ESLint sur les 3 apps |
| `npm run prisma:generate` | Génère le client Prisma |
| `npm run prisma:migrate` | Crée/applique une migration |
| `npm run prisma:studio` | UI Prisma pour explorer la DB |
| `npm run infra:up` / `infra:down` | Start/stop Docker Compose |

---

## 🧱 Roadmap (Sprints)

- [x] **Sprint 1** — Fondations : auth Discord, schéma DB, monorepo, bots login
- [ ] **Sprint 2** — Gestion de matchs : CRUD + création channel Discord auto + DM invitations
- [ ] **Sprint 3** — Miroir chat temps réel + upload screenshots
- [ ] **Sprint 4** — OCR + validation mutuelle + admin force-validate

Voir `docs/ARCHITECTURE.md` pour les détails.

---

## 🔐 Sécurité

- **HMAC** sur toutes les routes `/internal/bot/*` (clé `INTERNAL_API_SECRET`)
- **JWT** sur toutes les routes user-facing (NextAuth côté web, JwtStrategy côté api)
- **CORS** limité à `NEXTAUTH_URL`
- **Helmet** activé côté API
- **Discord overwrites** calculés dynamiquement (pas de channel public accidentel)
- **Validation Zod** sur tous les DTOs entrants

---

## 📦 Stack

- **Frontend** : Next.js 14, Tailwind, shadcn-style, NextAuth, Socket.io client
- **Backend** : NestJS 10, Prisma 5, BullMQ 5, Passport-JWT, Swagger
- **Bot** : discord.js 14, BullMQ worker, pino logger
- **Infra** : PostgreSQL 16, Redis 7, MinIO (S3-compatible)

---

## 📝 License

MIT. Made for the love of the game. 🎮