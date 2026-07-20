import prisma from '@matcha/prisma';
import {
  createRedisClient,
  MatchManager,
  UserDetailManager,
  UserConnectionManager,
  RedisClient
} from '@matcha/redis';
import { createId } from '@paralleldrive/cuid2';
import { MASTER_INTERESTS_LIST } from '@matcha/shared';
import { env } from '../config/env';

const REDIS_URL = env.REDIS_URL;

const cacheClient: RedisClient = createRedisClient(REDIS_URL, "CACHE");
const matchClient: RedisClient = createRedisClient(REDIS_URL, "MATCH");
const systemClient: RedisClient = createRedisClient(REDIS_URL, "SYSTEM");
const userDetailManager = new UserDetailManager(cacheClient);
const userConnectionManager = new UserConnectionManager(cacheClient);
const matchManager = new MatchManager(matchClient);

const TOTAL_USERS = 20000;
const BATCH_SIZE = 1000;
const BENGALURU_LAT = 12.9716;
const BENGALURU_LNG = 77.5946;

async function seedData() {
  console.time('MatchmakingSeedDuration');
  await systemClient.del('artillery:users:queue');
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
      const shuffledInterests = [...MASTER_INTERESTS_LIST].sort(() => 0.5 - Math.random());
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
      
      redisPromises.push(userDetailManager.cacheProfile(userProfileId, { 
        locationLatitude: BENGALURU_LAT, 
        locationLongitude: BENGALURU_LNG 
      }));
      redisPromises.push(matchManager.updateMatchProfile(
        userProfileId, 
        BENGALURU_LAT, 
        BENGALURU_LNG, 
        userInterests
      ));
      redisPromises.push(userConnectionManager.setUserStatus(userProfileId));
    }
    
    await prisma.user.createMany({ data: dbUser, skipDuplicates: true });
    await prisma.userProfile.createMany({ data: dbUserProfiles, skipDuplicates: true });
    redisPromises.push(systemClient.rpush('artillery:users:queue', ...queueBatch));
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
    await Promise.all([
      cacheClient.quit(),
      matchClient.quit(),
      systemClient.quit()
    ]);
  });