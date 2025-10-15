import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import configuration and utilities
import { config } from './config/env';
import { logger } from './utils/logger';
import { errorHandler, notFound } from './middleware/errorHandler';

// Import services
import { dbService } from './services/database';
import { initializeWebSocket, getWebSocketService } from './services/websocket';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import buildingRoutes from './routes/buildings';
import zoneRoutes from './routes/zones';
import chatRoutes from './routes/chat';
import apiRoutes from './routes/api';

const app = express();
const httpServer = createServer(app);

// =============================================================================
// Security and Performance Middleware
// =============================================================================

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  })
);

// Request logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Compression
app.use(compression());

// Rate limiting (DISABLED)
// const limiter = rateLimit({
//   windowMs: config.rateLimit.windowMs,
//   max: config.rateLimit.maxRequests,
//   message: {
//     success: false,
//     error: {
//       code: 'RATE_LIMIT_EXCEEDED',
//       message: 'Too many requests from this IP, please try again later',
//       timestamp: new Date().toISOString(),
//     },
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// =============================================================================
// Health Check Endpoint (before authentication)
// =============================================================================

app.use('/health', healthRoutes);

// Basic root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Air Harmony Insight API',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      buildings: '/api/buildings',
      zones: '/api/zones',
      chat: '/api/chat',
      websocket: '/ws',
    },
  });
});

// =============================================================================
// API Routes
// =============================================================================

// Authentication routes (no auth required)
app.use('/api/auth', authRoutes);

// Building management routes
app.use('/api/buildings', buildingRoutes);

// Zone management routes
app.use('/api/zones', zoneRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// General API info routes
app.use('/api', apiRoutes);

// =============================================================================
// WebSocket Health Endpoint
// =============================================================================

app.get('/ws/health', (req: Request, res: Response) => {
  try {
    const wsService = getWebSocketService();
    const healthStatus = wsService.getHealthStatus();

    res.json({
      success: true,
      data: healthStatus,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'WEBSOCKET_UNAVAILABLE',
        message: 'WebSocket service not available',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use(notFound);

// General error handler
app.use(errorHandler);

// =============================================================================
// Server Initialization
// =============================================================================

async function initializeServices(): Promise<void> {
  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    const dbHealthy = await dbService.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('✅ Database connection established');

    // Initialize WebSocket service
    logger.info('Initializing WebSocket service...');
    initializeWebSocket(httpServer);
    logger.info('✅ WebSocket service initialized');

    // Clean up expired sessions on startup
    logger.info('Cleaning up expired sessions...');
    await dbService.cleanupExpiredSessions();
    logger.info('✅ Expired sessions cleaned up');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

async function startServer(): Promise<void> {
  try {
    // Initialize services first
    await initializeServices();

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(
        `🚀 Air Harmony Insight API server is running on port ${config.port}`
      );
      logger.info(`📊 Health check: http://localhost:${config.port}/health`);
      logger.info(`🔗 API endpoint: http://localhost:${config.port}/api`);
      logger.info(`🌐 WebSocket endpoint: ws://localhost:${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`🔐 CORS origin: ${config.corsOrigin}`);

      if (config.isDevelopment) {
        logger.info('📝 Development mode - detailed logging enabled');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Close HTTP server
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Shutdown WebSocket service
    try {
      const wsService = getWebSocketService();
      await wsService.shutdown();
    } catch (wsError) {
      logger.warn('WebSocket service shutdown failed:', wsError);
    }

    // Close database connection
    await dbService.close();

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  void gracefulShutdown('unhandledRejection');
});

// =============================================================================
// Periodic Maintenance Tasks
// =============================================================================

if (!config.isTest) {
  // Clean up expired sessions every hour
  setInterval(async () => {
    try {
      await dbService.cleanupExpiredSessions();
      logger.debug('Periodic session cleanup completed');
    } catch (error) {
      logger.error('Session cleanup failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  // Log system stats every 30 minutes in development
  if (config.isDevelopment) {
    setInterval(() => {
      try {
        const wsService = getWebSocketService();
        const wsHealth = wsService.getHealthStatus();
        logger.info('System Stats:', {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          websocket: wsHealth,
        });
      } catch (error) {
        logger.debug('Stats logging failed:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }
}

// Start the server
startServer();

export default app;
