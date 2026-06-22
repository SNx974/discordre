# ===================================================================
#  Root Dockerfile — détecte le service via le nom du dossier
#  Utilisation :
#    docker build -f Dockerfile --build-arg SERVICE=api .
#    docker build -f Dockerfile --build-arg SERVICE=web .
#    docker build -f Dockerfile --build-arg SERVICE=bot .
# ===================================================================

ARG SERVICE=api

# ---------- Étape 1 : préparer le repo complet (toujours) ----------
FROM node:22-alpine AS base
RUN apk add --no-cache openssl curl
WORKDIR /repo
ENV CI=true \
    NPM_CONFIG_LOGLEVEL=warn

# ---------- Étape 2 : installer TOUTES les dépendances ----------
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/bot/package.json ./apps/bot/
COPY apps/web/package.json ./apps/web/
COPY prisma ./prisma
RUN npm ci

# ---------- Étape 3 : builder shared (commun à tous) ----------
FROM deps AS shared-build
COPY tsconfig.base.json* ./
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=@matchmaking/shared

# ---------- Étape 4 : builder le bon service ----------
FROM shared-build AS app-build

ARG SERVICE
COPY apps/${SERVICE}/ ./apps/${SERVICE}/

RUN case "${SERVICE}" in \
      api) npx prisma generate --schema=prisma/schema.prisma && \
           npm run build --workspace=@matchmaking/api ;; \
      web) npm run build --workspace=@matchmaking/web ;; \
      bot) npm run build --workspace=@matchmaking/bot ;; \
      *) echo "Unknown SERVICE: ${SERVICE}" && exit 1 ;; \
    esac

# ---------- Étape 5 : runtime (taille minimale) ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl curl tini

WORKDIR /app
ENV NODE_ENV=production

ARG SERVICE
ENV SERVICE=${SERVICE}

# Copier le code compilé du bon service
COPY --from=app-build /repo/prisma ./prisma
COPY --from=app-build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=app-build /repo/node_modules/@prisma ./node_modules/@prisma
COPY --from=app-build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=app-build /repo/packages/shared/package.json ./packages/shared/

# Code du service
COPY --from=app-build /repo/apps/${SERVICE}/dist ./dist
COPY --from=app-build /repo/apps/${SERVICE}/public ./public 2>/dev/null || true
COPY --from=app-build /repo/apps/${SERVICE}/.next/standalone ./ 2>/dev/null || true
COPY --from=app-build /repo/apps/${SERVICE}/.next/static ./apps/web/.next/static 2>/dev/null || true
COPY --from=app-build /repo/package.json ./package.json
COPY --from=deps /repo/node_modules ./node_modules

# Port et commande selon le service
RUN case "${SERVICE}" in \
      api) echo "API service" ;; \
      web) echo "WEB service" ;; \
      bot) echo "BOT service" ;; \
    esac

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD case "${SERVICE}" in \
        api) curl -fsS http://localhost:4000/health || exit 1 ;; \
        web) curl -fsS http://localhost:3000/ || exit 1 ;; \
        bot) pgrep -f "node dist/index.js" > /dev/null || exit 1 ;; \
      esac

# Commande de démarrage selon le service
ENTRYPOINT ["/sbin/tini", "--"]
CMD case "${SERVICE}" in \
      api) node dist/main.js ;; \
      web) node apps/web/server.js ;; \
      bot) node dist/index.js ;; \
    esac