# Air Harmony Insight API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3001`  
**Protocol:** REST API + WebSocket (planned)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Buildings](#buildings)
3. [Zones](#zones)
4. [Sensor Data](#sensor-data)
5. [Alerts](#alerts)
6. [Error Handling](#error-handling)
7. [Usage Examples](#usage-examples)
8. [Status & Health](#status--health)

---

## Authentication

### Login

**POST** `/api/auth/login`

**Request:**

```json
{
  "email": "admin@greentech.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "<jwt-token>",
    "refreshToken": "<refresh-token>",
    "user": {
      "id": "...",
      "email": "admin@greentech.com",
      "name": "Admin User",
      "role": "admin",
      "permissions": [],
      "is_active": true
    },
    "expiresIn": "24h"
  }
}
```

### Get Current User

**GET** `/api/auth/me`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
      "data": {
      "id": "...",
      "email": "admin@greentech.com",
      "name": "Admin User",
      "role": "admin",
      ...
    }
}
```

### Logout

**POST** `/api/auth/logout`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Buildings

### List All Buildings

**GET** `/api/buildings`

**Headers:**

```
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Smart Tech Headquarters",
      ...
    }
  ]
}
```

### Get Building Details

**GET** `/api/buildings/{buildingId}`

### Get Building Overview (Dashboard)

**GET** `/api/buildings/{buildingId}/overview`

### Get Building Alerts

**GET** `/api/buildings/{buildingId}/alerts`

### Submit Sensor Data

**POST** `/api/buildings/{buildingId}/sensor-data`

**Request:**

```json
{
  "sensor_id": "770e8400-e29b-41d4-a716-446655440001",
  "value": 25.6,
  "timestamp": "2025-07-24T01:30:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2025-07-24T01:30:00Z",
    "status": "good",
    "message": "Sensor reading recorded successfully"
  }
}
```

---

## Zones

### List Zones for Building

**GET** `/api/zones/buildings/{buildingId}/zones`

**Query Parameters:**

- `floor` (optional)
- `status` (optional)
- `search` (optional)

### Get Zone Details

**GET** `/api/zones/{zoneId}/details`

### Get Zone Historical Data

**GET** `/api/zones/{zoneId}/history`

**Query Parameters:**

- `sensorType` (required): PM2.5, CO2, TVOC, Temperature, Humidity, Pressure
- `period` (optional): 24h, 7d, 30d (default: 24h)
- `interval` (optional): 5m, 1h, 1d (default: 1h)

### Send Zone Control Command

**POST** `/api/zones/{zoneId}/controls`

**Request:**

```json
{
  "action": "increase_ventilation",
  "parameters": {
    "level": "high",
    "duration": 30
  }
}
```

**Valid Actions:**

- `increase_ventilation`
- `decrease_ventilation`
- `adjust_temperature`
- `emergency_purge`

---

## Sensor Data

### Submit Sensor Data

See [Buildings > Submit Sensor Data](#submit-sensor-data)

### Bulk Sensor Data (Planned)

**POST** `/api/sensor-data/bulk` _(not implemented)_

---

## Alerts

### Get Building Alerts

**GET** `/api/buildings/{buildingId}/alerts`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "alert-uuid",
      "type": "air_quality",
      "severity": "high",
      "message": "PM2.5 levels exceed threshold",
      "zone_id": "zone-uuid",
      "sensor_id": "sensor-uuid",
      "triggered_at": "2025-07-24T01:00:00Z",
      "status": "active"
    }
  ]
}
```

### Global Alert Management (Planned)

- `GET /api/alerts` _(not implemented)_
- `POST /api/alerts/{alertId}/acknowledge` _(not implemented)_
- `POST /api/alerts/{alertId}/resolve` _(not implemented)_

---

## Error Handling

All API responses follow this structure:

```json
{
  "success": true,
  "data": ...
}
```

Or on error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "timestamp": "2025-07-24T01:00:00Z"
  }
}
```

**Common Error Codes:**

- `AUTH_ERROR`: Authentication failed
- `MISSING_TOKEN`: Authorization token is required
- `INVALID_CREDENTIALS`: Invalid email or password
- `SENSOR_NOT_FOUND`: Sensor not found
- `HISTORICAL_DATA_ERROR`: Failed to retrieve historical data
- `BUILDING_NOT_FOUND`: Building not found
- `ZONE_NOT_FOUND`: Zone not found
- `INVALID_SENSOR_DATA`: sensor_id and value are required
- `INVALID_SESSION`: Session is invalid or expired
- `ACCOUNT_INACTIVE`: Account is inactive

---

## Usage Examples

### Login and Get Buildings

```http
POST /api/auth/login
{
  "email": "admin@greentech.com",
  "password": "password123"
}

GET /api/buildings
Authorization: Bearer <token>
```

### Submit Sensor Data

```http
POST /api/buildings/550e8400-e29b-41d4-a716-446655440000/sensor-data
Authorization: Bearer <token>
Content-Type: application/json

{
  "sensor_id": "770e8400-e29b-41d4-a716-446655440001",
  "value": 25.6
}
```

### Get Zone Details

```http
GET /api/zones/660e8400-e29b-41d4-a716-446655440001/details
Authorization: Bearer <token>
```

### Get Building Alerts

```http
GET /api/buildings/550e8400-e29b-41d4-a716-446655440000/alerts
Authorization: Bearer <token>
```

---

## Status & Health

### Health Check

**GET** `/health`

**Response:**

```json
{
  "status": "OK",
  "message": "Air Harmony Insight API is running",
  "timestamp": "2025-07-24T01:00:00Z",
  "uptime": 123.45,
  "environment": "development"
}
```

### Building Health

**GET** `/api/buildings/{buildingId}/health`

**Response:**

```json
{
  "success": true,
  "data": {
    "building": {
      "id": "...",
      "name": "...",
      "status": "operational"
    },
    "zones": 8,
    "activeSensors": 12,
    "activeAlerts": 0,
    "connectedClients": 2,
    "lastUpdated": "2025-07-24T01:00:00Z"
  }
}
```

---

## Notes

- All endpoints require authentication except `/health` and `/api/auth/*`.
- Rate limiting is **disabled** in development mode.
- Use the REST Client extension for easy API testing.
- For more details, see the test files and endpoint reference docs in the repo.
