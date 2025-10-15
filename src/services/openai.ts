import OpenAI from 'openai';
import { ChatMessage, ChatConversation } from '../types';
import { dbService } from './database';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export class OpenAIService {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.model = config.openai.model;
    this.maxTokens = config.openai.maxTokens;
    this.temperature = config.openai.temperature;
  }

  async generateResponse(
    userMessage: string,
    conversationHistory: ChatMessage[],
    context: any
  ): Promise<{
    content: string;
    usage: any;
    responseTimeMs: number;
  }> {
    const startTime = Date.now();

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const messages = this.buildChatMessages(
        systemPrompt,
        conversationHistory,
        userMessage
      );

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        // Temporarily removed function calling for debugging
        // functions: this.getFunctionDefinitions(),
        // function_call: 'auto',
      });

      const responseTimeMs = Date.now() - startTime;
      const assistantMessage = completion.choices[0].message;

      // Handle function calls if present
      if (assistantMessage.function_call) {
        const functionResult = await this.handleFunctionCall(
          assistantMessage.function_call,
          context
        );
        return {
          content: functionResult.response,
          usage: completion.usage,
          responseTimeMs,
        };
      }

      return {
        content:
          assistantMessage.content ||
          "I apologize, but I couldn't generate a response.",
        usage: completion.usage,
        responseTimeMs,
      };
    } catch (error: any) {
      logger.error('OpenAI API error:', error);
      console.error('DETAILED OPENAI ERROR:', error.message, error.stack);
      throw new Error('Failed to generate AI response');
    }
  }

  private buildSystemPrompt(context: any): string {
    const basePrompt = `You are an AI assistant for the Air Harmony Insight building management system. You help users monitor and optimize indoor air quality (IAQ).

Your capabilities include:
- Analyzing air quality data and trends
- Explaining alerts and providing recommendations
- Controlling building systems (HVAC, ventilation)
- Generating insights from sensor data
- Answering questions about building performance

Current building context:
- Building: ${context.building?.name || 'Unknown'}
- Current time: ${new Date().toISOString()}
- Total zones: ${context.building?.total_zones || 'Unknown'}
- Active alerts: ${context.alerts?.length || 0}

Available sensor types: temperature, humidity, co2, pm25, tvoc, noise_level

Always provide specific, actionable advice. When making recommendations, be clear about the expected outcomes and timeframes.`;

    if (context.current_zone) {
      return (
        basePrompt +
        `\n\nCurrent zone context: ${JSON.stringify(
          context.current_zone,
          null,
          2
        )}`
      );
    }

    if (context.alerts && context.alerts.length > 0) {
      return (
        basePrompt +
        `\n\nActive alerts: ${JSON.stringify(context.alerts, null, 2)}`
      );
    }

    return basePrompt;
  }

  private buildChatMessages(
    systemPrompt: string,
    conversationHistory: ChatMessage[],
    userMessage: string
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (limit to recent messages to stay within token limits)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      if (msg.message_type === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.message_type === 'assistant') {
        messages.push({ role: 'assistant', content: msg.content });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  private getFunctionDefinitions(): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[] {
    return [
      {
        name: 'adjust_zone_ventilation',
        description: 'Adjust ventilation rate in a specific zone',
        parameters: {
          type: 'object',
          properties: {
            zone_id: { type: 'string', description: 'Zone ID to adjust' },
            action: {
              type: 'string',
              enum: ['increase', 'decrease'],
              description: 'Ventilation adjustment action',
            },
            percentage: {
              type: 'number',
              description: 'Percentage to adjust (1-100)',
            },
          },
          required: ['zone_id', 'action'],
        },
      },
      {
        name: 'get_zone_data',
        description: 'Get current sensor data for a specific zone',
        parameters: {
          type: 'object',
          properties: {
            zone_id: { type: 'string', description: 'Zone ID to query' },
            sensor_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific sensor types to retrieve',
            },
          },
          required: ['zone_id'],
        },
      },
      {
        name: 'mark_alert_resolved',
        description: 'Mark an alert as resolved',
        parameters: {
          type: 'object',
          properties: {
            alert_id: { type: 'string', description: 'Alert ID to resolve' },
            resolution_note: {
              type: 'string',
              description: 'Note about how the alert was resolved',
            },
          },
          required: ['alert_id'],
        },
      },
    ];
  }

  private async handleFunctionCall(
    functionCall: OpenAI.Chat.Completions.ChatCompletionMessage.FunctionCall,
    context: any
  ): Promise<{ response: string }> {
    const { name, arguments: args } = functionCall;
    const parsedArgs = JSON.parse(args);

    try {
      switch (name) {
        case 'adjust_zone_ventilation':
          return await this.adjustZoneVentilation(parsedArgs, context);
        case 'get_zone_data':
          return await this.getZoneData(parsedArgs, context);
        case 'mark_alert_resolved':
          return await this.markAlertResolved(parsedArgs, context);
        default:
          return { response: 'Function not implemented yet.' };
      }
    } catch (error: any) {
      logger.error(`Function call error for ${name}:`, error);
      return { response: `Error executing ${name}: ${error.message}` };
    }
  }

  private async adjustZoneVentilation(
    args: any,
    context: any
  ): Promise<{ response: string }> {
    // Implement zone ventilation control
    // This would integrate with your existing building control systems
    return {
      response: `Ventilation in zone ${args.zone_id} has been ${
        args.action
      }d by ${
        args.percentage || 20
      }%. The change will take effect within 2-3 minutes.`,
    };
  }

  private async getZoneData(
    args: any,
    context: any
  ): Promise<{ response: string }> {
    // Get zone data from your database
    const zoneData = await dbService.getLatestReadings(args.zone_id);

    return {
      response: `Current readings for zone ${args.zone_id}: ${JSON.stringify(
        zoneData,
        null,
        2
      )}`,
    };
  }

  private async markAlertResolved(
    args: any,
    context: any
  ): Promise<{ response: string }> {
    // Mark alert as resolved in database
    await dbService.resolveAlert(args.alert_id, context.user_id || 'system');

    return {
      response: `Alert ${args.alert_id} has been marked as resolved. Note: ${args.resolution_note}`,
    };
  }
}
