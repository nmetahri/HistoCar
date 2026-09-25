FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV npm_config_update_notifier=false

FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
# Seul ce workspace est installé, et le cache npm survit aux builds : moins
# de téléchargements, donc moins d'exposition aux coupures réseau.
RUN --mount=type=cache,target=/root/.npm \
    npm ci -w packages/server --fetch-retries=5 --fetch-retry-maxtimeout=120000

FROM deps AS builder
COPY packages/server packages/server
RUN npm run prisma:generate -w packages/server \
 && npm run build -w packages/server

FROM deps AS prod-deps
RUN npm prune --omit=dev -w packages/server

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3001
COPY package.json ./
COPY packages/server/package.json packages/server/
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=builder /app/node_modules/.prisma node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client node_modules/@prisma/client
COPY --from=builder /app/packages/server/dist packages/server/dist
# Créé ici pour qu'un volume nommé vierge hérite du propriétaire node.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "packages/server/dist/index.js"]
