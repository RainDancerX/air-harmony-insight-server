# Frontend API - IAQ Monitoring System

## Overview

This document outlines all API endpoints and data structures required for the Indoor Air Quality (IAQ) monitoring frontend application. The system monitors building zones with various sensors and provides real-time updates, analytics, alerts, and AI-powered insights.

## Core Data Structures

### SensorReading

```typescript
interface SensorReading {
  id: string;
  type: 'PM2.5' | 'CO2' | 'TVOC' | 'Temperature' | 'Humidity' | 'Pressure';
  value: number;
  unit: string;
  timestamp: string; // ISO 8601 format
  status: 'good' | 'moderate' | 'poor' | 'critical';
  threshold: {
    good: number;
    moderate: number;
    poor: number;
    critical: number;
  };
}
```

### Zone

```typescript
interface Zone {
  id: string;
  name: string;
  floor: number;
  readings: SensorReading[];
  occupancy: number;
  maxOccupancy: number;
  lastUpdated: string; // ISO 8601 format
}
```

### BuildingData

```typescript
interface BuildingData {
  id: string;
  name: string;
  zones: Zone[];
  overallAirQuality: 'good' | 'moderate' | 'poor' | 'critical';
  lastUpdated: string; // ISO 8601 format
  address: string;
}
```

### AlertNotification

```typescript
interface AlertNotification {
  id: string;
  zoneId: string;
  zoneName: string;
  sensorType:
    | 'PM2.5'
    | 'CO2'
    | 'TVOC'
    | 'Temperature'
    | 'Humidity'
    | 'Pressure';
  value: number;
  unit: string;
  status: 'good' | 'moderate' | 'poor' | 'critical';
  timestamp: string; // ISO 8601 format
  isRead: boolean;
}
```

---

## API Endpoints by Page

## Dashboard Page (`/`)

### GET `/api/buildings/{buildingId}`

**Purpose**: Get complete building data with all zones and current sensor readings
**Response**: `BuildingData`
**Usage**: Initial dashboard load

### GET `/api/buildings/{buildingId}/alerts`

**Purpose**: Get current active alerts for the building
**Response**: `AlertNotification[]`
**Usage**: Display alerts panel

### WebSocket `/ws/buildings/{buildingId}/realtime`

**Purpose**: Real-time updates for sensor readings and occupancy
**Events**:

- `sensor_update`: Updated sensor reading
- `occupancy_update`: Zone occupancy change
- `new_alert`: New alert generated
- `alert_resolved`: Alert no longer active

### GET `/api/buildings/{buildingId}/overview`

**Purpose**: Get aggregated data for air quality overview charts
**Response**:

```typescript
{
  totalZones: number;
  statusCounts: {
    good: number;
    moderate: number;
    poor: number;
    critical: number;
  };
  averageReadings: {
    [sensorType: string]: {
      value: number;
      unit: string;
      status: string;
    };
  };
}
```

---

## Zones Page (`/zones`)

### GET `/api/buildings/{buildingId}/zones`

**Purpose**: Get all zones with current readings
**Query Parameters**:

- `floor?`: number - Filter by floor
- `search?`: string - Search zone names
- `status?`: string - Filter by air quality status
  **Response**: `Zone[]`

### GET `/api/buildings/{buildingId}/zones/{zoneId}`

**Purpose**: Get specific zone details
**Response**: `Zone`

---

## Zone Details Page (`/zones/{zoneId}`)

### GET `/api/zones/{zoneId}/details`

**Purpose**: Get comprehensive zone data including historical trends
**Response**:

```typescript
{
  zone: Zone;
  historicalData: {
    [sensorType: string]: {
      timestamp: string;
      value: number;
    }[];
  };
  recommendations: string[];
}
```

### GET `/api/zones/{zoneId}/history`

**Purpose**: Get historical sensor data for charts
**Query Parameters**:

- `sensorType`: string - Specific sensor type
- `period`: '24h' | '7d' | '30d' - Time period
- `interval`: '5m' | '1h' | '1d' - Data granularity
  **Response**:

```typescript
{
  sensorType: string;
  unit: string;
  data: {
    timestamp: string;
    value: number;
  }
  [];
  thresholds: {
    good: number;
    moderate: number;
    poor: number;
    critical: number;
  }
}
```

### POST `/api/zones/{zoneId}/controls`

**Purpose**: Send control commands to zone systems
**Request Body**:

```typescript
{
  action: 'increase_ventilation' | 'decrease_ventilation' | 'adjust_temperature' | 'emergency_purge';
  parameters?: {
    temperature?: number;
    ventilationLevel?: number;
  };
}
```

