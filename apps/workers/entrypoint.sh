set -e

echo "Starting Database Migration (Prisma DB Push)..."
cd packages/db && npx prisma db push && cd ../..

echo "Running Database Seed Script..."
node packages/db/dist/prisma/seed.js

echo "Starting Worker Service..."
exec node apps/workers/dist/index.js