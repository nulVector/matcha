import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { INTERESTS } from '@matcha/shared';
import { LOCATIONS } from './data/locations';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing from environment variables!");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  console.log('Seeding database');
  console.log(`Populating Interests`);
  for (const item of INTERESTS) {
    await prisma.interest.upsert({
      where: { name: item.name },
      update: { category: item.category, emoji: item.emoji }, 
      create: item,
    });
  }
  console.log(`Populating Locations`);
  for (const loc of LOCATIONS) {
    await prisma.location.upsert({
      where: { name: loc.name },
      update: { latitude: loc.latitude, longitude: loc.longitude },
      create: loc,
    });
  }
  console.log('Populating Avatars');
  const avatarCount = 50;
  for (let i = 1; i <= avatarCount; i++) {
    const url = `https://api.dicebear.com/7.x/lorelei/svg?seed=matcha_${i}`;
    await prisma.avatar.upsert({
      where: { url: url },
      update: {}, 
      create: { url: url },
    });
  }
  console.log('Database seeding completed');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); 
  });