**Response**: `{ success: boolean; message: string; }`

---

## Analytics Page (`/analytics`)

### GET `/api/analytics/trends`

**Purpose**: Get historical trend data for analytics charts
**Query Parameters**:

- `period`: '7d' | '30d' | '90d'
- `sensorTypes`: string[] - Array of sensor types
- `zoneIds?`: string[] - Specific zones (optional)
  **Response**:

```typescript
{
  period: string;
  data: {
    timestamp: string;
    values: {
      [sensorType: string]: number;
    };
  }[];
  summary: {
    [sensorType: string]: {
      average: number;
      min: number;
      max: number;
      trend: 'improving' | 'stable' | 'deteriorating';
    };
  };
}
```

### GET `/api/analytics/zones/comparison`

**Purpose**: Get current readings comparison across all zones
**Response**:

```typescript
{
  zones: {
    id: string;
    name: string;
    floor: number;
    readings: {
      [sensorType: string]: {
        value: number;
        status: string;
        unit: string;
      };
    };
  }[];
}
```

### GET `/api/analytics/occupancy`

**Purpose**: Get occupancy vs air quality correlation data
**Query Parameters**:

- `period`: '7d' | '30d'
  **Response**:

```typescript
{
  correlationData: {
    timestamp: string;
    occupancy: number;
    airQualityScore: number;
    zoneId: string;
    zoneName: string;
  }[];
  insights: string[];
}
```

---

## AI Reports Page (`/ai-reports`)

### POST `/api/ai/reports/generate`

**Purpose**: Generate new AI report
**Request Body**:

```typescript
{
  type: 'daily' | 'weekly' | 'monthly';
  buildingId: string;
  zoneIds?: string[]; // Optional: specific zones
}
```

**Response**:

```typescript
{
  reportId: string;
  type: string;
  generatedAt: string;
  content: string; // Markdown formatted content
  summary: {
    overallScore: number;
    keyFindings: string[];
    recommendations: string[];
    energyEfficiency: number;
  };
}
```

### GET `/api/ai/reports/{reportId}`

**Purpose**: Get existing AI report
**Response**: Same as generate response

### GET `/api/ai/reports/latest`

**Purpose**: Get latest reports by type
**Query Parameters**:

- `type`: 'daily' | 'weekly' | 'monthly'
- `buildingId`: string
  **Response**: Same as generate response

---

## Settings Page (`/settings`)

### GET `/api/settings/building/{buildingId}`

**Purpose**: Get building configuration settings
**Response**:

```typescript
{
  buildingName: string;
  timezone: string;
  temperatureUnit: 'celsius' | 'fahrenheit';
  address: string;
  contactInfo: {
    email: string;
    phone?: string;
  };
}
```

### PUT `/api/settings/building/{buildingId}`

**Purpose**: Update building settings
**Request Body**: Same as GET response
**Response**: `{ success: boolean; message: string; }`

### GET `/api/settings/notifications/{userId}`

**Purpose**: Get user notification preferences
**Response**:

```typescript
{
  notificationsEnabled: boolean;
  soundAlertsEnabled: boolean;
  priority: 'critical' | 'poor' | 'all';
  email: string;
  pushNotifications: boolean;
}
```

### PUT `/api/settings/notifications/{userId}`

**Purpose**: Update notification settings
**Request Body**: Same as GET response
**Response**: `{ success: boolean; message: string; }`

### GET `/api/settings/sensors/{buildingId}`

**Purpose**: Get sensor threshold configurations
**Response**:

```typescript
{
  thresholds: {
    [sensorType: string]: {
      good: number;
      moderate: number;
      poor: number;
      critical: number;
      unit: string;
    };
  };
  calibrationData: {
    [sensorId: string]: {
      lastCalibrated: string;
      offset: number;
      accuracy: number;
    };
  };
}
```

### PUT `/api/settings/sensors/{buildingId}`

**Purpose**: Update sensor thresholds
**Request Body**: Same as GET response
**Response**: `{ success: boolean; message: string; }`

---

## User Management

### GET `/api/users/profile`

**Purpose**: Get current user profile
**Response**:

```typescript
{
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  permissions: string[];
  lastLogin: string;
}
```

### PUT `/api/users/profile`

**Purpose**: Update user profile
**Request Body**:

```typescript
{
  name: string;
  email: string;
}
```

**Response**: `{ success: boolean; message: string; }`

### POST `/api/users/change-password`

**Purpose**: Change user password
**Request Body**:

```typescript
{
  currentPassword: string;
  newPassword: string;
}
```

