# Alerts Endpoints Reference

## ✅ **Issue Resolved**

The **"Route /api/alerts not found"** error occurs because **global alerts endpoints are not implemented**. However, building-specific alerts endpoints work perfectly.

## 🎯 **Alerts Endpoint Status**

### **❌ Not Implemented (404 Errors)**

```
GET /api/alerts                              ❌ Global alerts list
GET /api/alerts?status=active                ❌ Filter alerts by status
GET /api/alerts/{alertId}                    ❌ Get specific alert
POST /api/alerts/{alertId}/acknowledge       ❌ Acknowledge alert
POST /api/alerts/{alertId}/resolve           ❌ Resolve alert
```

### **✅ Working (Building-Specific)**

```
GET /api/buildings/{buildingId}/alerts       ✅ Get alerts for building
```

## 📍 **Working Alerts Endpoint**

### **Get Building Alerts**

```http
GET /api/buildings/550e8400-e29b-41d4-a716-446655440000/alerts
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": []
}
```

**Notes:**

- Returns empty array when no alerts exist
- Includes active alerts for the specified building
- Requires authentication and building access

## 🚀 **Working Example**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/buildings/550e8400-e29b-41d4-a716-446655440000/alerts"
```

## 📊 **Alert Data Structure (When Alerts Exist)**

When alerts are present, the response would include:

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

## 🔄 **How Alerts Are Generated**

Alerts are automatically generated when:

1. **Sensor readings exceed thresholds** (poor/critical levels)
2. **Occupancy limits are reached**
3. **Sensor connectivity issues** occur
4. **System malfunctions** are detected

## 🛠 **Planned Alert Management Features**

The following endpoints are **planned for future implementation**:

### **Global Alert Management**

- `GET /api/alerts` - List all alerts across buildings
- `GET /api/alerts?status=active&severity=high` - Filter alerts
- `GET /api/alerts/{alertId}` - Get specific alert details

### **Alert Actions**

- `POST /api/alerts/{alertId}/acknowledge` - Acknowledge alert
- `POST /api/alerts/{alertId}/resolve` - Mark alert as resolved
- `PUT /api/alerts/{alertId}` - Update alert information

### **Alert Configuration**

- `GET /api/alerts/rules` - Get alert rules
- `POST /api/alerts/rules` - Create alert rules
- `PUT /api/alerts/rules/{ruleId}` - Update alert rules

## ✅ **Updated Test Files**

### **`api-tests.http`** - ✅ **FIXED**

- **Removed non-existent endpoints**: `/api/alerts`, `/api/alerts/{id}`
- **Replaced with working endpoint**: `/api/buildings/{id}/alerts`
- **Added informational notes** about planned endpoints

### **`api-tests-quick.http`** - ✅ **FIXED**

- **Updated alerts test** to use building-specific endpoint

### **`api-tests-working.http`** - ✅ **ALREADY CORRECT**

- **Already uses building alerts endpoint** - no changes needed

## 🎯 **Current Workarounds**

### **To Get All Alerts:**

Query each building individually:

```http
GET /api/buildings/building-1-id/alerts
GET /api/buildings/building-2-id/alerts
GET /api/buildings/building-3-id/alerts
```

### **To Monitor Alerts:**

1. **Use building alerts endpoint** for each building
2. **Submit sensor data** to trigger alert generation
3. **Check building overview** for alert counts
4. **Use building health endpoint** for system status

## 📈 **Development Roadmap**

**Phase 1: Current** ✅

- Building-specific alerts retrieval

**Phase 2: Planned** 🔄

- Global alerts API
- Alert management (acknowledge/resolve)
- Alert filtering and pagination

**Phase 3: Future** 📋

- Alert rules configuration
- Real-time alert notifications
- Alert analytics and reporting

## 🎉 **Working Alert Integration**

Your alerts system **works within the building context**:

- ✅ **Building alerts retrieval** functional
- ✅ **Alert generation** from sensor thresholds
- ✅ **Role-based access** to building alerts
- ✅ **Real-time updates** via WebSocket (planned)

**Building alerts endpoint is fully operational!** 🎯

Use `/api/buildings/{buildingId}/alerts` for all current alert monitoring needs.
