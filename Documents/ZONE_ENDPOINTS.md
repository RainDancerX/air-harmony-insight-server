# Zone Endpoints Reference

## ✅ **Issue Resolved**

The **"Route not found"** error for zones was caused by incorrect URL structure in the test files. Zone endpoints are mounted under `/api/zones` with specific sub-paths.

## 🎯 **Correct Zone Endpoint Structure**

### **❌ Wrong URLs (404 Errors)**

```
GET /api/buildings/{buildingId}/zones          ❌ 404 Not Found
GET /api/buildings/{buildingId}/zones/{zoneId} ❌ 404 Not Found
```

### **✅ Correct URLs (Working)**

```
GET /api/zones/buildings/{buildingId}/zones                   ✅ List zones
GET /api/zones/buildings/{buildingId}/zones/{zoneId}          ✅ Specific zone
GET /api/zones/{zoneId}/details                               ✅ Zone details
GET /api/zones/{zoneId}/history                               ✅ Zone history
POST /api/zones/{zoneId}/controls                             ✅ Zone controls
POST /api/zones                                               ✅ Create zone
```

## 📍 **Working Zone Endpoints**

### **1. List Zones for Building**

```http
GET /api/zones/buildings/550e8400-e29b-41d4-a716-446655440000/zones
Authorization: Bearer <token>

# Optional query parameters:
# ?floor=1&search=office&status=good
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Main Lobby",
      "floor": 1,
      "readings": [...],
      "occupancy": 0,
      "maxOccupancy": 100,
      "lastUpdated": "2025-07-24T01:35:00Z"
    }
  ]
}
```

### **2. Get Specific Zone in Building**

```http
GET /api/zones/buildings/550e8400-e29b-41d4-a716-446655440000/zones/660e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <token>
```

### **3. Get Zone Details**

```http
GET /api/zones/660e8400-e29b-41d4-a716-446655440001/details
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "zone": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Main Lobby",
      "floor": 1,
      "readings": [...],
      "occupancy": 0,
      "maxOccupancy": 100,
      "zoneType": "lobby",
      "areaSqm": 150.5,
      "sensors": 6
    },
    "historicalData": {...},
    "recommendations": [...]
  }
}
```

### **4. Get Zone Historical Data**

```http
GET /api/zones/660e8400-e29b-41d4-a716-446655440001/history?sensorType=PM2.5&period=24h&interval=1h
Authorization: Bearer <token>
```

**Query Parameters:**

- `sensorType` (required): PM2.5, CO2, TVOC, Temperature, Humidity, Pressure
- `period` (optional): 24h, 7d, 30d (default: 24h)
- `interval` (optional): 5m, 1h, 1d (default: 1h)

### **5. Send Zone Control Commands**

```http
POST /api/zones/660e8400-e29b-41d4-a716-446655440001/controls
Authorization: Bearer <token>
Content-Type: application/json

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

**Permissions:** Admin/Manager only

### **6. Create New Zone**

```http
POST /api/zones
Authorization: Bearer <token>
Content-Type: application/json

{
  "building_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "New Conference Room",
  "floor": 2,
  "max_occupancy": 25,
  "zone_type": "conference_room",
  "area_sqm": 45.5
}
```

**Permissions:** Admin/Manager only

## 🔍 **Route Structure Explanation**

The confusion comes from how Express routers are mounted:

### **Main Router Setup** (`src/routes/index.ts`)

```javascript
// Zone routes are mounted at /api/zones
router.use('/api/zones', zoneRoutes);
```

### **Zone Router Paths** (`src/routes/zones.ts`)

```javascript
// This becomes: /api/zones + /buildings/:buildingId/zones
router.get('/buildings/:buildingId/zones', ...)

// This becomes: /api/zones + /:zoneId/details
router.get('/:zoneId/details', ...)
```

### **Final URL Structure**

- **Mount Path**: `/api/zones`
- **Route Path**: `/buildings/:buildingId/zones`
- **Final URL**: `/api/zones/buildings/{buildingId}/zones`

## 📊 **Working Examples**

### **✅ Test Zones List**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/zones/buildings/550e8400-e29b-41d4-a716-446655440000/zones"
```

### **✅ Test Zone Details**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/zones/660e8400-e29b-41d4-a716-446655440001/details"
```

### **✅ Test Zone History**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/zones/660e8400-e29b-41d4-a716-446655440001/history?sensorType=PM2.5&period=24h"
```

## ✅ **Updated Test Files**

### **`api-tests-working.http`** - ✅ **FIXED**

- **All zone URLs corrected** to use proper structure
- **Working endpoints only** - guaranteed to work

### **`api-tests-quick.http`** - ✅ **FIXED**

- **Essential zone tests** with correct URLs

## 🎯 **Available Zone IDs for Testing**

| Zone Name             | Zone ID                                | Building ID                            |
| --------------------- | -------------------------------------- | -------------------------------------- |
| **Main Lobby**        | `660e8400-e29b-41d4-a716-446655440001` | `550e8400-e29b-41d4-a716-446655440000` |
| **Reception Area**    | `660e8400-e29b-41d4-a716-446655440002` | `550e8400-e29b-41d4-a716-446655440000` |
| **Conference Room A** | `660e8400-e29b-41d4-a716-446655440003` | `550e8400-e29b-41d4-a716-446655440000` |
| **Open Office Space** | `660e8400-e29b-41d4-a716-446655440004` | `550e8400-e29b-41d4-a716-446655440000` |
| **Meeting Room B**    | `660e8400-e29b-41d4-a716-446655440005` | `550e8400-e29b-41d4-a716-446655440000` |

## 🚀 **Next Steps**

1. **Use updated test files** with correct zone URLs
2. **Test zone endpoints** using REST Client extension
3. **Submit zone control commands** with admin/manager accounts
4. **Query historical data** for different sensor types

**Zone endpoints are now fully functional!** 🎉
