import { Request, Response, NextFunction } from "express";
import { createId } from "@paralleldrive/cuid2";
import { traceStorage } from "@matcha/logger";

export const traceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const traceId = (req.headers["x-trace-id"] as string) || createId();
  res.setHeader("x-trace-id", traceId);
  traceStorage.run({ traceId }, () => {
    next();
  });
};