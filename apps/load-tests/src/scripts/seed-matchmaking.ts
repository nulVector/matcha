import prisma from '@matcha/prisma';
import { RedisManager } from '@matcha/redis';
import { createId } from '@paralleldrive/cuid2';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("Missing Environment variable.");
}

const redisManager = new RedisManager(REDIS_URL);
const TOTAL_USERS = 20000;
const BATCH_SIZE = 1000;
const BENGALURU_LAT = 12.9716;
const BENGALURU_LNG = 77.5946;
const INTEREST_POOL = [
  'coding', 'movies', 'gym', 'anime', 'traveling', 
  'street food', 'photography', 'f1', 'badminton', 'pc gaming', 
];

async function seedData() {
  console.time('MatchmakingSeedDuration');
  await redisManager["redis"].del('artillery:users:queue');
  for (let i = 0; i < TOTAL_USERS; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, TOTAL_USERS - i);
    const dbUser = [];
    const dbUserProfiles = [];
    const redisPromises = [];
    const queueBatch: string[] = [];
    
    for (let j = 0; j < batchSize; j++) {
      const userId = createId();
      const userProfileId = createId();
      queueBatch.push(`${userId},${userProfileId}`); 
      const numInterests = Math.floor(Math.random() * 8) + 3;
      const shuffledInterests = [...INTEREST_POOL].sort(() => 0.5 - Math.random());
      const userInterests = shuffledInterests.slice(0, numInterests);
      
      dbUser.push({
        id: userId,
        email: `${userId}@gmail.com`,
        password: `password`
      });
      dbUserProfiles.push({
        id: userProfileId,
        userId,
        username: `user_${userProfileId.slice(0, 6)}`,
        avatarUrl: '',
        location: 'Bengaluru',
        locationLatitude: BENGALURU_LAT,
        locationLongitude: BENGALURU_LNG,
        interest: userInterests
      });
      
      redisPromises.push(redisManager.userDetail.cacheProfile(userProfileId, { 
        locationLatitude: BENGALURU_LAT, 
        locationLongitude: BENGALURU_LNG 
      }));
      redisPromises.push(redisManager.match.updateMatchProfile(
        userProfileId, 
        BENGALURU_LAT, 
        BENGALURU_LNG, 
        userInterests
      ));
      redisPromises.push(redisManager.userConnection.setUserStatus(userProfileId));
    }
    
    await prisma.user.createMany({ data: dbUser, skipDuplicates: true });
    await prisma.userProfile.createMany({ data: dbUserProfiles, skipDuplicates: true });
    redisPromises.push(redisManager["redis"].rpush('artillery:users:queue', ...queueBatch));
    await Promise.all(redisPromises); 
  }
  console.log(`Seeding complete.`);
  console.timeEnd('MatchmakingSeedDuration');
}

seedData()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redisManager.quit(); 
  });