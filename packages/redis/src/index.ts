import Redis from "ioredis";
import { logger } from "@matcha/logger";
import { AuthManager } from "./managers/auth";
import { BloomFilterManager } from "./managers/bloom";
import { ChatManager } from "./managers/chat";
import { MatchManager } from "./managers/match";
import { MetadataManager } from "./managers/metadata";
import { UserConnectionManager } from "./managers/userConnection";
import { UserDetailManager } from "./managers/userDetails";
import { NotificationManager } from "./managers/notification";

export class RedisManager {
  private redis:Redis;
  private subRedis:Redis;

  public auth:AuthManager;
  public userDetail:UserDetailManager;
  public userConnection:UserConnectionManager;
  public metaData:MetadataManager;
  public chat:ChatManager;
  public match:MatchManager;
  public bloom:BloomFilterManager;
  public notification:NotificationManager;

  constructor (connectionString:string) {
    this.redis = new Redis(connectionString);
    this.subRedis = new Redis(connectionString, { enableReadyCheck: false });

    this.redis.on("error", (err: any) => {
      if (err.message && !err.message.includes("Connection is closed")) {
        logger.error({ err }, "Redis Core Unexpected connection error");
      }
    });
    this.subRedis.on("error", (err: any) => {
      if (err.message && !err.message.includes("Connection is closed")) {
        logger.error({ err }, "Redis Sub Subscriber connection error");
      }
    });
    
    this.auth = new AuthManager(this.redis);
    this.userDetail = new UserDetailManager(this.redis);
    this.userConnection = new UserConnectionManager(this.redis);
    this.metaData = new MetadataManager(this.redis);
    this.chat = new ChatManager(this.redis,this.subRedis);
    this.match = new MatchManager(this.redis);
    this.bloom = new BloomFilterManager(this.redis);
    this.notification = new NotificationManager(this.redis)
  }
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (err) {
      return false;
    }
  }
  async quit() {
    await Promise.all([
      this.redis.quit(),
      this.subRedis.quit()
    ])
  }
}
//DO NOT IMPORT REDIS_MANAGER IN OTHER MANAGERS
export * from "./common";

