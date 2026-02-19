import { Request, Response, NextFunction } from 'express';
import { redisManager } from '../services/redis';

export const idempotencyGuard = (action: string, expireTimeSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey = req.headers['x-idempotency-key'] as string;
      if (!idempotencyKey) {
        res.status(400).json({ message: "x-idempotency-key header is required" });
        return;
      }
      const isFirstRequest = await redisManager.auth.checkIdempotency(`${action}:${idempotencyKey}`, expireTimeSeconds);
      
      if (!isFirstRequest) {
        res.status(409).json({ message: "Request already processed or currently processing." });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};