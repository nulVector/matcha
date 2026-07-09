FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN npm install -g pnpm@9.0.0 turbo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY apps/socket/package.json ./apps/socket/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

COPY apps/socket/ ./apps/socket/

RUN npx turbo run build --filter=@matcha/prisma --filter=socket

FROM node:20-slim AS runner

RUN apt-get update && apt-get upgrade -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN rm -rf /usr/local/lib/node_modules/npm && rm -f /usr/local/bin/npm && rm -f /usr/local/bin/npx

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/socket/node_modules ./apps/socket/node_modules
COPY --from=builder /app/apps/socket/dist ./apps/socket/dist
COPY --from=builder /app/apps/socket/package.json ./apps/socket/package.json

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
EXPOSE 8080

USER node
CMD ["node", "apps/socket/dist/index.js"]