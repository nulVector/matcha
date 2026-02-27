import Redis from "ioredis";
import { MASTER_INTERESTS, MatchAction, UserState } from "../common";

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
          'queueStatus', 'TAG',
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
  async updateMatchProfile(userId:string,lat:number,long:number,interests:string[]){
    const key = `user:profile:${userId}`;
    const vector = this.generateVector(interests);
    const geoString = `${long},${lat}`;
    const vectorBuffer = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
    const tx = this.redis.multi();
    tx.hset(key,{
      geo:geoString,
      embedding:vectorBuffer,
    })
    tx.expire(key,60*60*24);
    await tx.exec();
  }
  async addToQueue(userId:string){
    const tx = this.redis.multi();
    tx.hset(`user:profile:${userId}`,'queueStatus',UserState.QUEUED);
    tx.lrem(`match:queue`, 0, userId);
    tx.lpush(`match:queue`,userId);
    await tx.exec();
  }
  async popFromQueue(){
    const result = await this.redis.brpop(`match:queue`,0);
    if (result && result.length === 2) {
      return result[1];
    }
    return null;
  }
  async leaveQueue(userId: string, targetStatus: UserState = UserState.IDLE) {
    const tx = this.redis.multi();
    tx.lrem(`match:queue`, 0, userId);
    tx.hset(`user:profile:${userId}`,'queueStatus',targetStatus);
    await tx.exec();
  }
  async findMatchesInRadius(
    userVector: Float32Array,
    lat: number,
    long: number,
    radiusKm: number
  ) {
    const indexName = `idx:users`;
    const vectorBuffer = Buffer.from(userVector.buffer, userVector.byteOffset, userVector.byteLength);
    const query = `@queueStatus:{${UserState.QUEUED}} @geo:[${long} ${lat} ${radiusKm} km]=>[KNN 10 @embedding $vec AS score]`;
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
    const presAKey = `user:status:${userA}`;
    const presBKey = `user:status:${userB}`;
    const queueKey = `match:queue`;
    try {
      await this.redis.watch(keyA,keyB);
      const pipeline = this.redis.pipeline();
      pipeline.hget(keyA,"queueStatus");
      pipeline.hget(keyB,"queueStatus");
      pipeline.get(presAKey);
      pipeline.get(presBKey);
      const results = await pipeline.exec();
      if (!results || !results[0] || !results[1] || !results[2] || !results[3]) {
        await this.redis.unwatch();
        return false;
      }
      const statusA = results[0][1] as string;
      const statusB = results[1][1] as string;
      const isOnlineA = results[2][1] === "1";
      const isOnlineB = results[3][1] === "1";
      if (!isOnlineA || !isOnlineB) {
        await this.redis.unwatch();
        const tx = this.redis.multi();
        if (!isOnlineA) {
          tx.lrem(queueKey, 0, userA);
          tx.hset(keyA, "queueStatus", UserState.IDLE);
        }
        if (!isOnlineB) {
          tx.lrem(queueKey, 0, userB);
          tx.hset(keyB, "queueStatus", UserState.IDLE);
        }
        await tx.exec();
        return false;
      }
      if (statusA !== UserState.QUEUED || statusB !== UserState.QUEUED){
        await this.redis.unwatch();
        return false;
      }
      const tx = this.redis.multi();
      tx.hset(keyA,"queueStatus",UserState.MATCHED);
      tx.hset(keyB,"queueStatus",UserState.MATCHED);
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
    const tx = this.redis.multi();
    tx.hset(`user:profile:${userA}`, "queueStatus", UserState.QUEUED);
    tx.hset(`user:profile:${userB}`, "queueStatus", UserState.QUEUED);
    tx.lpush("match:queue", userA); 
    tx.lpush("match:queue", userB);
    await tx.exec();
  }
  async setMatchTimer(connectionId:string, timer:number) {
    await this.redis.set(`match:timer:${connectionId}`,"1","EX",timer)
  }
  async clearMatchTimer(connectionId:string) {
    await this.redis.del(`match:timer:${connectionId}`)
  }
  async recordMatchVotes(connectionId:string,userId:string,action:MatchAction) {
    const key = `match:votes:${connectionId}:${action}`;
    const tx = this.redis.multi();
    tx.hset(key,userId,"1");
    tx.expire(key, 60 * 30);
    tx.hlen(key);
    const result = await tx.exec();
    if (!result || !result[2]) return 0;
    return result[2][1] as number;
  }
  async clearMatchVotes(connectionId: string) {
    const tx = this.redis.multi();
    tx.del(`match:votes:${connectionId}:EXTEND`);
    tx.del(`match:votes:${connectionId}:CONVERT`);
    await tx.exec();
  }
  async setMatchInfo(connectionId:string,user1Id:string,user2Id:string){
    const key = `match:info:${connectionId}`;
    const tx = this.redis.multi();
    tx.hset(key,{
      user1Id,
      user2Id
    })
    tx.expire(key, 60 * 40 )
    await tx.exec()
  }
  async getMatchInfo(connectionId:string){
    const info = await this.redis.hgetall(`match:info:${connectionId}`);
    if (Object.keys(info).length === 0) return null;
    return info as { user1Id: string; user2Id: string };
  }
  async clearMatchInfo(connectionId:string){
    await this.redis.del(`match:info:${connectionId}`);
  }
}