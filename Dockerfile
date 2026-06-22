# ===================================================================
#  Root Dockerfile — détecte le service via SERVICE build-arg
#  Usage :  docker build --build-arg SERVICE=api .
#           docker build --build-arg SERVICE=web .
#           docker build --build-arg SERVICE=bot .
# ===================================================================

ARG SERVICE=api

# ---------- Base ----------
FROM node:22-alpine AS base
RUN apk add --no-cache openssl curl
WORKDIR /repo
ENV CI=true \
    NPM_CONFIG_LOGLEVEL=warn

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/bot/package.json ./apps/bot/
COPY apps/web/package.json ./apps/web/
COPY prisma ./prisma
RUN npm ci

# ---------- Build shared ----------
FROM deps AS shared-build
COPY tsconfig.base.json* ./
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=@matchmaking/shared

# ---------- Build API ----------
FROM shared-build AS api-build
COPY apps/api/ ./apps/api/
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build --workspace=@matchmaking/api

# ---------- Build Web ----------
FROM shared-build AS web-build
COPY apps/web/ ./apps/web/
RUN npm run build --workspace=@matchmaking/web

# ---------- Build Bot ----------
FROM shared-build AS bot-build
COPY apps/bot/ ./apps/bot/
RUN npm run build --workspace=@matchmaking/bot

# ============================================================
#                    RUNTIMES
# ============================================================

# ---------- Runtime API ----------
FROM node:22-alpine AS runtime-api
RUN apk add --no-cache openssl curl
WORKDIR /app
ENV NODE_ENV=production PORT=4000

COPY --from=api-build /repo/prisma ./prisma
COPY --from=api-build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=api-build /repo/node_modules/@prisma ./node_modules/@prisma
COPY --from=api-build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=api-build /repo/packages/shared/package.json ./packages/shared/
COPY --from=api-build /repo/apps/api/dist ./dist
COPY --from=api-build /repo/package.json ./package.json
COPY --from=deps /repo/node_modules ./node_modules

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:4000/health || exit 1
CMD ["node", "dist/main.js"]

# ---------- Runtime Web ----------
FROM node:22-alpine AS runtime-web
RUN apk add --no-cache curl
WORKDIR /app
ENV NODE_ENV=production PORT=3000 NEXT_TELEMETRY_DISABLED=1

COPY --from=web-build /repo/apps/web/.next/standalone ./
COPY --from=web-build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build /repo/apps/web/public ./apps/web/public
COPY --from=web-build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=web-build /repo/packages/shared/package.json ./packages/shared/

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/ || exit 1
CMD ["node", "apps/web/server.js"]

# ---------- Runtime Bot ----------
FROM node:22-alpine AS runtime-bot
RUN apk add --no-cache curl tini
WORKDIR /app
ENV NODE_ENV=production

COPY --from=bot-build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=bot-build /repo/packages/shared/package.json ./packages/shared/
COPY --from=bot-build /repo/apps/bot/dist ./dist
COPY --from=bot-build /repo/package.json ./package.json
COPY --from=deps /repo/node_modules ./node_modules

ENTRYPOINT ["/sbin/tini", "--"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD pgrep -f "node dist/index.js" > /dev/null || exit 1
CMD ["node", "dist/index.js"]

# ---------- Final target (sélection via SERVICE) ----------
FROM runtime-${SERVICE} AS final