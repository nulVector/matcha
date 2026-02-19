import { Request, Response, NextFunction } from 'express';
import { redisManager } from '../services/redis';

type RateLimitKey = 'ip' | 'device' | 'email';
export const rateLimiter = (action:string, type: RateLimitKey, limit: number, windowSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let identifier = '';
      if (type === 'ip') {
        identifier = req.ip || 'unknown_ip';
      } else if (type === 'device') {
        identifier = req.headers['x-device-id'] as string;
        if (!identifier) {
          res.status(400).json({ message: "x-device-id header is required" });
          return;
        }
      } else if (type === 'email') {
        identifier = req.validatedData.body.email || 'unknown_email';
      }
      const redisKey = `${action}:${type}:${identifier}`;
      const isRateLimited = await redisManager.auth.checkRateLimit(redisKey, limit, windowSeconds);
      if (isRateLimited) {
        res.status(429).json({message: `Too many requests. Please try again later.`});
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
