FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install -g pnpm@9.0.0 turbo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/workers/package.json ./apps/workers/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

COPY apps/workers/ ./apps/workers/

RUN npx turbo run build --filter=@matcha/prisma --filter=workers

FROM node:20-slim AS runner

RUN apt-get update && apt-get upgrade -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/workers/node_modules ./apps/workers/node_modules
COPY --from=builder /app/apps/workers/dist ./apps/workers/dist
COPY --from=builder /app/apps/workers/package.json ./apps/workers/package.json

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

USER node

CMD ["node", "apps/workers/dist/index.js"]