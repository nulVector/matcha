import prisma, { ConnectionStatus } from '@matcha/prisma';
import {
  createRedisClient,
  MatchManager,
  UserDetailManager,
  UserConnectionManager,
  RedisClient
} from '@matcha/redis';
import { getDeterministicIds, MASTER_INTERESTS_LIST } from '@matcha/shared';
import { createId } from '@paralleldrive/cuid2';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error("Missing Environment variable.");

const cacheClient: RedisClient = createRedisClient(REDIS_URL, "CACHE");
const matchClient: RedisClient = createRedisClient(REDIS_URL, "MATCH");
const systemClient: RedisClient = createRedisClient(REDIS_URL, "SYSTEM");
const userDetailManager = new UserDetailManager(cacheClient);
const userConnectionManager = new UserConnectionManager(cacheClient);
const matchManager = new MatchManager(matchClient);

const TOTAL_USERS = 20000; 
const PAIR_BATCH_SIZE = 500; 
const BENGALURU_LAT = 12.9716;
const BENGALURU_LNG = 77.5946;

export async function seedFriendPairs(options: { withMatchProfile: boolean }) {
  const seedType = options.withMatchProfile ? 'App' : 'Messaging';
  console.time(`${seedType}SeedDuration`);
  await systemClient.del('artillery:users:queue');
  
  for (let i = 0; i < TOTAL_USERS; i += (PAIR_BATCH_SIZE * 2)) {
    const pairsToMake = Math.min(PAIR_BATCH_SIZE, (TOTAL_USERS - i) / 2);
    
    const dbUsers = [];
    const dbUserProfiles = [];
    const dbConnections = [];
    const dbMessages = [];
    const queueBatch: string[] = [];
    const redisPromises = [];
    
    for (let j = 0; j < pairsToMake; j++) {
      const userAId = createId();
      const profileAId = createId();
      const userBId = createId();
      const profileBId = createId();
      const connectionId = createId();
      const messageId = createId();
      const [u1, u2] = getDeterministicIds(profileAId, profileBId);

      let interestsA: string[] = [];
      let interestsB: string[] = [];

      if (options.withMatchProfile) {
        const numInterestsA = Math.floor(Math.random() * 8) + 3;
        interestsA = [...MASTER_INTERESTS_LIST].sort(() => 0.5 - Math.random()).slice(0, numInterestsA);
        const numInterestsB = Math.floor(Math.random() * 8) + 3;
        interestsB = [...MASTER_INTERESTS_LIST].sort(() => 0.5 - Math.random()).slice(0, numInterestsB);
      }

      dbUsers.push(
        { id: userAId, email: `${userAId}@gmail.com`, password: 'password' },
        { id: userBId, email: `${userBId}@gmail.com`, password: 'password' }
      );
      
      dbUserProfiles.push(
        { id: profileAId, userId: userAId, username: `userA_${profileAId.slice(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: BENGALURU_LAT, locationLongitude: BENGALURU_LNG, interest: interestsA },
        { id: profileBId, userId: userBId, username: `userB_${profileBId.slice(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: BENGALURU_LAT, locationLongitude: BENGALURU_LNG, interest: interestsB }
      );
      
      dbConnections.push({ id: connectionId, user1Id: u1, user2Id: u2, status: ConnectionStatus.FRIEND });
      dbMessages.push({ id: messageId, connectionId: connectionId, senderId: profileAId, content: "Load test message" });

      if (options.withMatchProfile) {
        redisPromises.push(
          userDetailManager.cacheProfile(profileAId, { locationLatitude: BENGALURU_LAT, locationLongitude: BENGALURU_LNG }),
          matchManager.updateMatchProfile(profileAId, BENGALURU_LAT, BENGALURU_LNG, interestsA),
          userConnectionManager.setUserStatus(profileAId),
          
          userDetailManager.cacheProfile(profileBId, { locationLatitude: BENGALURU_LAT, locationLongitude: BENGALURU_LNG }),
          matchManager.updateMatchProfile(profileBId, BENGALURU_LAT, BENGALURU_LNG, interestsB),
          userConnectionManager.setUserStatus(profileBId)
        );
      }

      queueBatch.push(`${userAId},${profileAId},${connectionId},${profileBId},${messageId}`);
      queueBatch.push(`${userBId},${profileBId},${connectionId},${profileAId},${messageId}`);
    }

    await prisma.user.createMany({ data: dbUsers, skipDuplicates: true });
    await prisma.userProfile.createMany({ data: dbUserProfiles, skipDuplicates: true });
    await prisma.connection.createMany({ data: dbConnections, skipDuplicates: true });
    await prisma.message.createMany({ data: dbMessages, skipDuplicates: true });
    
    redisPromises.push(systemClient.rpush('artillery:users:queue', ...queueBatch));
    await Promise.all(redisPromises);
  }
  console.log(`${seedType} Seeding complete.`);
  console.timeEnd(`${seedType}SeedDuration`);

  await prisma.$disconnect(); 
  await Promise.all([
    cacheClient.quit(),
    matchClient.quit(),
    systemClient.quit()
  ]); 
}