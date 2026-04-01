import prisma, { ConnectionStatus } from '@matcha/prisma';
import { RedisManager } from '@matcha/redis';
import { createId } from '@paralleldrive/cuid2';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error("Missing Environment variable.");

const redisManager = new RedisManager(REDIS_URL);
const TOTAL_USERS = 20000; 
const PAIR_BATCH_SIZE = 500; 
const BENGALURU_LAT = 12.9716;
const BENGALURU_LNG = 77.5946;
const INTEREST_POOL = [
  'coding', 'movies', 'gym', 'anime', 'traveling', 
  'street food', 'photography', 'f1', 'badminton', 'pc gaming', 
];

async function seedRealWorldData() {
  console.time('RealWorldSeedDuration');
  await redisManager["redis"].del('artillery:users:queue');
  
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

      const numInterestsA = Math.floor(Math.random() * 8) + 3;
      const interestsA = [...INTEREST_POOL].sort(() => 0.5 - Math.random()).slice(0, numInterestsA);
      const numInterestsB = Math.floor(Math.random() * 8) + 3;
      const interestsB = [...INTEREST_POOL].sort(() => 0.5 - Math.random()).slice(0, numInterestsB);

      dbUsers.push(
        { id: userAId, email: `${userAId}@gmail.com`, password: 'password' },
        { id: userBId, email: `${userBId}@gmail.com`, password: 'password' }
      );
      dbUserProfiles.push(
        { id: profileAId, userId: userAId, username: `userA_${profileAId.slice(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: BENGALURU_LAT, locationLongitude: BENGALURU_LNG, interest: interestsA },
        { id: profileBId, userId: userBId, username: `userB_${profileBId.slice(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: BENGALURU_LAT, locationLongitude: BENGALURU_LNG, interest: interestsB }
      );
      dbConnections.push({ id: connectionId, user1Id: profileAId, user2Id: profileBId, status: ConnectionStatus.FRIEND });
      dbMessages.push({ id: messageId, connectionId: connectionId, senderId: profileAId, content: "Load test message" });

      redisPromises.push(
        redisManager.userDetail.cacheProfile(profileAId, { locationLatitude: BENGALURU_LAT, locationLongitude: BENGALURU_LNG }),
        redisManager.match.updateMatchProfile(profileAId, BENGALURU_LAT, BENGALURU_LNG, interestsA),
        redisManager.userConnection.setUserStatus(profileAId),
        
        redisManager.userDetail.cacheProfile(profileBId, { locationLatitude: BENGALURU_LAT, locationLongitude: BENGALURU_LNG }),
        redisManager.match.updateMatchProfile(profileBId, BENGALURU_LAT, BENGALURU_LNG, interestsB),
        redisManager.userConnection.setUserStatus(profileBId)
      );

      queueBatch.push(`${userAId},${profileAId},${connectionId},${profileBId},${messageId}`);
      queueBatch.push(`${userBId},${profileBId},${connectionId},${profileAId},${messageId}`);
    }

    await prisma.user.createMany({ data: dbUsers, skipDuplicates: true });
    await prisma.userProfile.createMany({ data: dbUserProfiles, skipDuplicates: true });
    await prisma.connection.createMany({ data: dbConnections, skipDuplicates: true });
    await prisma.message.createMany({ data: dbMessages, skipDuplicates: true });
    
    redisPromises.push(redisManager["redis"].rpush('artillery:users:queue', ...queueBatch));
    await Promise.all(redisPromises);
  }
  console.log(`Real-World Seeding complete.`);
  console.timeEnd('RealWorldSeedDuration');
}

seedRealWorldData()
  .catch((err) => { 
    console.error("Seeding failed:", err); 
    process.exit(1); 
  })
  .finally(async () => { 
    await prisma.$disconnect(); 
    await redisManager.quit(); 
  });