import Redis from "ioredis";
import { MASTER_INTERESTS, UserStatus } from "../common";

export class MatchManager {
  constructor (private redis:Redis) {}
  private parseRedisSearchResults(results: any[]) {
    const parsedMatches = [];
    for (let i = 1; i < results.length; i += 2) {
      const rawKey = results[i] as string;
      const rawProps = results[i + 1] as string[];
      const id = rawKey.replace("user:profile:", "");
      const propsMap: Record<string, any> = {};
      for (let j = 0; j < rawProps.length; j += 2) {
        const key = rawProps[j];
        const value = rawProps[j + 1];
        if (typeof key === 'string') {
          propsMap[key] = value;
        }
      }
      parsedMatches.push({
        id: id,
        score:propsMap.score ? parseFloat(propsMap.score) : 0, 
        username: propsMap.username,
        avatarUrl: propsMap.avatarUrl
      });
    }
    return parsedMatches;
  }
  private generateVector(userInterests:string[]){
    const vector = new Float32Array(MASTER_INTERESTS.length).fill(0);
    userInterests.forEach((interest, rank) => {
      const masterIndex = MASTER_INTERESTS.indexOf(interest);
      if (masterIndex !== -1) {
        const weight = Math.max(0.1, 1.0 - (rank * 0.1));
        vector[masterIndex] = weight;
      }
    });
    return vector;
  }
  async createIndex() {
    const indexName = 'idx:users';
    try {
      await this.redis.call('FT.INFO', indexName);
    } catch (err:any) {
      if (err.message && err.message.includes('Unknown Index name')) {
        await this.redis.call(
          'FT.CREATE', 
          indexName,
          'ON', 'HASH',
          'PREFIX', '1', 'user:profile:',
          'SCHEMA',
          'status', 'TAG',
          'geo', 'GEO',
          'embedding', 'VECTOR', 'HNSW', 
            '6',
            'TYPE', 'FLOAT32',
            'DIM', MASTER_INTERESTS.length.toString(), 
            'DISTANCE_METRIC', 'COSINE' 
        );
      } else {
        console.error("Redis Index Error:", err);
      }
    }
  }
  async updateUserStatus(userId:string,lat:number,long:number,interests:string[]){
    const key = `user:profile:${userId}`;
    const vector = this.generateVector(interests);
    const geoString = `${long},${lat}`;
    const vectorBuffer = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
    const pipeline = this.redis.pipeline();
    pipeline.hset(key,{
      geo:geoString,
      embedding:vectorBuffer,
    })
    pipeline.expire(key,60*60*24);
    await pipeline.exec();
  }
  async addToQueue(userId:string){
    const pipeline = this.redis.pipeline();
    pipeline.hset(`user:profile:${userId}`, "status", UserStatus.QUEUE);
    pipeline.lrem(`match:queue`, 0, userId);
    pipeline.lpush(`match:queue`,userId);
    await pipeline.exec();
  }
  async popFromQueue(){
    const result = await this.redis.brpop(`match:queue`,0);
    if (result && result.length === 2) {
      return result[1];
    }
    return null;
  }
  async leaveQueue(userId:string){
    const pipeline = this.redis.pipeline();
    pipeline.lrem(`match:queue`,0,userId);
    pipeline.hset(`user:profile:${userId}`,"status",UserStatus.ONLINE);
    await pipeline.exec();
  }
  async findMatchesInRadius(
    userVector: Float32Array,
    lat: number,
    long: number,
    radiusKm: number
  ) {
    const indexName = `idx:users`;
    const vectorBuffer = Buffer.from(userVector.buffer, userVector.byteOffset, userVector.byteLength);
    const query = `@status:{${UserStatus.QUEUE}} @geo:[${long} ${lat} ${radiusKm} km]=>[KNN 10 @embedding $vec AS score]`;
    try {
      const results = await this.redis.call(
        "FT.SEARCH", indexName, query,
        "PARAMS", "2", "vec", vectorBuffer,
        "SORTBY", "score", "ASC",
        "RETURN", "3", "id", "username", "avatarUrl", 
        "DIALECT", "2"
      ) as any[];
      return this.parseRedisSearchResults(results);
    } catch (error) {
      console.error("Search Error:", error);
      return [];
    }
  }
  async lockMatch(userA:string,userB:string){
    const keyA = `user:profile:${userA}`;
    const keyB = `user:profile:${userB}`;
    const queueKey = `match:queue`;
    try {
      await this.redis.watch(keyA,keyB);
      const pipeline = this.redis.pipeline();
      pipeline.hget(keyA,"status");
      pipeline.hget(keyB,"status");
      const results = await pipeline.exec();
      if (!results || !results[0] || !results[1]) {
        await this.redis.unwatch();
        return false;
      }
      const statusA = results[0][1] as string;
      const statusB = results[1][1] as string;
      if (statusA !== UserStatus.QUEUE || statusB !== UserStatus.QUEUE){
        await this.redis.unwatch();
        return false;
      }
      const tx = this.redis.multi();
      tx.hset(keyA,"status",UserStatus.MATCHED);
      tx.hset(keyB,"status",UserStatus.MATCHED);
      tx.lrem(queueKey,0,userA);
      tx.lrem(queueKey,0,userB);
      const execResult = await tx.exec();
      return execResult !== null;
    } catch (err) {
      console.error("LockMatch Error:",err);
      await this.redis.unwatch();
      return false;
    }
  }
  async cleanupMatch(userA: string, userB: string) {
    const pipeline = this.redis.pipeline();
    pipeline.hset(`user:profile:${userA}`, "status", UserStatus.QUEUE);
    pipeline.hset(`user:profile:${userB}`, "status", UserStatus.QUEUE);
    pipeline.lpush("match:queue", userA); 
    pipeline.lpush("match:queue", userB);
    await pipeline.exec();
  }
}