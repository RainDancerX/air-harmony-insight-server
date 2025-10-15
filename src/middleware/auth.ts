import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { dbService } from '../services/database';
import { User, UserSession, ApiResponse } from '../types';

// Extend Express Request type to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'password_hash'>;
      session?: UserSession;
      buildingId?: string;
    }
  }
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export class AuthService {
  // =============================================================================
  // Password Utilities
  // =============================================================================

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptSaltRounds);
  }

  static async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // =============================================================================
  // Token Utilities
  // =============================================================================

  static generateTokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateAccessToken(user: User, sessionId: string): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const secret = config.jwt.secret;
    if (!secret) {
      throw new Error('JWT secret is not configured');
    }

    return jwt.sign(payload, secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);
  }

  static generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static verifyAccessToken(token: string): AuthTokenPayload {
    try {
      const secret = config.jwt.secret;
      if (!secret) {
        throw new Error('JWT secret is not configured');
      }
      return jwt.verify(token, secret) as AuthTokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_TOKEN');
      }
      throw error;
    }
  }

  // =============================================================================
  // Session Management
  // =============================================================================

  static async createSession(
    user: User,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    session: UserSession;
  }> {
    const accessToken = this.generateAccessToken(user, ''); // Temporary, will be updated
    const refreshToken = this.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setTime(
      expiresAt.getTime() + this.parseExpiresIn(config.jwt.expiresIn)
    );

    const session = await dbService.createSession({
      user_id: user.id,
      token_hash: this.generateTokenHash(accessToken),
      refresh_token_hash: this.generateTokenHash(refreshToken),
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    });

    // Generate final access token with session ID
    const finalAccessToken = this.generateAccessToken(user, session.id);

    // Update session with correct token hash
    await dbService.query(
      'UPDATE user_sessions SET token_hash = $1 WHERE id = $2',
      [this.generateTokenHash(finalAccessToken), session.id]
    );

    return {
      accessToken: finalAccessToken,
      refreshToken,
      session: {
        ...session,
        token_hash: this.generateTokenHash(finalAccessToken),
      },
    };
  }

  static async validateSession(tokenHash: string): Promise<UserSession | null> {
    return dbService.getSessionByToken(tokenHash);
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    await dbService.invalidateSession(sessionId);
  }

  private static parseExpiresIn(expiresIn: string): number {
    const matches = expiresIn.match(/^(\d+)([smhd])$/);
    if (!matches) return 24 * 60 * 60 * 1000; // Default 24 hours

    const value = parseInt(matches[1]);
    const unit = matches[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}

// =============================================================================
// Middleware Functions
// =============================================================================

/**
 * Extract and validate JWT token from request
 */
export const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

/**
 * Authenticate user based on JWT token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Verify JWT token
    const payload = AuthService.verifyAccessToken(token);
    const tokenHash = AuthService.generateTokenHash(token);

    // Validate session
    const session = await AuthService.validateSession(tokenHash);
    if (!session) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Session is invalid or expired',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Get user details
    const user = await dbService.getUserById(payload.userId);
    if (!user || !user.is_active) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Update session last used time
    await dbService.query(
      'UPDATE user_sessions SET last_used_at = NOW() WHERE id = $1',
      [session.id]
    );

    // Attach user and session to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
    req.session = session;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof Error) {
      if (error.message === 'TOKEN_EXPIRED') {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Access token has expired',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      } else if (error.message === 'INVALID_TOKEN') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid access token',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  }
};

/**
 * Authorize user based on roles
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    next();
  };
};

/**
 * Check specific permissions
 */
export const checkPermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission '${permission}' is required`,
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    next();
  };
};

/**
 * Optional authentication (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = AuthService.verifyAccessToken(token);
      const tokenHash = AuthService.generateTokenHash(token);
      const session = await AuthService.validateSession(tokenHash);

      if (session) {
        const user = await dbService.getUserById(payload.userId);
        if (user && user.is_active) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
            is_active: user.is_active,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at,
          };
          req.session = session;
        }
      }
    }

    next();
  } catch (error) {
    logger.warn('Optional auth failed:', error);
    next(); // Continue without authentication
  }
};

/**
 * Validate building access for user
 */
export const validateBuildingAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const buildingId =
      req.params.buildingId || (req.query.buildingId as string);

    if (!buildingId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_BUILDING_ID',
          message: 'Building ID is required',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Verify building exists
    const building = await dbService.getBuilding(buildingId);
    if (!building) {
      res.status(404).json({
        success: false,
        error: {
          code: 'BUILDING_NOT_FOUND',
          message: 'Building not found',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // For now, all authenticated users can access all buildings
    // In a real application, you might want to implement building-specific permissions
    req.buildingId = buildingId;
    next();
  } catch (error) {
    logger.error('Building access validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate building access',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  }
};

/**
 * Rate limiting per user
 */
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    const userRequests = requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userRequests.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    userRequests.count++;
    next();
  };
};

// =============================================================================
// Auth Route Handlers
// =============================================================================

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Find user by email
    const user = await dbService.getUserByEmail(email.toLowerCase());
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Check if user is active
    if (!user.is_active) {
      res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Verify password
    const isValidPassword = await AuthService.comparePassword(
      password,
      user.password_hash
    );
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Create session
    const { accessToken, refreshToken } = await AuthService.createSession(
      user,
      req.ip || 'unknown',
      req.get('User-Agent') || 'unknown'
    );

    // Update last login
    await dbService.updateUserLastLogin(user.id);

    // Return successful login response
    res.json({
      success: true,
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          is_active: user.is_active,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        expiresIn: config.jwt.expiresIn,
      },
    } as ApiResponse);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'Login failed',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.session) {
      await AuthService.invalidateSession(req.session.id);
    }

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    } as ApiResponse);
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Logout failed',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json({
      success: true,
      data: req.user,
    } as ApiResponse);
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_FETCH_ERROR',
        message: 'Failed to fetch user data',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  }
};
