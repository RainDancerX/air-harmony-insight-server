import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { config } from '../config/env';

export const validateChatRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { building_id, message } = req.body;

  if (!building_id) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_BUILDING_ID',
        message: 'building_id is required',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
    return;
  }

  if (!message || message.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_MESSAGE',
        message: 'message is required and cannot be empty',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
    return;
  }

  if (message.length > 2000) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MESSAGE_TOO_LONG',
        message: 'message cannot exceed 2000 characters',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
    return;
  }

  next();
};

export const chatRateLimit = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Implement rate limiting specific to chat
  // For now, we'll use a simple in-memory rate limiter
  // In production, you might want to use Redis for this

  const userId = req.user?.id || req.ip || 'anonymous';
  const rateLimitKey = `chat_rate_limit:${userId}`;

  // This is a simplified implementation
  // In a real application, you'd want to use a more robust rate limiting solution
  next();
};

export const validateConversationAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    if (!conversationId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CONVERSATION_ID',
          message: 'Conversation ID is required',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_AUTHENTICATED',
          message: 'User not authenticated',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
      return;
    }

    // Additional validation could be added here to check if the user
    // has access to the specific conversation
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate conversation access',
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  }
};
