import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { AuthService } from '../middleware/auth';
import { dbService } from './database';
import {
  WebSocketEvent,
  SensorUpdateEvent,
  OccupancyUpdateEvent,
  AlertEvent,
  User,
  SensorReading,
  OccupancyLog,
  Alert,
} from '../types';

export interface AuthenticatedSocket {
  id: string;
  user: Omit<User, 'password_hash'>;
  buildingId?: string;
  subscribedZones: Set<string>;
}

export class WebSocketService {
  private io: Server;
  private authenticatedClients: Map<string, AuthenticatedSocket> = new Map();
  private buildingSubscriptions: Map<string, Set<string>> = new Map();
  private zoneSubscriptions: Map<string, Set<string>> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: config.websocket.pingInterval,
      pingTimeout: config.websocket.pingTimeout,
      maxHttpBufferSize: config.websocket.maxHttpBufferSize,
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.debug(`New WebSocket connection: ${socket.id}`);

      // Authentication handler
      socket.on('authenticate', async (data) => {
        await this.handleAuthentication(socket, data);
      });

      // Building subscription handler
      socket.on('subscribe_building', (data) => {
        this.handleBuildingSubscription(socket, data);
      });

      // Zone subscription handler
      socket.on('subscribe_zone', (data) => {
        this.handleZoneSubscription(socket, data);
      });

      // Zone unsubscription handler
      socket.on('unsubscribe_zone', (data) => {
        this.handleZoneUnsubscription(socket, data);
      });

