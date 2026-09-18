FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV npm_config_update_notifier=false
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN npm ci

FROM deps AS builder
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
COPY packages/web packages/web
RUN npm run build -w packages/web

FROM nginx:1.27-alpine AS runtime
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO /dev/null http://127.0.0.1/index.html || exit 1
