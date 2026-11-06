FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci --no-audit --no-fund
RUN npm run build --workspace usuarios-auth-service --workspace dispositivos-service --workspace recepcion-iot-service --workspace analisis-service --workspace alertas-service --workspace notificaciones-service --workspace api-gateway
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 10000
CMD ["node", "infra/start-render.mjs"]
