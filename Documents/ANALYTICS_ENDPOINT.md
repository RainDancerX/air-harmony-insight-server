# Building Analytics Endpoint

## ✅ **Implemented and Working**

The `/analytics` endpoint has been **successfully implemented** and is now available!

## 🎯 **Endpoint Details**

### **GET** `/api/buildings/{buildingId}/analytics`

**Query Parameters:**

- `period` (optional): `24h`, `7d`, `30d` (default: `7d`)

**Authentication:** Required (Bearer token)

## 📊 **Response Structure**

```json
{
  "success": true,
  "data": {
    "period": "7d",
    "summary": {
      "totalZones": 6,
      "statusCounts": {
        "good": 26,
        "moderate": 7,
        "poor": 0,
        "critical": 3
      },
      "averageReadings": {
        "PM2.5": {
          "value": 14.68,
          "unit": "μg/m³",
          "status": "good"
        },
        "CO2": {
          "value": 976.7,
          "unit": "ppm",
          "status": "good"
        }
      }
    },
    "trends": {
      "PM2.5": {
        "current": 14.68,
        "previous": 16.23,
        "change": -9.55,
        "direction": "down",
        "unit": "μg/m³"
      },
      "CO2": {
        "current": 976.7,
        "previous": 945.2,
        "change": 3.33,
        "direction": "up",
        "unit": "ppm"
      }
    },
    "historicalData": {
      "PM2.5": [
        {
          "timestamp": "2025-07-17T00:00:00.000Z",
          "value": 15.23,
          "readingsCount": 144
        },
        {
          "timestamp": "2025-07-17T06:00:00.000Z",
          "value": 18.76,
          "readingsCount": 142
        }
      ]
    },
    "alerts": {
      "total": 15,
      "critical": 3,
      "high": 8,
      "resolved": 12,
      "resolutionRate": 80
    },
    "zonePerformance": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Main Lobby",
        "floor": 1,
        "alertCount": 5,
        "severityScore": 2.4
      }
    ],
    "generatedAt": "2025-07-24T04:32:22.142Z"
  }
}
```

## 🔍 **Data Breakdown**

### **1. Summary**

- Current building overview (same as `/overview` endpoint)
- Zone counts and status distribution
- Average readings for all sensor types

### **2. Trends**

- **Current vs Previous Period Comparison**
- **Percentage change** calculation
- **Direction**: `up`, `down`, or `stable` (< 2% change)
- Available for all sensor types

### **3. Historical Data**

- **Time-bucketed data** for charts
- **Intervals**:
  - `24h`: 1-hour buckets (24 data points)
  - `7d`: 6-hour buckets (28 data points)
  - `30d`: 1-day buckets (30 data points)
- **Reading counts** per time bucket

### **4. Alert Statistics**

- Total alerts in the period
- Breakdown by severity (critical, high)
- Resolution rate percentage
- Resolved vs active alerts

### **5. Zone Performance**

- **Top 5 zones** with most alerts
- **Severity score** (1-4 scale)
- Alert count per zone
- Useful for identifying problem areas

## 🚀 **Usage Examples**

### **24-Hour Analytics**

```bash
GET /api/buildings/550e8400-e29b-41d4-a716-446655440000/analytics?period=24h
```

- Hourly data points
- Recent trends
- Good for daily monitoring

### **7-Day Analytics (Default)**

```bash
GET /api/buildings/550e8400-e29b-41d4-a716-446655440000/analytics?period=7d
```

- 6-hour data points
- Weekly trends
- Balanced detail vs overview

### **30-Day Analytics**

```bash
GET /api/buildings/550e8400-e29b-41d4-a716-446655440000/analytics?period=30d
```

- Daily data points
- Monthly trends
- Good for reports and longer-term analysis

## 🎨 **Frontend Integration**

### **React Hook Example**

```typescript
const useAnalytics = (
  buildingId: string,
  period: '24h' | '7d' | '30d' = '7d'
) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(
          `/api/buildings/${buildingId}/analytics?period=${period}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();
        if (result.success) {
          setAnalytics(result.data);
        }
      } catch (error) {
        console.error('Analytics fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [buildingId, period]);

  return { analytics, loading };
};
```

### **Chart Data Extraction**

```typescript
// Extract PM2.5 trend for charts
const pm25Trend = analytics?.historicalData?.['PM2.5'] || [];

// Extract trend direction for UI
const pm25Direction = analytics?.trends?.['PM2.5']?.direction; // 'up', 'down', 'stable'

// Extract alert stats for dashboard
const alertStats = analytics?.alerts;
```

## 🎯 **Perfect for Dashboards**

This endpoint provides everything needed for analytics dashboards:

✅ **Summary metrics** for overview cards  
✅ **Trend data** with direction indicators  
✅ **Historical charts** with time-bucketed data  
✅ **Alert insights** for problem identification  
✅ **Zone performance** for targeted action  
✅ **Multiple time periods** for different views

Your frontend should now work perfectly with this comprehensive analytics data! 🎉
