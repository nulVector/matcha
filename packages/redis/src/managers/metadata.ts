import Redis from "ioredis";

export class MetadataManager {
  constructor (private redis:Redis) {}

  async cacheMetadata(key:string,data:any[]) {
    await this.redis.set(`metadata:${key}`, JSON.stringify(data),"EX",60*60*24)
  }
  async getMetadata<T>(key: string): Promise<T[] | null> {
    const data = await this.redis.get(`metadata:${key}`);
    if (!data) return null;
    return JSON.parse(data) as T[];
  }
  async invalidateMetadata(key:string) {
    await this.redis.del(`metadata:${key}`)
  }
}