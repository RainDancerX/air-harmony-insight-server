/*
 * @Author: Lucas Liu lantasy.io@gmail.com
 * @Date: 2025-05-30 12:11:22
 * @LastEditTime: 2025-05-30 12:18:16
 * @Description:
 */
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { dbService } from '../services/database';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

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

// =============================================================================
// Alert Management Endpoints
// =============================================================================

/**
 * PATCH /api/alerts/:alertId/read
 * Purpose: Mark an alert as read (acknowledged)
 */
router.patch(
  '/alerts/:alertId/read',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Check if alert exists
      const alertCheck = await dbService.query(
        'SELECT id FROM alerts WHERE id = $1',
        [alertId]
      );

      if (alertCheck.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Alert not found',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      await dbService.markAlertAsRead(alertId);

      res.json({
        success: true,
        data: { message: 'Alert marked as read' },
      } as ApiResponse);

      logger.info(`Alert ${alertId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Error marking alert as read:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_ALERT_READ_ERROR',
          message: 'Failed to mark alert as read',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/alerts/:alertId/resolve
 * Purpose: Resolve (close) an alert
 */
router.post(
  '/alerts/:alertId/resolve',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Check if alert exists
      const alertCheck = await dbService.query(
        'SELECT id FROM alerts WHERE id = $1',
        [alertId]
      );

      if (alertCheck.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Alert not found',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      await dbService.resolveAlert(alertId, userId);

      res.json({
        success: true,
        data: { message: 'Alert resolved' },
      } as ApiResponse);

      logger.info(`Alert ${alertId} resolved by user ${userId}`);
    } catch (error) {
      logger.error('Error resolving alert:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'RESOLVE_ALERT_ERROR',
          message: 'Failed to resolve alert',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

export default router;
