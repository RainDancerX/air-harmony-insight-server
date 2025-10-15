import { Router } from 'express';
import {
  login,
  logout,
  getCurrentUser,
  authenticate,
} from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/auth/login
 * Purpose: Authenticate user and return JWT token
 */
router.post('/login', login);

/**
 * POST /api/auth/logout
 * Purpose: Invalidate user session
 */
router.post('/logout', authenticate, logout);

/**
 * GET /api/auth/me
 * Purpose: Get current user profile
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * POST /api/auth/refresh
 * Purpose: Refresh access token (placeholder - could be implemented later)
 */
router.post('/refresh', async (req, res) => {
  // This would implement refresh token logic
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Token refresh not yet implemented',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
