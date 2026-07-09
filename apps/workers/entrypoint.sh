set -e

echo "Starting Database Migration (Prisma DB Push)..."
npx prisma db push --schema=packages/db/prisma/schema.prisma

echo "Running Database Seed Script..."
node packages/db/dist/prisma/seed.js

echo "Starting Worker Service..."
exec node apps/workers/dist/index.js