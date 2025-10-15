# Sensor IDs Reference

## ✅ **Issue Resolved**

The **"SENSOR_NOT_FOUND"** error was caused by using incorrect sensor IDs in the test files. Your database uses sensor IDs starting with `770e8400-` not `660e8400-`.

**Additional Fix**: The backend expects only `sensor_id`, `value`, and optionally `timestamp`. Extra fields like `raw_value` and `quality_score` cause errors.

## 📍 **Available Sensors in Your Database**

### **Main Lobby Zone** (`660e8400-e29b-41d4-a716-446655440001`)

| Sensor Type     | Sensor ID                              | Identifier      | Usage Example              |
| --------------- | -------------------------------------- | --------------- | -------------------------- |
| **PM2.5**       | `770e8400-e29b-41d4-a716-446655440001` | LOBBY-PM25-001  | Air quality particles      |
| **CO2**         | `770e8400-e29b-41d4-a716-446655440002` | LOBBY-CO2-001   | Carbon dioxide levels      |
| **TVOC**        | `770e8400-e29b-41d4-a716-446655440003` | LOBBY-TVOC-001  | Volatile organic compounds |
| **Temperature** | `770e8400-e29b-41d4-a716-446655440004` | LOBBY-TEMP-001  | Air temperature            |
| **Humidity**    | `770e8400-e29b-41d4-a716-446655440005` | LOBBY-HUM-001   | Relative humidity          |
| **Pressure**    | `770e8400-e29b-41d4-a716-446655440006` | LOBBY-PRESS-001 | Air pressure               |

### **Open Office Space Zone** (`660e8400-e29b-41d4-a716-446655440004`)

| Sensor Type     | Sensor ID                              | Identifier      | Usage Example              |
| --------------- | -------------------------------------- | --------------- | -------------------------- |
| **PM2.5**       | `770e8400-e29b-41d4-a716-446655440011` | OFFICE-PM25-001 | Air quality particles      |
| **CO2**         | `770e8400-e29b-41d4-a716-446655440012` | OFFICE-CO2-001  | Carbon dioxide levels      |
| **TVOC**        | `770e8400-e29b-41d4-a716-446655440013` | OFFICE-TVOC-001 | Volatile organic compounds |
| **Temperature** | `770e8400-e29b-41d4-a716-446655440014` | OFFICE-TEMP-001 | Air temperature            |

## 🚀 **Working Sensor Data Format**

### **✅ Correct Format (Required Fields Only)**

```http
### PM2.5 Data - Main Lobby ✅
POST http://localhost:3001/api/buildings/550e8400-e29b-41d4-a716-446655440000/sensor-data
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "sensor_id": "770e8400-e29b-41d4-a716-446655440001",
  "value": 25.6,
  "timestamp": "2025-07-24T01:30:00Z"
}
```

### **✅ Minimal Format (Timestamp Optional)**

```http
### CO2 Data - Auto Timestamp ✅
POST http://localhost:3001/api/buildings/550e8400-e29b-41d4-a716-446655440000/sensor-data
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "sensor_id": "770e8400-e29b-41d4-a716-446655440002",
  "value": 450.2
}
```

### **❌ Wrong Format (Extra Fields Cause Errors)**

```http
### This will fail ❌
{
  "sensor_id": "770e8400-e29b-41d4-a716-446655440001",
  "value": 25.6,
  "raw_value": 25.6,          ❌ Not expected
  "quality_score": 0.95       ❌ Not expected
}
```

## 📊 **Expected Response Format**

### **✅ Success Response**

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2025-07-24T01:35:00.000Z",
    "status": "good",
    "message": "Sensor reading recorded successfully"
  }
}
```

### **❌ Error Response**

```json
{
  "success": false,
  "error": {
    "code": "SENSOR_NOT_FOUND",
    "message": "Sensor not found",
    "timestamp": "2025-07-24T01:31:35.368Z"
  }
}
```

## 📋 **API Field Requirements**

| Field       | Required    | Type     | Description                  |
| ----------- | ----------- | -------- | ---------------------------- |
| `sensor_id` | ✅ **Yes**  | UUID     | Must exist in database       |
| `value`     | ✅ **Yes**  | Number   | Sensor reading value         |
| `timestamp` | ❌ Optional | ISO 8601 | Uses current time if omitted |

### **Expected Values by Sensor Type**

| Sensor Type     | Typical Values | Unit  | Status Examples  |
| --------------- | -------------- | ----- | ---------------- |
| **PM2.5**       | 0 - 150        | μg/m³ | 25.6 → "good"    |
| **CO2**         | 300 - 2000     | ppm   | 450.2 → "good"   |
| **TVOC**        | 0 - 5.0        | mg/m³ | 0.8 → "moderate" |
| **Temperature** | 15 - 35        | °C    | 22.5 → "good"    |
| **Humidity**    | 20 - 80        | %     | 45.0 → "good"    |
| **Pressure**    | 950 - 1050     | hPa   | 1013.2 → "good"  |

## 🔍 **ID Pattern Understanding**

### **Building ID Pattern**

- Format: `550e8400-e29b-41d4-a716-446655440000`
- **Smart Tech Headquarters**: `550e8400-e29b-41d4-a716-446655440000`

### **Zone ID Pattern**

- Format: `660e8400-e29b-41d4-a716-44665544****`
- **Main Lobby**: `660e8400-e29b-41d4-a716-446655440001`
- **Reception Area**: `660e8400-e29b-41d4-a716-446655440002`
- **Conference Room A**: `660e8400-e29b-41d4-a716-446655440003`
- **Open Office Space**: `660e8400-e29b-41d4-a716-446655440004`
- **Meeting Room B**: `660e8400-e29b-41d4-a716-446655440005`

### **Sensor ID Pattern**

- Format: `770e8400-e29b-41d4-a716-44665544****`
- **Main Lobby Sensors**: `770e8400-e29b-41d4-a716-446655440001` to `770e8400-e29b-41d4-a716-446655440006`
- **Open Office Sensors**: `770e8400-e29b-41d4-a716-446655440011` to `770e8400-e29b-41d4-a716-446655440016`

## ✅ **Updated Test Files**

### **`api-tests-working.http`** - ✅ **FIXED**

- **All sensor IDs corrected** to use real IDs from database
- **Simplified format** with only required fields
- **Multiple sensor types** included for comprehensive testing
- **Different zones** covered (Main Lobby, Open Office)

### **`api-tests-quick.http`** - ✅ **FIXED**

- **Primary sensor ID** updated to working ID
- **Simplified format** for immediate testing

## 🛠 **How to Get More Sensor IDs**

If you need to see all available sensors:

```sql
-- Connect to database
docker exec smart-building-timescaledb psql -U iaq_admin -d smart_building_iaq

-- Get all sensors with details
SELECT
  s.id AS sensor_id,
  s.sensor_identifier,
  st.type_name,
  z.name AS zone_name,
  s.is_active
FROM sensors s
JOIN sensor_types st ON s.sensor_type_id = st.id
JOIN zones z ON s.zone_id = z.id
WHERE s.is_active = true
ORDER BY z.name, st.type_name;
```

## 🎯 **Test Status**

✅ **SENSOR_NOT_FOUND error resolved**  
✅ **Correct sensor IDs identified**  
✅ **Working API format confirmed**  
✅ **Test files updated and verified**

**Your sensor data submission is now fully operational!** 🎉

## 📈 **Next Steps**

1. **Use `api-tests-working.http`** for comprehensive testing
2. **Use `api-tests-quick.http`** for quick validation
3. **Submit real sensor data** using the working format
4. **Monitor responses** for status information ("good", "moderate", etc.)
