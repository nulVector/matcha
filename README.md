# Matcha

Live: [trymatcha.in](https://trymatcha.in)

Matcha is a full-stack anonymous chat app that pairs strangers in real time using a vector-similarity matchmaking engine instead of random pairing.

Every user is embedded into an interest vector after onboarding. When they join the queue, the API runs a Redis HNSW k-nearest-neighbor search (geo-filtered) to find the closest match by shared interests, locking the pair with an optimistic-locking transaction so two workers can never double-book the same person.

The Next.js UI connects to a horizontally scalable WebSocket layer backed by Redis pub/sub. Behind the scenes, a BullMQ-driven worker fleet handles emails, cron jobs, and a buffered write-behind cache to Postgres. The entire monorepo ships production-ready with its own zero-downtime CI/CD pipeline, Docker Compose deployment, and a Prometheus/Grafana observability stack.

## Architecture

```mermaid
flowchart LR
  subgraph client["Client"]
    Browser["User Browser"]
  end

  subgraph edge["Edge"]
    CF["Cloudflare Tunnel"]
  end

  subgraph app["Application Layer"]
    Web["Next.js Web Server"]
    API["API Service (Express 5)"]
    Socket["Socket Service (ws)"]
    Workers["Workers (BullMQ + Match Loop)"]
  end

  subgraph data["Data Layer"]
    Postgres[("PostgreSQL\n(Prisma)")]
    Redis[("Redis Stack\nHNSW + Bloom + PubSub")]
  end

  subgraph obs["Observability"]
    Prom["Prometheus"]
    Grafana["Grafana"]
  end

  %% Client to Edge
  Browser -->|"HTTPS / WSS"| CF

  %% Edge Routing
  CF -->|"UI rendering"| Web
  CF -->|"/api/v1/*"| API
  CF -.->|"WebSocket upgrade"| Socket
  CF -->|"Admin dashboards"| Grafana

  %% Application to Data
  API -->|"Reads/Writes (users, connections)"| Postgres
  API -->|"FT.SEARCH KNN (matchmaking)\nSession cache, Bloom filters"| Redis
  API ==>|"Enqueue job (email, match cleanup)"| Redis

  Socket -->|"Publish/Subscribe chat_router"| Redis
  Socket -->|"Session & Presence validation"| Redis
  Socket -.->|"Handle dropped match / fallback"| Postgres

  %% Workers
  Redis ==>|"Dequeue Jobs / Continuous Polling"| Workers
  Workers -->|"Send emails, match cron,\nbuffered DB writes"| Postgres
  Workers -->|"Lock matches, publish system events"| Redis

  %% Observability
  API -->|"/metrics"| Prom
  Socket -->|"/metrics"| Prom
  Workers -->|"/metrics"| Prom
  Prom -->|"Data Source"| Grafana
```

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Framer Motion, Lenis, Zustand, TanStack Query, React Hook Form |
| **API & Monolith** | Node.js, Express 5, Passport (Local, Google OAuth 2.0, JWT), Helmet, Zod validation |
| **Real-time Engine** | `ws` (raw WebSockets), Redis Pub/Sub for cross-instance routing |
| **Matchmaking & Cache** | Redis Stack — HNSW vector search (`FT.SEARCH`), geo-filtering, RedisBloom |
| **Async Queues** | BullMQ (task queues, DB write-behind buffer, cron, DLQ), Bull Board (`@bull-board/express` monitoring UI) |
| **Database** | PostgreSQL, Prisma ORM |
| **Email Subsystem** | Resend API, React Email (`@react-email/render`) |
| **Observability** | Pino / `pino-http` (structured logging), Prometheus (`prom-client`), Grafana, redis-exporter, postgres-exporter, node-exporter |
| **Testing** | Vitest + Testcontainers (Dockerized Postgres/Redis), Artillery (scenario-driven load tests) |
| **Infra & DevOps** | Docker, Docker Compose, Cloudflare Tunnel, GitHub Actions CI/CD |
| **Monorepo Tooling** | Turborepo, pnpm workspaces, TypeScript 5.9, ESLint 9, `@matcha/env` (boot-time Zod validator) |

## Local setup

**Prerequisites:** Node.js ≥18, pnpm, Docker.

```bash
# 1. Clone and install
git clone https://github.com/nulVector/matcha.git
cd matcha
pnpm install

# 2. Configure environment
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, REDIS_URL, GOOGLE_CLIENT_ID/SECRET, RESEND_API_KEY, etc.

# 3. Start Postgres + Redis Stack and set up the database
pnpm docker:dev:setup

# 4. Run everything (web, api, socket, workers) in dev mode
pnpm dev
```

## Testing & Load Verification

### Integration Tests (Testcontainers)
Runs isolated, non-mocked tests against ephemeral PostgreSQL and Redis containers via `testcontainers`.

```bash
# Run full suite using Vitest + Testcontainers
pnpm test
```

### Scenario Load Testing (Artillery)
Stress-tests WebSocket heartbeats, messaging, receipts, and Redis matchmaking under high concurrency. 

```bash
# 1. Configure the test environment
cp .env.example .env.test
# Note: Open .env.test and change the following variables:
# - ARTILLERY_TEST="true"
# - DATABASE_URL="postgresql://test_user:test_password@localhost:5433/matcha_test"
# - REDIS_URL="redis://127.0.0.1:6380"

# 2. Start the test infrastructure (Postgres + Redis Stack)
pnpm docker:test:setup

# 3. Seed the databases for your target scenario
pnpm loadtest test:seed-app
# Available seeds: seed-app, seed-matchmaking, seed-messaging

# 4. Start the application in test mode (RUN IN A NEW TAB)
pnpm dev:test

# 5. Execute the Artillery scenario
pnpm run loadtest test:heartbeats -- -e smoke
# Available scenarios: heartbeats, messaging, receipts, matchmaking, real-world
# Available environments: smoke, capacity, endurance, flood, chaos, extreme, soak

# 6. Teardown test infrastructure when finished
pnpm docker:test:down
```

## What I built vs. what's scaffolded

The monorepo shell (Turborepo config, pnpm workspaces, shared ESLint/TypeScript configs) started from the standard `create-turbo` starter. Everything on top of that shell is custom:

- **Built from scratch:**
  - **Frontend UI:** Next.js 16 / React 19 architecture featuring Tailwind CSS 4, `shadcn/ui`, Zustand, and TanStack Query.
  - **Matchmaking & Real-time:** The HNSW vector generation + KNN search engine (with optimistic-lock pairing) and the custom WebSocket presence/chat layer.
  - **Async & Data:** All BullMQ producers/consumers and DLQ workflows, plus the complete Prisma schema and auth flows (local + Google OAuth, sliding sessions, JWTs).
  - **Infrastructure:** Rate limiting, idempotency middleware, a full observability stack (Pino, Prometheus, custom Grafana dashboards, Bull Board UI), and a zero-downtime CI/CD deployment pipeline.
  - **Tooling:** Artillery load test scenarios, Testcontainers integration suite, custom React Email templates, and the strict `@matcha/env` boot-time validator.
- **Scaffolded/off-the-shelf:** The Turborepo/pnpm workspace foundation, Next.js / Tailwind CSS v4 project bootstrap, `shadcn/ui` component generation, plug-and-play observability containers (Prometheus, Grafana, Exporters), and standard ecosystem libraries utilized as intended (Zod, Prisma, BullMQ, Passport, Helmet, Pino).