import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { ChatService } from '../services/chat';
import {
  validateChatRequest,
  chatRateLimit,
  validateConversationAccess,
} from '../middleware/validation';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

const router = Router();
const chatService = new ChatService();

/**
 * POST /api/chat/message
 * Purpose: Send message to AI agent
 */
router.post(
  '/message',
  authenticate,
  chatRateLimit,
  validateChatRequest,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { building_id, message, conversation_id, context } = req.body;

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

      const response = await chatService.sendMessage(userId, building_id, {
        message,
        conversation_id,
        context,
      });

      res.json({
        success: true,
        data: response,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Chat message error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CHAT_MESSAGE_ERROR',
          message: 'Failed to process chat message',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Purpose: Get conversation history
 */
router.get(
  '/conversations/:conversationId/messages',
  authenticate,
  validateConversationAccess,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await chatService.getConversationHistory(
        conversationId,
        limit
      );

      res.json({
        success: true,
        data: messages,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Get conversation history error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONVERSATION_HISTORY_ERROR',
          message: 'Failed to get conversation history',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * GET /api/chat/conversations
 * Purpose: Get user conversations for a building
 */
router.get(
  '/conversations',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { building_id } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId || !building_id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'User ID and building ID are required',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      const conversations = await chatService.getUserConversations(
        userId,
        building_id as string,
        limit
      );

      res.json({
        success: true,
        data: conversations,
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Get conversations error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_CONVERSATIONS_ERROR',
          message: 'Failed to get conversations',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * DELETE /api/chat/conversations/:conversationId
 * Purpose: Clear conversation history
 */
router.delete(
  '/conversations/:conversationId',
  authenticate,
  validateConversationAccess,
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user?.id;

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

      await chatService.clearConversation(conversationId, userId);

      res.json({
        success: true,
        data: { message: 'Conversation cleared successfully' },
      } as ApiResponse);
    } catch (error: any) {
      logger.error('Clear conversation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEAR_CONVERSATION_ERROR',
          message: 'Failed to clear conversation',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

export default router;
