import { getDeterministicIds } from "@matcha/shared";
import Redis from "ioredis";

export class BloomFilterManager {
  constructor (private redis:Redis) {}
  async reserve(key:string,errorRate:number,capacity:number){
    try {
      await this.redis.call(
        'BF.RESERVE', key, errorRate, capacity
      );
    } catch (err:any) {
      if (err.message && err.message.includes('item exists')) {
        return; 
      }
      throw err;
    }
  }
  async add(key:string,item:string) {
    const result = (await this.redis.call(
      'BF.ADD',key,item
    )) as number;
    return result === 1;
  }
  // async addMany(key: string, items: string[]): Promise<boolean[]> {
  //   if (items.length === 0) return [];
  //   const results = (await this.redis.call(
  //     'BF.MADD', key, ...items
  //   )) as number[];
  //   return results.map(r => r === 1);
  // }
  async exists(key:string,item:string) {
    const result = (await this.redis.call(
      'BF.EXISTS',key,item
    )) as number;
    return result === 1;
  }
  // async existsMulti(key: string, items: string[]): Promise<boolean[]> {
  //   if (items.length === 0) return [];
  //   const results = (await this.redis.call(
  //     'BF.MEXISTS', key, ...items
  //   )) as number[];
  //   return results.map(r => r === 1);
  // }
  private getPairKey(id1: string, id2: string): string {
    const [u1, u2] = getDeterministicIds(id1, id2);
    return `${u1}:${u2}`;
  }

  async addPair(key: string, id1: string, id2: string) {
    const pairKey = this.getPairKey(id1, id2);
    return this.add(key, pairKey);
  }

  async existsPair(key: string, id1: string, id2: string) {
    const pairKey = this.getPairKey(id1, id2);
    return this.exists(key, pairKey);
  }
}