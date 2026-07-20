import { NextFunction, Request, Response } from 'express';
import { httpRequestDurationMicroseconds } from '../config/metrics';
import { env } from '../config/env';

export const metricsAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const expectedToken = env.PROMETHEUS_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    res.status(401).send("Unauthorized");
    return;
  }
  next();
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/metrics' || req.path === '/health') {
    return next();
  }

  const endTimer = httpRequestDurationMicroseconds.startTimer();
  
  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unknown_route';
    endTimer({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    });
  });

  next();
};