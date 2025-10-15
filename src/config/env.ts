import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database configuration (TimescaleDB/PostgreSQL)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'smart_building_iaq',
    user: process.env.DB_USER || 'iaq_admin',
    password: process.env.DB_PASSWORD || 'SecureIAQPass2024!',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(
      process.env.DB_CONNECTION_TIMEOUT || '2000'
    ),
    ssl: process.env.DB_SSL === 'true',
  },

  // Redis configuration (for caching and sessions)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    enableOfflineQueue: false,
    maxmemoryPolicy: 'allkeys-lru',
  },

  // JWT configuration
  jwt: {
    secret:
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-32-chars-minimum',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'your-refresh-secret-key-32-chars-minimum',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
  },

  // WebSocket configuration
  websocket: {
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000'),
    maxHttpBufferSize: parseInt(
      process.env.WS_MAX_HTTP_BUFFER_SIZE || '1048576'
    ), // 1MB
  },

  // Sensor data configuration
  sensors: {
    dataRetentionDays: parseInt(
      process.env.SENSOR_DATA_RETENTION_DAYS || '365'
    ),
    alertRetentionDays: parseInt(process.env.ALERT_RETENTION_DAYS || '90'),
    batchInsertSize: parseInt(process.env.SENSOR_BATCH_INSERT_SIZE || '1000'),
    maxReadingsPerRequest: parseInt(
      process.env.MAX_READINGS_PER_REQUEST || '10000'
    ),
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },

  // Chat configuration
  chat: {
    historyRetentionDays: parseInt(
      process.env.CHAT_HISTORY_RETENTION_DAYS || '30'
    ),
    maxMessagesPerSession: parseInt(
      process.env.CHAT_MAX_MESSAGES_PER_SESSION || '50'
    ),
    rateLimitPerMinute: parseInt(
      process.env.CHAT_RATE_LIMIT_PER_MINUTE || '10'
    ),
  },

  // AI and reports configuration
  ai: {
    reportCacheHours: parseInt(process.env.AI_REPORT_CACHE_HOURS || '6'),
    maxReportGenerationTime: parseInt(
      process.env.AI_MAX_REPORT_TIME || '300000'
    ), // 5 minutes
    chatHistoryLimit: parseInt(process.env.AI_CHAT_HISTORY_LIMIT || '50'),
  },

  // Email configuration (for notifications)
  email: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    fromAddress: process.env.EMAIL_FROM || 'noreply@smartbuilding.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Smart Building Platform',
  },

  // File upload configuration
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760'), // 10MB
    allowedFileTypes: (
      process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf'
    ).split(','),
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },

  // Security configuration
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-key',
    csrfSecret: process.env.CSRF_SECRET || 'your-csrf-secret-key',
  },

  // Monitoring and analytics
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '3002'),
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  },

  // Environment helpers
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // API documentation
  swagger: {
    title: 'IAQ Monitoring API',
    description: 'Indoor Air Quality Monitoring System API',
    version: '1.0.0',
    basePath: '/api',
  },
};
