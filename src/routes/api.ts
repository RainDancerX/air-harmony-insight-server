/*
 * @Author: Lucas Liu lantasy.io@gmail.com
 * @Date: 2025-05-30 12:11:22
 * @LastEditTime: 2025-05-30 12:18:16
 * @Description:
 */
import { Router, Request, Response } from 'express';

const router = Router();

// Main API info endpoint
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Air Harmony Insight API',
    version: '1.0.0',
    description: 'Backend API for Air Harmony Insight application',
    endpoints: {
      health: '/health',
      api: '/api',
      // Add more endpoints here as they are implemented
    },
    documentation: 'https://github.com/your-repo/air-harmony-insight-api',
  });
});

// Example endpoint - can be expanded later
router.get('/status', (req: Request, res: Response) => {
  res.json({
    api: 'Air Harmony Insight API',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
});

export default router;
