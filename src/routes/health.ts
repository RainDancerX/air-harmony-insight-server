/*
 * @Author: Lucas Liu lantasy.io@gmail.com
 * @Date: 2025-05-30 12:11:13
 * @LastEditTime: 2025-05-30 12:28:17
 * @Description:
 */
import { Router, Request, Response } from 'express';

const router = Router();

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Air Harmony Insight API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
