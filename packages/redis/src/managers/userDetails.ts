import Redis from "ioredis";
import { ConnectionListType, UserProfile } from "../common";

export class UserDetailManager {
  constructor (private redis:Redis) {}

  private deserializeProfile(data: Record<string, string>): Partial<UserProfile> {
    const result: any = { ...data };
    delete result.embedding;
    if (data.isActive !== undefined) result.isActive = data.isActive === "true";
    if (data.allowDiscovery !== undefined) result.allowDiscovery = data.allowDiscovery === "true";
    if (data.locationLatitude !== undefined) result.locationLatitude = parseFloat(data.locationLatitude);
    if (data.locationLongitude !== undefined) result.locationLongitude = parseFloat(data.locationLongitude);
    if (data.interest !== undefined) {
      result.interest = data.interest === "" ? [] : data.interest.split(",");
    }
    return result;
  }
  async cacheProfile(userId:string,profile:Partial<UserProfile>){
    const key = `user:profile:${userId}`;
    const dataToStore: Record<string, string> = {};
    for (const [k, v] of Object.entries(profile)) {
      if (v === undefined || v === null) continue;
      if (k === "interest" && Array.isArray(v)) {
        dataToStore[k] = v.join(","); 
      } else {
        dataToStore[k] = String(v);
      }
    }
    if (Object.keys(dataToStore).length > 0) {
      const tx = this.redis.multi();
      tx.hset(key, dataToStore);
      tx.expire(key, 60 * 60 * 24); 
      await tx.exec();
    }
  }
  async getProfile(userId:string): Promise<Partial<UserProfile>|  null> {
    const data = await this.redis.hgetall(`user:profile:${userId}`);
    if (!data || Object.keys(data).length === 0) return null;
    return this.deserializeProfile(data);
  }
  async updateProfileFields(userId:string,fields:Partial<UserProfile>) {
    await this.cacheProfile(userId, fields);
  }
  async getProfileFields(userId:string,fields:string[]){
    const values = await this.redis.hmget(`user:profile:${userId}`,...fields);
    if (values.every(val => val === null)) return {};
    const rawData: Record<string, string> = {};
    fields.forEach((field, index) => {
        if (values[index] !== null) {
          rawData[field] = values[index] as string;
        }
    });
    return this.deserializeProfile(rawData);
  }
  async invalidateProfile(userId:string){
    await this.redis.del(`user:profile:${userId}`)
  }
  async cacheConnectionList(userId:string,ids:string[],type:ConnectionListType){
    const tx = this.redis.multi();
    const key = `user:${type}:${userId}`;
    const ttl = type === ConnectionListType.FRIEND ? 60 * 60 * 24 : 60 * 60;
      tx.del(key);
      if (ids.length > 0) {
        tx.sadd(key, ...ids);
        tx.expire(key, ttl);
      }
      await tx.exec();
  }
  async getConnectionList(userId:string,type:ConnectionListType){
    return await this.redis.smembers(`user:${type}:${userId}`)
  }
  async inConnectionList(userId:string,connectionId:string,type:ConnectionListType) {
    const exists = await this.redis.sismember(`user:${type}:${userId}`,connectionId);
    return exists === 1;
  }
  async getManyProfiles(
    ids: string[], 
    fields: string[] = ["id", "username", "avatarUrl"]
  ) {
    if (ids.length === 0 || fields.length === 0 ) return [];
    const pipeline = this.redis.pipeline();
    ids.forEach((id) => pipeline.hmget(`user:profile:${id}`, ...fields));
    const results = await pipeline.exec();
    return results?.map((result, index) => {
      const error = result[0];
      const values = result[1] as (string | null)[];
      const currentId = ids[index];
      if (error || !values || values.every((v) => v === null) || !currentId) return null;
      const userObj: Record<string, string> = {};
      userObj.id = currentId;
      fields.forEach((field, i) => {
        if (values[i] !== null) {
          userObj[field] = values[i] as string;
        }
      });
      return userObj;
    }).filter((item): item is Record<string, string> => item !== null)|| [];
  }
  async getConnectionsWithDetails(userId: string,type: ConnectionListType) {
    const ids = await this.getConnectionList(userId, type);
    const profiles = await this.getManyProfiles(ids);
    return profiles.map(p => ({
      ...p,
      connectionStatus: type
    }));
  }
}