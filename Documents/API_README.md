# Air Harmony Insight API - IAQ Monitoring System

A comprehensive backend API for Indoor Air Quality (IAQ) monitoring built with Node.js, TypeScript, Express, TimescaleDB, and Socket.IO.

## 🏗️ Architecture Overview

This backend service provides:

- **Real-time IoT Sensor Data Processing** - TimescaleDB optimized time-series storage
- **WebSocket Real-time Updates** - Live sensor readings, occupancy, and alerts
- **RESTful API** - Complete CRUD operations for buildings, zones, sensors
- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Alert System** - Automated threshold-based alerting with real-time notifications
- **Analytics & Reporting** - Historical data analysis and AI-powered insights

## 📦 Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: TimescaleDB (PostgreSQL extension for time-series)
- **Cache**: Redis (sessions, rate limiting)
- **WebSocket**: Socket.IO for real-time communication
- **Authentication**: JWT with session management
- **Security**: Helmet, CORS, rate limiting, input validation

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Node.js 18+
- TimescaleDB (PostgreSQL with TimescaleDB extension)
- Redis (optional but recommended)

# Development tools
- npm or yarn
- Docker (optional - for database setup)
```

### 1. Installation

```bash
# Clone and install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

### 2. Environment Configuration

Create `.env` file with these essential variables:

