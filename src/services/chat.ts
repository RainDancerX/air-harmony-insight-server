import { v4 as uuidv4 } from 'uuid';
import { dbService } from './database';
import { OpenAIService } from './openai';
import {
  ChatMessage,
  ChatConversation,
  ChatRequest,
  ChatResponse,
} from '../types';
import { logger } from '../utils/logger';

export class ChatService {
  private openai: OpenAIService;

  constructor() {
    this.openai = new OpenAIService();
  }

  async sendMessage(
    userId: string,
    buildingId: string,
    request: ChatRequest
  ): Promise<ChatResponse> {
    try {
      // Get or create conversation
      let conversation = await this.getOrCreateConversation(
        userId,
        buildingId,
        request.conversation_id
      );

      // Store user message
      const userMessage = await this.storeMessage(conversation.id, {
        message_type: 'user',
        content: request.message,
        metadata: { context: request.context },
      });

      // Get conversation history
      const history = await this.getConversationHistory(conversation.id);

      // Build context for AI
      const context = await this.buildContext(buildingId, request.context);
      context.user_id = userId; // Add user ID to context for function calls

      // Generate AI response
      const aiResponse = await this.openai.generateResponse(
        request.message,
        history,
        context
      );

      // Store AI response
      const assistantMessage = await this.storeMessage(conversation.id, {
        message_type: 'assistant',
        content: aiResponse.content,
        metadata: {
          openai_metadata: {
            model: 'gpt-4', // You might want to get this from config
            usage: aiResponse.usage,
          },
          context: request.context,
        },
        tokens_used: aiResponse.usage?.total_tokens,
        response_time_ms: aiResponse.responseTimeMs,
      });

      // Update conversation timestamp
      await this.updateConversationTimestamp(conversation.id);

      return {
        message_id: assistantMessage.id,
        conversation_id: conversation.id,
        response: aiResponse.content,
        metadata: assistantMessage.metadata,
        created_at: assistantMessage.created_at,
      };
    } catch (error: any) {
      logger.error('Chat service error:', error);
      console.error('DETAILED CHAT ERROR:', error.message, error.stack);
      throw new Error('Failed to process chat message');
    }
  }

  async getConversationHistory(
    conversationId: string,
    limit: number = 50
  ): Promise<ChatMessage[]> {
    const query = `
      SELECT * FROM chat_messages 
      WHERE conversation_id = $1 
      ORDER BY created_at ASC 
      LIMIT $2
    `;

    const result = await dbService.query(query, [conversationId, limit]);
    return result.map((row) => ({
      ...row,
      metadata:
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata,
    }));
  }

  async getUserConversations(
    userId: string,
    buildingId: string,
    limit: number = 20
  ): Promise<ChatConversation[]> {
    const query = `
      SELECT cc.*, 
             cm.content as last_message,
             cm.created_at as last_message_at
      FROM chat_conversations cc
      LEFT JOIN LATERAL (
        SELECT content, created_at 
        FROM chat_messages 
        WHERE conversation_id = cc.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) cm ON true
      WHERE cc.user_id = $1 AND cc.building_id = $2 AND cc.is_active = true
      ORDER BY cc.updated_at DESC
      LIMIT $3
    `;

    const result = await dbService.query(query, [userId, buildingId, limit]);
    return result;
  }

  async clearConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    // Soft delete the conversation by setting is_active to false
    const query = `
      UPDATE chat_conversations 
      SET is_active = false, updated_at = NOW() 
      WHERE id = $1 AND user_id = $2
    `;

    await dbService.query(query, [conversationId, userId]);
  }

  private async getOrCreateConversation(
    userId: string,
    buildingId: string,
    conversationId?: string
  ): Promise<ChatConversation> {
    if (conversationId) {
      const existing = await dbService.query(
        'SELECT * FROM chat_conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (existing.length > 0) {
        return existing[0];
      }
    }

    // Create new conversation
    const newConversation = {
      id: uuidv4(),
      user_id: userId,
      building_id: buildingId,
      title: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };

    const query = `
      INSERT INTO chat_conversations (id, building_id, user_id, created_at, updated_at, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await dbService.query(query, [
      newConversation.id,
      newConversation.building_id,
      newConversation.user_id,
      newConversation.created_at,
      newConversation.updated_at,
      newConversation.is_active,
    ]);

    return result[0];
  }

  private async storeMessage(
    conversationId: string,
    message: Partial<ChatMessage>
  ): Promise<ChatMessage> {
    const newMessage = {
      id: uuidv4(),
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
      ...message,
    };

    const query = `
      INSERT INTO chat_messages (
        id, conversation_id, message_type, content, metadata, 
        tokens_used, response_time_ms, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await dbService.query(query, [
      newMessage.id,
      newMessage.conversation_id,
      newMessage.message_type,
      newMessage.content,
      JSON.stringify(newMessage.metadata || {}),
      newMessage.tokens_used,
      newMessage.response_time_ms,
      newMessage.created_at,
    ]);

    const stored = result[0];
    return {
      ...stored,
      metadata:
        typeof stored.metadata === 'string'
          ? JSON.parse(stored.metadata)
          : stored.metadata,
    };
  }

  private async updateConversationTimestamp(
    conversationId: string
  ): Promise<void> {
    await dbService.query(
      'UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1',
      [conversationId]
    );
  }

  private async buildContext(
    buildingId: string,
    requestContext?: any
  ): Promise<any> {
    const context: any = {};

    // Get basic building info (limited data)
    const building = await this.getBuildingInfo(buildingId);
    context.building = {
      name: building?.name || 'Unknown Building',
      total_zones: building?.total_zones || 0,
    };

    // Get limited active alerts (max 3, basic info only)
    const alerts = await this.getActiveAlerts(buildingId);
    context.alerts = alerts.slice(0, 3).map((alert) => ({
      id: alert.id,
      sensor_type: alert.sensorType,
      status: alert.status,
    }));

    // Add specific context based on request (minimal data)
    if (requestContext?.zone_id) {
      const zone = await this.getZoneInfo(requestContext.zone_id);
      context.current_zone = zone
        ? {
            name: zone.name,
            floor: zone.floor,
          }
        : null;
    }

    if (requestContext?.alert_id) {
      const alert = await this.getAlertInfo(requestContext.alert_id);
      context.current_alert = alert
        ? {
            id: alert.id,
            sensor_type: alert.sensor_type,
            status: alert.status,
          }
        : null;
    }

    return context;
  }

  private async getBuildingInfo(buildingId: string): Promise<any> {
    const building = await dbService.getBuilding(buildingId);
    if (building) {
      // Get total zones count
      const zones = await dbService.getZonesByBuilding(buildingId);
      return {
        ...building,
        total_zones: zones.length,
      };
    }
    return null;
  }

  private async getActiveAlerts(buildingId: string): Promise<any[]> {
    return await dbService.getActiveAlerts(buildingId);
  }

  private async getZoneInfo(zoneId: string): Promise<any> {
    const zone = await dbService.getZone(zoneId);
    if (zone) {
      // Get latest readings for this zone
      const readings = await dbService.getLatestReadings(zoneId);
      return {
        ...zone,
        latest_readings: readings,
      };
    }
    return null;
  }

  private async getAlertInfo(alertId: string): Promise<any> {
    const query = 'SELECT * FROM alerts WHERE id = $1';
    const result = await dbService.query(query, [alertId]);
    return result[0] || null;
  }
}
