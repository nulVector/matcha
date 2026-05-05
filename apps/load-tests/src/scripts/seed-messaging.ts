import prisma, { ConnectionStatus } from '@matcha/prisma';
import { RedisManager } from '@matcha/redis';
import { getDeterministicIds } from '@matcha/shared';
import { createId } from '@paralleldrive/cuid2';

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error("Missing Environment variable.");

const redisManager = new RedisManager(REDIS_URL);
const TOTAL_USERS = 20000; 
const PAIR_BATCH_SIZE = 500; 

async function seedMessagingData() {
  console.time('MessagingSeedDuration');
  await redisManager["redis"].del('artillery:users:queue');
  
  for (let i = 0; i < TOTAL_USERS; i += (PAIR_BATCH_SIZE * 2)) {
    const pairsToMake = Math.min(PAIR_BATCH_SIZE, (TOTAL_USERS - i) / 2);
    const dbUsers = [];
    const dbUserProfiles = [];
    const dbConnections = [];
    const dbMessages = [];
    const queueBatch: string[] = [];
    
    for (let j = 0; j < pairsToMake; j++) {
      const userAId = createId();
      const profileAId = createId();
      const userBId = createId();
      const profileBId = createId();
      const connectionId = createId();
			const messageId = createId();
      const [u1, u2] = getDeterministicIds(profileAId,profileBId);
      dbUsers.push(
        { id: userAId, email: `${userAId}@gmail.com`, password: 'password' },
        { id: userBId, email: `${userBId}@gmail.com`, password: 'password' }
      );
      dbUserProfiles.push(
        { id: profileAId, userId: userAId, username: `userA_${profileAId.slice(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: 12.9716, locationLongitude: 77.5946, interest: [] },
        { id: profileBId, userId: userBId, username: `userB_${profileBId.slice(0, 6)}`, avatarUrl: '', location: 'Bengaluru', locationLatitude: 12.9716, locationLongitude: 77.5946, interest: [] }
      );
      dbConnections.push({
        id: connectionId,
        user1Id: u1,
        user2Id: u2,
        status: ConnectionStatus.FRIEND
      });
			dbMessages.push({
        id: messageId,
        connectionId: connectionId,
        senderId: profileAId, 
        content: "Load test message"
      });
      queueBatch.push(`${userAId},${profileAId},${connectionId},${profileBId},${messageId}`);
      queueBatch.push(`${userBId},${profileBId},${connectionId},${profileAId},${messageId}`);
		}

    await prisma.user.createMany({ data: dbUsers, skipDuplicates: true });
    await prisma.userProfile.createMany({ data: dbUserProfiles, skipDuplicates: true });
    await prisma.connection.createMany({ data: dbConnections, skipDuplicates: true });
		await prisma.message.createMany({ data: dbMessages, skipDuplicates: true });
    await redisManager["redis"].rpush('artillery:users:queue', ...queueBatch);
  }
  console.timeEnd('MessagingSeedDuration');
}

seedMessagingData()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redisManager.quit(); 
  });