FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y libc6-compat openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install -g pnpm@9.0.0 turbo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

COPY apps/web/ ./apps/web/

RUN pnpm --filter @matcha/prisma run build
RUN pnpm --filter web run build

FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

USER node
CMD ["node", "apps/web/server.js"]