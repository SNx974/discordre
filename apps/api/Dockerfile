# ===================================================================
#  API — NestJS (contexte = apps/api/)
#  Ce Dockerfile fonctionne quand le contexte de build est apps/api/
#  Seul apps/api/ est copié, plus le schema Prisma et le shared package
# ===================================================================

# ---------- Base ----------
FROM node:22-alpine AS base
RUN apk add --no-cache openssl curl
WORKDIR /repo
ENV CI=true \
    NPM_CONFIG_LOGLEVEL=warn

# ---------- Dependencies ----------
FROM base AS deps
# Schéma Prisma (à la racine du repo : ../../prisma)
COPY ../../prisma ./prisma
# Packages shared (à la racine du repo : ../../packages/shared)
COPY ../../packages/shared/package.json ../../packages/shared/tsconfig.json ./packages/shared/
# Ce service
COPY package.json ./

# Installer toutes les deps (du repo entier via workspaces)
WORKDIR /repo
COPY ../../package.json ../../package-lock.json* ./
COPY ../../packages/shared/package.json ./packages/shared/
COPY ../../apps/api/package.json ./apps/api/
COPY ../../apps/bot/package.json ./apps/bot/
COPY ../../apps/web/package.json ./apps/web/
RUN npm ci --workspaces=false || npm install

# ---------- Build ----------
FROM deps AS build
WORKDIR /repo
COPY ../../tsconfig.base.json* ./
COPY ../../packages/shared/ ./packages/shared/
COPY . ./apps/api/

RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build --workspace=@matchmaking/shared
RUN npm run build --workspace=@matchmaking/api

# ---------- Runtime ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl curl
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

COPY --from=build /repo/prisma ./prisma
COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/package.json ./package.json
COPY --from=deps /repo/node_modules ./node_modules

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]