      // Ping handler
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error(`WebSocket error for ${socket.id}:`, error);
      });
    });
  }

  private async handleAuthentication(
    socket: any,
    data: { token: string }
  ): Promise<void> {
    try {
      if (!data.token) {
        socket.emit('auth_error', {
          error: 'Token is required',
          code: 'MISSING_TOKEN',
        });
        socket.disconnect();
        return;
      }

      // Verify JWT token
      const payload = AuthService.verifyAccessToken(data.token);
      const tokenHash = AuthService.generateTokenHash(data.token);

      // Validate session
      const session = await AuthService.validateSession(tokenHash);
      if (!session) {
        socket.emit('auth_error', {
          error: 'Invalid or expired session',
          code: 'INVALID_SESSION',
        });
        socket.disconnect();
        return;
      }

      // Get user details
      const user = await dbService.getUserById(payload.userId);
      if (!user || !user.is_active) {
        socket.emit('auth_error', {
          error: 'User not found or inactive',
          code: 'USER_INACTIVE',
        });
        socket.disconnect();
        return;
      }

      // Store authenticated client
      const authenticatedSocket: AuthenticatedSocket = {
        id: socket.id,
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
        subscribedZones: new Set(),
      };

      this.authenticatedClients.set(socket.id, authenticatedSocket);

      socket.emit('authenticated', {
        success: true,
        user: authenticatedSocket.user,
        timestamp: new Date().toISOString(),
      });

      logger.info(
        `User ${user.email} authenticated via WebSocket: ${socket.id}`
      );
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      socket.emit('auth_error', {
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
      socket.disconnect();
    }
  }

  private handleBuildingSubscription(
    socket: any,
    data: { buildingId: string }
  ): void {
    const client = this.authenticatedClients.get(socket.id);
    if (!client) {
      socket.emit('error', { error: 'Not authenticated' });
      return;
    }

    if (!data.buildingId) {
      socket.emit('error', { error: 'Building ID is required' });
      return;
    }

    // Join building room
    socket.join(`building:${data.buildingId}`);
    client.buildingId = data.buildingId;

    // Add to building subscriptions
    if (!this.buildingSubscriptions.has(data.buildingId)) {
      this.buildingSubscriptions.set(data.buildingId, new Set());
    }
    this.buildingSubscriptions.get(data.buildingId)!.add(socket.id);

    socket.emit('building_subscribed', {
      buildingId: data.buildingId,
      timestamp: new Date().toISOString(),
    });

    logger.debug(
      `Client ${socket.id} subscribed to building ${data.buildingId}`
    );
  }

  private handleZoneSubscription(socket: any, data: { zoneId: string }): void {
    const client = this.authenticatedClients.get(socket.id);
    if (!client) {
      socket.emit('error', { error: 'Not authenticated' });
      return;
    }

    if (!data.zoneId) {
      socket.emit('error', { error: 'Zone ID is required' });
      return;
    }

    // Join zone room
    socket.join(`zone:${data.zoneId}`);
    client.subscribedZones.add(data.zoneId);

    // Add to zone subscriptions
    if (!this.zoneSubscriptions.has(data.zoneId)) {
      this.zoneSubscriptions.set(data.zoneId, new Set());
    }
    this.zoneSubscriptions.get(data.zoneId)!.add(socket.id);

    socket.emit('zone_subscribed', {
      zoneId: data.zoneId,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Client ${socket.id} subscribed to zone ${data.zoneId}`);
  }

  private handleZoneUnsubscription(
    socket: any,
    data: { zoneId: string }
  ): void {
    const client = this.authenticatedClients.get(socket.id);
    if (!client) {
      socket.emit('error', { error: 'Not authenticated' });
      return;
    }

    if (!data.zoneId) {
      socket.emit('error', { error: 'Zone ID is required' });
      return;
    }

    // Leave zone room
    socket.leave(`zone:${data.zoneId}`);
    client.subscribedZones.delete(data.zoneId);

    // Remove from zone subscriptions
    const zoneSubscribers = this.zoneSubscriptions.get(data.zoneId);
    if (zoneSubscribers) {
      zoneSubscribers.delete(socket.id);
      if (zoneSubscribers.size === 0) {
        this.zoneSubscriptions.delete(data.zoneId);
      }
    }

    socket.emit('zone_unsubscribed', {
      zoneId: data.zoneId,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Client ${socket.id} unsubscribed from zone ${data.zoneId}`);
  }

  private handleDisconnection(socket: any, reason: string): void {
    const client = this.authenticatedClients.get(socket.id);
    if (client) {
      // Remove from building subscriptions
      if (client.buildingId) {
        const buildingSubscribers = this.buildingSubscriptions.get(
          client.buildingId
        );
        if (buildingSubscribers) {
          buildingSubscribers.delete(socket.id);
          if (buildingSubscribers.size === 0) {
            this.buildingSubscriptions.delete(client.buildingId);
          }
        }
      }

      // Remove from zone subscriptions
      client.subscribedZones.forEach((zoneId) => {
        const zoneSubscribers = this.zoneSubscriptions.get(zoneId);
        if (zoneSubscribers) {
          zoneSubscribers.delete(socket.id);
          if (zoneSubscribers.size === 0) {
            this.zoneSubscriptions.delete(zoneId);
          }
        }
      });

      this.authenticatedClients.delete(socket.id);
      logger.info(
        `User ${client.user.email} disconnected: ${socket.id} (${reason})`
      );
    } else {
      logger.debug(
        `Unauthenticated client disconnected: ${socket.id} (${reason})`
      );
    }
  }

  // =============================================================================
  // Event Broadcasting Methods
  // =============================================================================

  public broadcastSensorReading(zoneId: string, reading: any): void {
    const event: SensorUpdateEvent = {
      zoneId,
      reading,
    };

    this.io.to(`zone:${zoneId}`).emit('sensor_reading', event);
    logger.debug(`Broadcasted sensor reading for zone ${zoneId}`);
  }

  public broadcastOccupancyUpdate(
    zoneId: string,
    occupancy: OccupancyLog
  ): void {
    const event: OccupancyUpdateEvent = {
      zoneId,
      occupancy: occupancy.occupancy_count,
      maxOccupancy: occupancy.max_occupancy,
      timestamp: occupancy.time,
    };

    this.io.to(`zone:${zoneId}`).emit('occupancy_update', event);
    logger.debug(`Broadcasted occupancy update for zone ${zoneId}`);
  }

  public broadcastNewAlert(
    buildingId: string,
    zoneId: string,
    alert: any
  ): void {
    const event: AlertEvent = { alert };

    // Send to building subscribers
    this.io.to(`building:${buildingId}`).emit('alert_new', event);

    // Send to zone subscribers
    this.io.to(`zone:${zoneId}`).emit('alert_new', event);

    logger.info(
      `Broadcasted new alert for building ${buildingId}, zone ${zoneId}`
    );
  }

  public broadcastAlertResolved(
    buildingId: string,
    zoneId: string,
    alert: any
  ): void {
    const event: AlertEvent = { alert };

    // Send to building subscribers
    this.io.to(`building:${buildingId}`).emit('alert_resolved', event);

    // Send to zone subscribers
    this.io.to(`zone:${zoneId}`).emit('alert_resolved', event);

    logger.info(
      `Broadcasted alert resolved for building ${buildingId}, zone ${zoneId}`
    );
  }

  public broadcastSystemStatus(buildingId: string, status: any): void {
    const event = {
      type: 'system_status',
      data: status,
      timestamp: new Date().toISOString(),
    } as WebSocketEvent;

    this.io.to(`building:${buildingId}`).emit('system_status', event);
    logger.debug(`Broadcasted system status for building ${buildingId}`);
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  public getConnectedClientsCount(): number {
    return this.authenticatedClients.size;
  }

  public getConnectedClientsForBuilding(buildingId: string): number {
    return this.buildingSubscriptions.get(buildingId)?.size || 0;
  }

  public getConnectedClientsForZone(zoneId: string): number {
    return this.zoneSubscriptions.get(zoneId)?.size || 0;
  }

  public getBuildingSubscriptions(): Map<string, Set<string>> {
    return new Map(this.buildingSubscriptions);
  }

  public getZoneSubscriptions(): Map<string, Set<string>> {
    return new Map(this.zoneSubscriptions);
  }

  // Send notification to specific user
  public sendToUser(userId: string, event: string, data: any): void {
    const userClients = Array.from(this.authenticatedClients.values()).filter(
      (client) => client.user.id === userId
    );

    userClients.forEach((client) => {
      this.io.to(client.id).emit(event, data);
    });

    if (userClients.length > 0) {
      logger.debug(
        `Sent event '${event}' to user ${userId} (${userClients.length} clients)`
      );
    }
  }

  // Send notification to all authenticated clients
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
    logger.debug(`Broadcasted event '${event}' to all clients`);
  }

  // Send notification to specific building
  public sendToBuilding(buildingId: string, event: string, data: any): void {
    this.io.to(`building:${buildingId}`).emit(event, data);
    logger.debug(`Sent event '${event}' to building ${buildingId}`);
  }

  // Send notification to specific zone
  public sendToZone(zoneId: string, event: string, data: any): void {
    this.io.to(`zone:${zoneId}`).emit(event, data);
    logger.debug(`Sent event '${event}' to zone ${zoneId}`);
  }

  // Health check for WebSocket service
  public getHealthStatus(): {
    status: string;
    connectedClients: number;
    buildingSubscriptions: number;
    zoneSubscriptions: number;
    uptime: number;
  } {
    return {
      status: 'healthy',
      connectedClients: this.authenticatedClients.size,
      buildingSubscriptions: this.buildingSubscriptions.size,
      zoneSubscriptions: this.zoneSubscriptions.size,
      uptime: process.uptime(),
    };
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket service...');

    // Notify all clients about shutdown
    this.broadcast('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString(),
    });

    // Close all connections
    this.io.close();

    // Clear internal state
    this.authenticatedClients.clear();
    this.buildingSubscriptions.clear();
    this.zoneSubscriptions.clear();

    logger.info('WebSocket service shutdown complete');
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export const initializeWebSocket = (
  httpServer: HttpServer
): WebSocketService => {
  if (wsService) {
    throw new Error('WebSocket service already initialized');
  }

  wsService = new WebSocketService(httpServer);
  return wsService;
};

export const getWebSocketService = (): WebSocketService => {
  if (!wsService) {
    throw new Error('WebSocket service not initialized');
  }
  return wsService;
};

export default WebSocketService;
