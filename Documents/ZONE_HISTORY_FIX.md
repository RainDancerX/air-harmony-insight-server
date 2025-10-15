# Zone History Endpoint Fix

## ✅ Issue Resolved

The **500 Internal Server Error** for the zone history endpoint has been **FIXED**!

## 🐛 Root Cause

The issue was a **SQL syntax error** in the `getHistoricalReadings` method in `src/services/database.ts`.

PostgreSQL doesn't support parameterized values for `INTERVAL` clauses. The query was using:

```sql
AND sr.time > NOW() - INTERVAL $4
```

This caused a **syntax error at or near "$4"**.

## 🔧 Solution

Fixed by using string interpolation for the INTERVAL clause:

```sql
AND sr.time > NOW() - INTERVAL '${periodMap[period]}'
```

And adjusted the parameters accordingly:

```typescript
const result = await this.query(query, [
  intervalMap[interval],
  zoneId,
  sensorType,
]);
```

## ✅ Working Endpoints

The zone history endpoint now works perfectly for all sensor types:

- **PM2.5**: `GET /api/zones/{zoneId}/history?sensorType=PM2.5&period=24h&interval=1h`
- **CO2**: `GET /api/zones/{zoneId}/history?sensorType=CO2&period=24h&interval=1h`
- **TVOC**: `GET /api/zones/{zoneId}/history?sensorType=TVOC&period=24h&interval=1h`
- **Temperature**: `GET /api/zones/{zoneId}/history?sensorType=Temperature&period=24h&interval=1h`
- **Humidity**: `GET /api/zones/{zoneId}/history?sensorType=Humidity&period=24h&interval=1h`
- **Pressure**: `GET /api/zones/{zoneId}/history?sensorType=Pressure&period=24h&interval=1h`

## 📊 Example Response

```json
{
  "success": true,
  "data": {
    "sensorType": "PM2.5",
    "unit": "μg/m³",
    "data": [
      {
        "timestamp": "2025-07-23T04:00:00.000Z",
        "value": 7.014
      },
      {
        "timestamp": "2025-07-23T05:00:00.000Z",
        "value": 42.367
      }
    ],
    "thresholds": {
      "good": 12,
      "moderate": 35.4,
      "poor": 55.4,
      "critical": 150.4
    }
  }
}
```

## 🎯 Parameters

- **sensorType** (required): PM2.5, CO2, TVOC, Temperature, Humidity, Pressure
- **period** (optional): 24h, 7d, 30d (default: 24h)
- **interval** (optional): 5m, 1h, 1d (default: 1h)

## 🚀 Your Frontend Should Now Work

The React frontend zone history charts should now load properly without 500 errors!

The endpoint returns 24 data points for 24h/1h queries, showing hourly averages of sensor readings using TimescaleDB's `time_bucket` function.
