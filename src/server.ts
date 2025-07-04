import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { config } from './config/env';
import { logger } from './utils/logger';

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: config.corsOrigin })); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/', routes);

// Error handling middleware
app.use('*', notFound); // 404 handler
app.use(errorHandler); // General error handler

// Start server
app.listen(config.port, () => {
  logger.info(
    `🚀 Air Harmony Insight API server is running on port ${config.port}`
  );
  logger.info(`📊 Health check: http://localhost:${config.port}/health`);
  logger.info(`🔗 API endpoint: http://localhost:${config.port}/api`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
});

export default app;
