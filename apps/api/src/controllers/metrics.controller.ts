import { logger } from "@matcha/logger";
import { Request, Response } from "express";
import { apiRegistry } from "../config/metrics";

export const getMetrics = async (req: Request, res: Response) => {
  try {
    const appMetrics = await apiRegistry.metrics();
    res.set('Content-Type', apiRegistry.contentType);
    res.end(`${appMetrics}`);
  } catch (err) {
    logger.error({ err }, "Failed to export metrics");
    res.status(500).end();
  }
}