**Response**: `{ success: boolean; message: string; }`

---

## Chat/AI Assistant

### POST `/api/ai/chat`

**Purpose**: Send message to AI assistant
**Request Body**:

```typescript
{
  message: string;
  context?: {
    page: string;
    zoneId?: string;
    alertId?: string;
    additionalData?: any;
  };
  conversationId?: string;
}
```

**Response**:

```typescript
{
  response: string;
  conversationId: string;
  suggestions?: string[];
  actions?: {
    type: 'navigate' | 'adjust_setting' | 'generate_report';
    parameters: any;
  }[];
}
```

### GET `/api/ai/chat/history/{conversationId}`

**Purpose**: Get chat conversation history
**Response**:

```typescript
{
  messages: {
    id: string;
    text: string;
    sender: 'user' | 'system';
    timestamp: string;
  }
  [];
}
```

---

## Alert Management

### PUT `/api/alerts/{alertId}/mark-read`

**Purpose**: Mark alert as read
**Response**: `{ success: boolean; }`

### DELETE `/api/alerts/{alertId}`

**Purpose**: Dismiss/delete alert
**Response**: `{ success: boolean; }`

### DELETE `/api/alerts/building/{buildingId}/clear-all`

**Purpose**: Clear all alerts for building
**Response**: `{ success: boolean; count: number; }`

### GET `/api/alerts/building/{buildingId}/history`

**Purpose**: Get alert history
**Query Parameters**:

- `period`: '7d' | '30d' | '90d'
- `status?`: 'poor' | 'critical'
- `zoneId?`: string
  **Response**: `AlertNotification[]`

---

## Command/Search

### GET `/api/search/zones`

**Purpose**: Search zones for command bar
**Query Parameters**:

- `q`: string - Search query
- `buildingId`: string
  **Response**:

```typescript
{
  zones: {
    id: string;
    name: string;
    floor: number;
    status: string;
  }
  [];
}
```

### GET `/api/search/commands`

**Purpose**: Get available commands for command bar
**Response**:

```typescript
{
  commands: {
    id: string;
    name: string;
    description: string;
    category: 'navigation' | 'control' | 'report';
    action: string;
  }
  [];
}
```

---

## Real-time Communication

### WebSocket Events

**Connection**: `/ws/buildings/{buildingId}`

**Client → Server Events**:

- `subscribe_zone`: Subscribe to specific zone updates
- `unsubscribe_zone`: Unsubscribe from zone updates
- `ping`: Keep connection alive

**Server → Client Events**:

- `sensor_reading`: New sensor reading
- `occupancy_update`: Zone occupancy change
- `alert_new`: New alert generated
- `alert_resolved`: Alert resolved
- `system_status`: System status change

**Event Data Structures**:

```typescript
// sensor_reading
{
  zoneId: string;
  reading: SensorReading;
}

// occupancy_update
{
  zoneId: string;
  occupancy: number;
  maxOccupancy: number;
  timestamp: string;
}

// alert_new/alert_resolved
{
  alert: AlertNotification;
}
```

---

## Error Handling

All APIs should return consistent error responses:

```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}
```

**Common HTTP Status Codes**:

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Rate Limited
- `500`: Internal Server Error

---

## Authentication

All API endpoints require authentication except public health checks.

**Headers Required**:

```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Auth Endpoints** (if implementing custom auth):

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

---

## Rate Limiting

Recommended rate limits:

- Real-time APIs: 100 requests/minute
- Historical data APIs: 50 requests/minute
- AI/Report generation: 10 requests/minute
- Settings updates: 20 requests/minute

---

## Caching Strategy

**Client-side caching recommendations**:

- Building data: 30 seconds
- Zone details: 10 seconds
- Historical data: 5 minutes
- User settings: Session duration
- AI reports: Until regenerated

**Cache invalidation**:

- Real-time WebSocket updates should invalidate relevant cached data
- Settings changes should immediately update cached values

---

## Notes for Backend Implementation

1. **Real-time Updates**: Implement WebSocket connections for live sensor data
2. **Data Retention**: Define retention policies for historical sensor data
3. **Alerting**: Implement threshold-based alerting system with configurable rules
4. **AI Integration**: Plan for AI service integration for report generation and chat
5. **Scalability**: Consider database optimization for time-series sensor data
6. **Backup**: Implement data backup strategies for critical building data
7. **Security**: Implement proper authentication, authorization, and data encryption
8. **Monitoring**: Add API monitoring and logging for system health
9. **Documentation**: Consider implementing OpenAPI/Swagger documentation
10. **Testing**: Plan for comprehensive API testing including WebSocket connections
