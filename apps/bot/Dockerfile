# ===================================================================
#  BOT — discord.js v14
# ===================================================================

# ---------- Dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/bot/package.json ./apps/bot/
RUN npm ci

# ---------- Build ----------
FROM deps AS build
WORKDIR /repo
COPY tsconfig.base.json* ./
COPY packages/shared/ ./packages/shared/
COPY apps/bot/ ./apps/bot/
RUN npm run build --workspace=@matchmaking/shared
RUN npm run build --workspace=@matchmaking/bot

# ---------- Runtime ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache curl tini
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/
COPY --from=build /repo/apps/bot/dist ./dist
COPY --from=build /repo/package.json ./package.json
COPY --from=deps /repo/node_modules ./node_modules

# tini pour une gestion propre des signaux (PID 1)
ENTRYPOINT ["/sbin/tini", "--"]

# Healthcheck : on vérifie que le process tourne
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD pgrep -f "node dist/index.js" > /dev/null || exit 1

CMD ["node", "dist/index.js"]