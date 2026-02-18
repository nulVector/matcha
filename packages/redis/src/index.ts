import Redis from "ioredis";
import { AuthManager } from "./managers/auth";
import { BloomFilterManager } from "./managers/bloom";
import { ChatManager } from "./managers/chat";
import { MatchManager } from "./managers/match";
import { MetadataManager } from "./managers/metadata";
import { UserConnectionManager } from "./managers/userConnection";
import { UserDetailManager } from "./managers/userDetails";

export class RedisManager {
  private redis:Redis;
  private pubRedis:Redis;
  private subRedis:Redis;

  public auth:AuthManager;
  public userDetail:UserDetailManager;
  public userConnection:UserConnectionManager;
  public metaData:MetadataManager;
  public chat:ChatManager;
  public match:MatchManager;
  public bloom:BloomFilterManager;

  constructor (connectionString:string) {
    this.redis = new Redis(connectionString);
    this.pubRedis = new Redis(connectionString);
    this.subRedis = new Redis(connectionString);
    this.auth = new AuthManager(this.redis);
    this.userDetail = new UserDetailManager(this.redis);
    this.userConnection = new UserConnectionManager(this.redis);
    this.metaData = new MetadataManager(this.redis);
    this.chat = new ChatManager(this.redis,this.subRedis);
    this.match = new MatchManager(this.redis);
    this.bloom = new BloomFilterManager(this.redis);
  }
  async quit() {
    await Promise.all([
      this.redis.quit(),
      this.pubRedis.quit(),
      this.subRedis.quit()
    ])
  }
}
//DO NOT IMPORT REDIS_MANAGER IN OTHER MANAGERS
export * from "./common";