```env
# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database (TimescaleDB)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_building_iaq
DB_USER=iaq_admin
DB_PASSWORD=SecureIAQPass2024!

# JWT
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
JWT_EXPIRES_IN=24h

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Database Setup

```sql
-- Create database and enable TimescaleDB
CREATE DATABASE smart_building_iaq;
\c smart_building_iaq;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run the database schema from Documents/database.md
-- (15 tables: 4 hypertables + 11 regular tables)
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001` with:

- API endpoints: `/api/*`
- WebSocket: `ws://localhost:3001`
- Health check: `/health`

## 📚 API Documentation

### Authentication

All API endpoints require authentication except `/health` and `/api/auth/*`.

```bash
# Login
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password"
}

# Response
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "refreshToken": "refresh_token",
    "user": { ... },
    "expiresIn": "24h"
  }
}

# Use token in headers
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### Buildings API

```bash
# Get building dashboard data
GET /api/buildings/{buildingId}

# Get building overview/analytics
GET /api/buildings/{buildingId}/overview

# Get active alerts
GET /api/buildings/{buildingId}/alerts

# Submit sensor data (IoT devices)
POST /api/buildings/{buildingId}/sensor-data
{
  "sensor_id": "uuid",
  "value": 25.6,
  "timestamp": "2024-01-15T10:30:00Z"
}

# Update occupancy
POST /api/buildings/{buildingId}/occupancy
{
  "zone_id": "uuid",
  "occupancy_count": 15,
  "detection_method": "sensor"
}
```

#### Zones API

```bash
# Get zones with filtering
GET /api/buildings/{buildingId}/zones?floor=1&status=poor&search=office

# Get zone details with history
GET /api/zones/{zoneId}/details

# Get historical sensor data
GET /api/zones/{zoneId}/history?sensorType=PM2.5&period=24h&interval=1h

# Send control commands (admin/manager only)
POST /api/zones/{zoneId}/controls
{
  "action": "increase_ventilation",
  "parameters": {
    "level": "high"
  }
}
```

### WebSocket Events

Connect to `ws://localhost:3001` and authenticate:

```javascript
const socket = io('http://localhost:3001');

// Authenticate
socket.emit('authenticate', { token: 'your_jwt_token' });

// Subscribe to building updates
socket.emit('subscribe_building', { buildingId: 'uuid' });

// Subscribe to zone updates
socket.emit('subscribe_zone', { zoneId: 'uuid' });

// Listen for real-time events
socket.on('sensor_reading', (data) => {
  console.log('New sensor reading:', data);
});

socket.on('occupancy_update', (data) => {
  console.log('Occupancy changed:', data);
});

socket.on('alert_new', (data) => {
  console.log('New alert:', data);
});
```

## 🔧 Database Schema

The system uses **15 tables** optimized for IoT time-series data:

### Core Tables (11)

- `buildings` - Building information
- `zones` - Building zones/rooms
- `sensor_types` - Sensor type definitions and thresholds
- `sensors` - Physical sensor devices
- `users` - User accounts and roles
- `ai_reports` - Generated AI reports
- `chat_conversations` & `chat_messages` - AI chat system
- `user_sessions` - JWT session management
- `building_settings` & `user_notification_settings` - Configuration
- `system_configuration` - Global settings

### Time-Series Tables (4 Hypertables)

- `sensor_readings` - IoT sensor data (partitioned by time)
- `occupancy_logs` - Zone occupancy tracking
- `alerts` - Alert history and status
- `audit_logs` - System audit trail

### Sensor Types Supported

| Type        | Unit  | Good  | Moderate  | Poor      | Critical |
| ----------- | ----- | ----- | --------- | --------- | -------- |
| PM2.5       | μg/m³ | <12   | 12-35     | 35-55     | >55      |
| CO2         | ppm   | <800  | 800-1000  | 1000-1500 | >1500    |
| TVOC        | mg/m³ | <0.25 | 0.25-0.5  | 0.5-1.0   | >1.0     |
| Temperature | °C    | <22   | 22-24     | 24-27     | >27      |
| Humidity    | %     | >40   | 30-40     | 20-30     | <20      |
| Pressure    | hPa   | >1013 | 1000-1013 | 990-1000  | <990     |

## 🚦 Health Monitoring

### System Health Endpoints

```bash
# Server health
GET /health

# Database health
GET /api/buildings/{buildingId}/health

# WebSocket health
GET /ws/health
```

### Monitoring Features

- **Graceful shutdown** handling
- **Automatic session cleanup** (hourly)
- **Database connection pooling** with health checks
- **WebSocket connection monitoring**
- **Rate limiting** with configurable thresholds
- **Comprehensive logging** with structured format

## 🔒 Security Features

### Authentication & Authorization

- **JWT tokens** with session management
- **Role-based access control** (admin, manager, viewer)
- **Password hashing** with bcrypt (12 rounds)
- **Session invalidation** on logout
- **Token expiration** handling

### Security Middleware

- **Helmet.js** - Security headers
- **CORS** - Configurable origins
- **Rate limiting** - Per-IP and per-user
- **Input validation** - Request sanitization
- **SQL injection prevention** - Parameterized queries

## 📊 Real-time Features

### WebSocket Events

- `sensor_reading` - New sensor data
- `occupancy_update` - Zone occupancy changes
- `alert_new` - New alert generated
- `alert_resolved` - Alert resolved
- `zone_control` - Control command executed
- `system_status` - System status updates

### Alert System

- **Automatic generation** based on sensor thresholds
- **Real-time broadcasting** to connected clients
- **Severity levels** (low, medium, high, critical)
- **Resolution tracking** with user attribution
- **Historical storage** for analysis

## 🔧 Performance Optimizations

### TimescaleDB Features

- **Automatic compression** (7 days old data)
- **Data retention policies** (2 years sensor data)
- **Continuous aggregates** for fast analytics
- **Parallel processing** for large datasets
- **Efficient indexing** for time-series queries

### Caching Strategy

- **Redis caching** for frequent queries
- **Session storage** in Redis
- **WebSocket state management**
- **Rate limiting** with Redis

## 🧪 Development

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server
npm test         # Run tests (to be implemented)
```

### Project Structure

```
src/
├── server.ts              # Main server file
├── config/
│   └── env.ts             # Environment configuration
├── middleware/
│   ├── auth.ts            # Authentication & authorization
│   └── errorHandler.ts    # Error handling
├── routes/
│   ├── auth.ts            # Authentication routes
│   ├── buildings.ts       # Building management
│   ├── zones.ts           # Zone management
│   └── health.ts          # Health checks
├── services/
│   ├── database.ts        # TimescaleDB service
│   └── websocket.ts       # WebSocket service
├── types/
│   └── index.ts           # TypeScript type definitions
└── utils/
    └── logger.ts          # Logging utility
```

### Adding New Features

1. **New API Endpoint**:

   - Add route handler in appropriate file
   - Update type definitions
   - Add database queries if needed
   - Update this documentation

2. **New Sensor Type**:

   ```sql
   INSERT INTO sensor_types (type_name, unit, good_threshold, moderate_threshold, poor_threshold, critical_threshold, description)
   VALUES ('NO2', 'ppb', 20.0, 40.0, 100.0, 200.0, 'Nitrogen dioxide');
   ```

3. **New WebSocket Event**:
   - Add event type to WebSocket service
   - Update client event handlers
   - Add broadcasting logic

## 🚀 Production Deployment

### Environment Variables

```env
NODE_ENV=production
LOG_LEVEL=warn

# Strong passwords and secrets
JWT_SECRET=strong-32-char-secret-for-production
DB_PASSWORD=strong-database-password

# SSL Configuration
DB_SSL=true

# Performance
DB_MAX_CONNECTIONS=50
REDIS_MAXMEMORY=2gb

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=3002
```

### Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Enable database SSL
- [ ] Configure proper CORS origins
- [ ] Set up reverse proxy (nginx)
- [ ] Enable HTTPS
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Regular security updates

### Scaling Considerations

- **Database**: TimescaleDB clustering for high availability
- **Redis**: Redis Cluster for session scaling
- **Load Balancing**: Multiple server instances behind load balancer
- **WebSocket**: Sticky sessions for WebSocket connections
- **Monitoring**: Prometheus/Grafana for metrics

## 📈 API Usage Examples

### Complete Dashboard Data Flow

```typescript
// 1. Authenticate
const authResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { token } = await authResponse.json();

// 2. Get building data
const buildingResponse = await fetch('/api/buildings/uuid', {
  headers: { Authorization: `Bearer ${token}` },
});
const buildingData = await buildingResponse.json();

// 3. Connect WebSocket for real-time updates
const socket = io('http://localhost:3001');
socket.emit('authenticate', { token });
socket.emit('subscribe_building', { buildingId: 'uuid' });

// 4. Listen for real-time updates
socket.on('sensor_reading', updateDashboard);
socket.on('alert_new', showAlert);
```

### IoT Device Integration

```typescript
// Sensor data submission from IoT device
const submitSensorData = async (buildingId: string, readings: any[]) => {
  for (const reading of readings) {
    await fetch(`/api/buildings/${buildingId}/sensor-data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${iotDeviceToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sensor_id: reading.sensorId,
        value: reading.value,
        timestamp: reading.timestamp,
        quality_score: reading.quality,
      }),
    });
  }
};
```

This comprehensive backend provides a production-ready foundation for IoT-based indoor air quality monitoring with real-time capabilities, comprehensive security, and scalable architecture.
