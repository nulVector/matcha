import { Request, Response } from 'express';
import prisma from '@matcha/prisma';
import { redisManager } from '../services/redis';
import { logger } from '@matcha/logger';

export const checkHealth = async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'up',
      redis: 'up'
    }
  };
  try {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      health.services.database = 'down';
      throw dbError;
    }
    const isRedisHealthy = await redisManager.ping();
    if (!isRedisHealthy) {
      health.services.redis = 'down';
      throw new Error("Redis ping failed");
    }
    return res.status(200).json(health);
  } catch (error: any) {
    logger.error({ error, services: health.services }, 'Health check failed');
    health.status = 'unhealthy';
    return res.status(503).json(health);
  }
};