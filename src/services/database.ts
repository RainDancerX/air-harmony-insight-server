import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import {
  DatabaseService,
  Building,
  Zone,
  Sensor,
  SensorType,
  SensorReading,
  User,
  Alert,
  OccupancyLog,
  AIReport,
  ChatConversation,
  ChatMessage,
  UserSession,
  BuildingSettings,
  UserNotificationSettings,
  BuildingDataResponse,
  SensorReadingResponse,
  BuildingOverviewResponse,
  HistoricalDataResponse,
  TrendsResponse,
  AlertNotificationResponse,
  ZoneResponse,
  FilterParams,
  PaginationParams,
} from '../types';

class TimescaleDBService implements DatabaseService {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
      ssl: config.database.ssl,
    });

    this.pool.on('connect', () => {
      if (!this.isConnected) {
        logger.info('Connected to TimescaleDB');
        this.isConnected = true;
      }
    });

    this.pool.on('error', (err) => {
      logger.error('Database connection error:', err);
      this.isConnected = false;
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      logger.debug('Executing query:', { text, params });
      const result: QueryResult = await client.query(text, params);
      return result.rows;
    } catch (error) {
      logger.error('Query error:', { text, params, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    logger.info('Database connection closed');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query(
        'SELECT NOW() as current_time, version() as version'
      );
      logger.info('Database health check passed:', result[0]);
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  // =============================================================================
  // Building Operations
  // =============================================================================

  async getBuilding(buildingId: string): Promise<Building | null> {
    const result = await this.query('SELECT * FROM buildings WHERE id = $1', [
      buildingId,
    ]);
    return result[0] || null;
  }

  async getAllBuildings(): Promise<Building[]> {
    return this.query('SELECT * FROM buildings ORDER BY name ASC');
  }

  async createBuilding(
    building: Omit<Building, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Building> {
    const result = await this.query(
      `INSERT INTO buildings (name, address, timezone, temperature_unit, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        building.name,
        building.address,
        building.timezone,
        building.temperature_unit,
        building.contact_email,
        building.contact_phone,
      ]
    );
    return result[0];
  }

  async updateBuilding(
    buildingId: string,
    updates: Partial<Building>
  ): Promise<Building> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    const values = [buildingId, ...Object.values(updates)];

    const result = await this.query(
      `UPDATE buildings SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    );
    return result[0];
  }

  // =============================================================================
  // Zone Operations
  // =============================================================================

  async getZonesByBuilding(
    buildingId: string,
    filters?: FilterParams
  ): Promise<Zone[]> {
    let query = 'SELECT * FROM zones WHERE building_id = $1';
    const params: any[] = [buildingId];

    if (filters?.floor) {
      query += ' AND floor = $2';
      params.push(filters.floor);
    }

    query += ' ORDER BY floor ASC, name ASC';

    return this.query(query, params);
  }

  async getZone(zoneId: string): Promise<Zone | null> {
    const result = await this.query('SELECT * FROM zones WHERE id = $1', [
      zoneId,
    ]);
    return result[0] || null;
  }

  async createZone(
    zone: Omit<Zone, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Zone> {
    const result = await this.query(
      `INSERT INTO zones (building_id, name, floor, max_occupancy, zone_type, area_sqm)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        zone.building_id,
        zone.name,
        zone.floor,
        zone.max_occupancy,
        zone.zone_type,
        zone.area_sqm,
      ]
    );
    return result[0];
  }

  // =============================================================================
  // Sensor Operations
  // =============================================================================

  async getSensorTypes(): Promise<SensorType[]> {
    return this.query('SELECT * FROM sensor_types ORDER BY type_name ASC');
  }

  async getSensorsByZone(zoneId: string): Promise<Sensor[]> {
    return this.query(
      'SELECT * FROM sensors WHERE zone_id = $1 AND is_active = true ORDER BY sensor_type_id',
      [zoneId]
    );
  }

  async getSensor(sensorId: string): Promise<Sensor | null> {
    const result = await this.query('SELECT * FROM sensors WHERE id = $1', [
      sensorId,
    ]);
    return result[0] || null;
  }

  async createSensor(
    sensor: Omit<Sensor, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Sensor> {
    const result = await this.query(
      `INSERT INTO sensors (zone_id, sensor_type_id, sensor_identifier, manufacturer, model, 
                           installation_date, calibration_offset, accuracy_percentage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        sensor.zone_id,
        sensor.sensor_type_id,
        sensor.sensor_identifier,
        sensor.manufacturer,
        sensor.model,
        sensor.installation_date,
        sensor.calibration_offset,
        sensor.accuracy_percentage,
      ]
    );
    return result[0];
  }

  // =============================================================================
  // Sensor Reading Operations
  // =============================================================================

  async insertSensorReading(
    reading: Omit<SensorReading, 'status'>
  ): Promise<SensorReading> {
    // Calculate status based on thresholds
    const thresholds = await this.query(
      `SELECT st.good_threshold, st.moderate_threshold, st.poor_threshold, st.critical_threshold
       FROM sensors s
       JOIN sensor_types st ON s.sensor_type_id = st.id
       WHERE s.id = $1`,
      [reading.sensor_id]
    );

    let status = 'good';
    if (thresholds[0]) {
      const t = thresholds[0];
      if (reading.value >= t.critical_threshold) status = 'critical';
      else if (reading.value >= t.poor_threshold) status = 'poor';
      else if (reading.value >= t.moderate_threshold) status = 'moderate';
    }

    const result = await this.query(
      `INSERT INTO sensor_readings (time, sensor_id, value, status, raw_value, quality_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        reading.time,
        reading.sensor_id,
        reading.value,
        status,
        reading.raw_value,
        reading.quality_score,
      ]
    );

    // Generate alert if needed
    if (status === 'poor' || status === 'critical') {
      await this.generateAlert(reading.sensor_id, reading.value, status);
    }

    return result[0];
  }

  async getLatestReadings(zoneId: string): Promise<SensorReadingResponse[]> {
    const result = await this.query(
      `SELECT DISTINCT ON (s.sensor_type_id)
         sr.sensor_id as id,
         st.type_name as type,
         sr.value,
         st.unit,
         sr.time as timestamp,
         sr.status,
         st.good_threshold,
         st.moderate_threshold,
         st.poor_threshold,
         st.critical_threshold
       FROM sensor_readings sr
       JOIN sensors s ON sr.sensor_id = s.id
       JOIN sensor_types st ON s.sensor_type_id = st.id
       WHERE s.zone_id = $1 AND s.is_active = true
       ORDER BY s.sensor_type_id, sr.time DESC`,
      [zoneId]
    );

    return result.map((row) => ({
      id: row.id,
      type: row.type,
      value: parseFloat(row.value),
      unit: row.unit,
      timestamp: row.timestamp,
      status: row.status,
      threshold: {
        good: parseFloat(row.good_threshold),
        moderate: parseFloat(row.moderate_threshold),
        poor: parseFloat(row.poor_threshold),
        critical: parseFloat(row.critical_threshold),
      },
    }));
  }

  async getHistoricalReadings(
    zoneId: string,
    sensorType: string,
    period: '24h' | '7d' | '30d',
    interval: '5m' | '1h' | '1d'
  ): Promise<HistoricalDataResponse> {
    try {
      logger.debug(
        `Getting historical readings for zone ${zoneId}, sensor ${sensorType}, period ${period}, interval ${interval}`
      );

      const periodMap = { '24h': '24 hours', '7d': '7 days', '30d': '30 days' };
      const intervalMap = { '5m': '5 minutes', '1h': '1 hour', '1d': '1 day' };

      // Validate inputs
      if (!periodMap[period] || !intervalMap[interval]) {
        throw new Error(`Invalid period (${period}) or interval (${interval})`);
      }

      // Check if zone exists and has sensors
      const sensorCheck = await this.query(
        `SELECT COUNT(*) as count
         FROM sensors s
         JOIN sensor_types st ON s.sensor_type_id = st.id
         WHERE s.zone_id = $1 AND st.type_name = $2 AND s.is_active = true`,
        [zoneId, sensorType]
      );

      if (parseInt(sensorCheck[0]?.count || '0') === 0) {
        logger.warn(
          `No active sensors found for zone ${zoneId} and sensor type ${sensorType}`
        );
        // Return empty but valid response
        const thresholds = await this.query(
          `SELECT st.good_threshold, st.moderate_threshold, st.poor_threshold, st.critical_threshold, st.unit
           FROM sensor_types st
           WHERE st.type_name = $1`,
          [sensorType]
        );

        return {
          sensorType,
          unit: thresholds[0]?.unit || '',
          data: [],
          thresholds: {
            good: parseFloat(thresholds[0]?.good_threshold || 0),
            moderate: parseFloat(thresholds[0]?.moderate_threshold || 0),
            poor: parseFloat(thresholds[0]?.poor_threshold || 0),
            critical: parseFloat(thresholds[0]?.critical_threshold || 0),
          },
        };
      }

      // Get historical data using time_bucket
      logger.debug(
        `Executing time_bucket query with interval: ${intervalMap[interval]}, period: ${periodMap[period]}`
      );

      // Build the query with direct string interpolation for INTERVAL (PostgreSQL doesn't support parameterized INTERVAL)
      const query = `
        SELECT 
          time_bucket($1::interval, sr.time) as timestamp,
          AVG(sr.value) as value
        FROM sensor_readings sr
        JOIN sensors s ON sr.sensor_id = s.id
        JOIN sensor_types st ON s.sensor_type_id = st.id
        WHERE s.zone_id = $2 
          AND st.type_name = $3
          AND sr.time > NOW() - INTERVAL '${periodMap[period]}'
          AND s.is_active = true
        GROUP BY timestamp
        ORDER BY timestamp ASC`;

      const result = await this.query(query, [
        intervalMap[interval],
        zoneId,
        sensorType,
      ]);

      logger.debug(`Historical query returned ${result.length} data points`);

      // Get thresholds
      const thresholds = await this.query(
        `SELECT st.good_threshold, st.moderate_threshold, st.poor_threshold, st.critical_threshold, st.unit
         FROM sensor_types st
         WHERE st.type_name = $1`,
        [sensorType]
      );

      return {
        sensorType,
        unit: thresholds[0]?.unit || '',
        data: result.map((row) => ({
          timestamp: row.timestamp,
          value: parseFloat(row.value || 0),
        })),
        thresholds: {
          good: parseFloat(thresholds[0]?.good_threshold || 0),
          moderate: parseFloat(thresholds[0]?.moderate_threshold || 0),
          poor: parseFloat(thresholds[0]?.poor_threshold || 0),
          critical: parseFloat(thresholds[0]?.critical_threshold || 0),
        },
      };
    } catch (error: any) {
      logger.error(`Error in getHistoricalReadings: ${error.message}`, {
        zoneId,
        sensorType,
        period,
        interval,
        error: error.stack,
      });
      throw error;
    }
  }

  // =============================================================================
  // Alert Operations
  // =============================================================================

  async generateAlert(
    sensorId: string,
    value: number,
    status: string
  ): Promise<Alert> {
    const sensorInfo = await this.query(
      `SELECT s.zone_id, st.type_name, z.name as zone_name
       FROM sensors s
       JOIN sensor_types st ON s.sensor_type_id = st.id
       JOIN zones z ON s.zone_id = z.id
       WHERE s.id = $1`,
      [sensorId]
    );

    const { zone_id, type_name, zone_name } = sensorInfo[0];

    const result = await this.query(
      `INSERT INTO alerts (time, zone_id, sensor_id, alert_type, sensor_type, value, status, severity, message)
       VALUES (NOW(), $1, $2, 'threshold_exceeded', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        zone_id,
        sensorId,
        type_name,
        value,
        status,
        status === 'critical' ? 'critical' : 'high',
        `${type_name} reading ${value} is ${status} in ${zone_name}`,
      ]
    );

    return result[0];
  }

  async getActiveAlerts(
    buildingId: string
  ): Promise<AlertNotificationResponse[]> {
    const result = await this.query(
      `SELECT 
         a.id,
         a.zone_id as "zoneId",
         z.name as "zoneName",
         a.sensor_type as "sensorType",
         a.value,
         st.unit,
         a.status,
         a.time as timestamp,
         a.acknowledged_at IS NOT NULL as "isRead"
       FROM alerts a
       JOIN zones z ON a.zone_id = z.id
       JOIN sensor_types st ON st.type_name = a.sensor_type
       WHERE z.building_id = $1 
         AND a.is_resolved = false
       ORDER BY a.time DESC`,
      [buildingId]
    );

    return result.map((row) => ({
      ...row,
      value: parseFloat(row.value),
    }));
  }

  async markAlertAsRead(alertId: string): Promise<void> {
    await this.query(
      'UPDATE alerts SET acknowledged_at = NOW() WHERE id = $1',
      [alertId]
    );
  }

  async resolveAlert(alertId: string, userId: string): Promise<void> {
    await this.query(
      'UPDATE alerts SET is_resolved = true, resolved_at = NOW(), resolved_by = $2 WHERE id = $1',
      [alertId, userId]
    );
  }

  async resolveAllAlertsForBuilding(
    buildingId: string,
    userId: string
  ): Promise<number> {
    const result = await this.query(
      `UPDATE alerts
       SET is_resolved = true, resolved_at = NOW(), resolved_by = $2
       FROM zones
       WHERE alerts.zone_id = zones.id
         AND zones.building_id = $1
         AND alerts.is_resolved = false
       RETURNING alerts.id`,
      [buildingId, userId]
    );
    return result.length;
  }

  // =============================================================================
  // Occupancy Operations
  // =============================================================================

  async insertOccupancyLog(
    log: Omit<OccupancyLog, 'occupancy_percentage'>
  ): Promise<OccupancyLog> {
    const result = await this.query(
      `INSERT INTO occupancy_logs (time, zone_id, occupancy_count, max_occupancy, detection_method)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        log.time,
        log.zone_id,
        log.occupancy_count,
        log.max_occupancy,
        log.detection_method,
      ]
    );
    return result[0];
  }

  async getLatestOccupancy(zoneId: string): Promise<OccupancyLog | null> {
    const result = await this.query(
      'SELECT * FROM occupancy_logs WHERE zone_id = $1 ORDER BY time DESC LIMIT 1',
      [zoneId]
    );
    return result[0] || null;
  }

  // =============================================================================
  // Dashboard and Analytics Operations
  // =============================================================================

  async getBuildingData(buildingId: string): Promise<BuildingDataResponse> {
    const building = await this.getBuilding(buildingId);
    if (!building) throw new Error('Building not found');

    const zones = await this.query(
      'SELECT * FROM zones WHERE building_id = $1 ORDER BY floor ASC, name ASC',
      [buildingId]
    );

    const zoneData: ZoneResponse[] = await Promise.all(
      zones.map(async (zone) => {
        const readings = await this.getLatestReadings(zone.id);
        const occupancy = await this.getLatestOccupancy(zone.id);

        return {
          id: zone.id,
          name: zone.name,
          floor: zone.floor,
          readings,
          occupancy: occupancy?.occupancy_count || 0,
          maxOccupancy: zone.max_occupancy,
          lastUpdated: readings[0]?.timestamp || new Date().toISOString(),
        };
      })
    );

    // Determine overall air quality
    const allStatuses = zoneData.flatMap((zone) =>
      zone.readings.map((r) => r.status)
    );
    let overallAirQuality: 'good' | 'moderate' | 'poor' | 'critical' = 'good';

    if (allStatuses.includes('critical')) overallAirQuality = 'critical';
    else if (allStatuses.includes('poor')) overallAirQuality = 'poor';
    else if (allStatuses.includes('moderate')) overallAirQuality = 'moderate';

    return {
      id: building.id,
      name: building.name,
      address: building.address,
      zones: zoneData,
      overallAirQuality,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getBuildingOverview(
    buildingId: string
  ): Promise<BuildingOverviewResponse> {
    const zones = await this.getZonesByBuilding(buildingId);

    // Get status counts by analyzing latest readings
    const statusCounts = { good: 0, moderate: 0, poor: 0, critical: 0 };
    const sensorTypeTotals: Record<
      string,
      { total: number; sum: number; unit: string }
    > = {};

    for (const zone of zones) {
      const readings = await this.getLatestReadings(zone.id);

      for (const reading of readings) {
        statusCounts[reading.status]++;

        if (!sensorTypeTotals[reading.type]) {
          sensorTypeTotals[reading.type] = {
            total: 0,
            sum: 0,
            unit: reading.unit,
          };
        }
        sensorTypeTotals[reading.type].total++;
        sensorTypeTotals[reading.type].sum += reading.value;
      }
    }

    const averageReadings: Record<string, any> = {};
    for (const [type, data] of Object.entries(sensorTypeTotals)) {
      const avgValue = data.sum / data.total;
      let status = 'good';

      // Get thresholds to determine status
      const thresholds = await this.query(
        'SELECT good_threshold, moderate_threshold, poor_threshold, critical_threshold FROM sensor_types WHERE type_name = $1',
        [type]
      );

      if (thresholds[0]) {
        const t = thresholds[0];
        if (avgValue >= t.critical_threshold) status = 'critical';
        else if (avgValue >= t.poor_threshold) status = 'poor';
        else if (avgValue >= t.moderate_threshold) status = 'moderate';
      }

      averageReadings[type] = {
        value: Math.round(avgValue * 100) / 100,
        unit: data.unit,
        status,
      };
    }

    return {
      totalZones: zones.length,
      statusCounts,
      averageReadings,
    };
  }

  async getBuildingAnalytics(
    buildingId: string,
    period: '24h' | '7d' | '30d'
  ): Promise<any> {
    try {
      const periodMap = { '24h': '24 hours', '7d': '7 days', '30d': '30 days' };
      const intervalMap = { '24h': '1 hour', '7d': '6 hours', '30d': '1 day' };

      // Get basic building overview
      const overview = await this.getBuildingOverview(buildingId);

      // Get zones for historical analysis
      const zones = await this.getZonesByBuilding(buildingId);

      // Get sensor types for trend analysis
      const sensorTypes = await this.getSensorTypes();

      // Calculate trends for each sensor type
      const trends: Record<string, any> = {};
      const historicalData: Record<string, any[]> = {};

      for (const sensorType of sensorTypes) {
        // Get aggregated data for the period
        const currentPeriodData = await this.query(
          `SELECT 
             time_bucket($1::interval, sr.time) as timestamp,
             AVG(sr.value) as value,
             COUNT(*) as readings_count
           FROM sensor_readings sr
           JOIN sensors s ON sr.sensor_id = s.id
           JOIN sensor_types st ON s.sensor_type_id = st.id
           JOIN zones z ON s.zone_id = z.id
           WHERE z.building_id = $2 
             AND st.type_name = $3
             AND sr.time > NOW() - INTERVAL '${periodMap[period]}'
             AND s.is_active = true
           GROUP BY timestamp
           ORDER BY timestamp ASC`,
          [intervalMap[period], buildingId, sensorType.type_name]
        );

        // Get previous period for comparison (trend calculation)
        const previousPeriodData = await this.query(
          `SELECT AVG(sr.value) as avg_value
           FROM sensor_readings sr
           JOIN sensors s ON sr.sensor_id = s.id
           JOIN sensor_types st ON s.sensor_type_id = st.id
           JOIN zones z ON s.zone_id = z.id
           WHERE z.building_id = $1 
             AND st.type_name = $2
             AND sr.time BETWEEN NOW() - INTERVAL '${periodMap[period]}' * 2 
             AND NOW() - INTERVAL '${periodMap[period]}'
             AND s.is_active = true`,
          [buildingId, sensorType.type_name]
        );

        const currentAvg =
          currentPeriodData.length > 0
            ? currentPeriodData.reduce(
                (sum, row) => sum + parseFloat(row.value || 0),
                0
              ) / currentPeriodData.length
            : 0;

        const previousAvg = parseFloat(previousPeriodData[0]?.avg_value || 0);

        // Calculate trend percentage
        let trendPercentage = 0;
        let trendDirection: 'up' | 'down' | 'stable' = 'stable';

        if (previousAvg > 0) {
          trendPercentage = ((currentAvg - previousAvg) / previousAvg) * 100;
          if (Math.abs(trendPercentage) < 2) {
            trendDirection = 'stable';
          } else if (trendPercentage > 0) {
            trendDirection = 'up';
          } else {
            trendDirection = 'down';
          }
        }

        trends[sensorType.type_name] = {
          current: Math.round(currentAvg * 100) / 100,
          previous: Math.round(previousAvg * 100) / 100,
          change: Math.round(trendPercentage * 100) / 100,
          direction: trendDirection,
          unit: sensorType.unit,
        };

        historicalData[sensorType.type_name] = currentPeriodData.map((row) => ({
          timestamp: row.timestamp,
          value: parseFloat(row.value || 0),
          readingsCount: parseInt(row.readings_count || 0),
        }));
      }

      // Get alert statistics for the period
      const alertStats = await this.query(
        `SELECT 
           COUNT(*) as total_alerts,
           COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
           COUNT(*) FILTER (WHERE severity = 'high') as high_alerts,
           COUNT(*) FILTER (WHERE is_resolved = true) as resolved_alerts
         FROM alerts a
         JOIN zones z ON a.zone_id = z.id
         WHERE z.building_id = $1 
           AND a.time > NOW() - INTERVAL '${periodMap[period]}'`,
        [buildingId]
      );

      // Get zone performance (zones with most issues)
      const zonePerformance = await this.query(
        `SELECT 
           z.id,
           z.name,
           z.floor,
           COUNT(a.id) as alert_count,
           AVG(CASE WHEN sr.status = 'critical' THEN 4
                   WHEN sr.status = 'poor' THEN 3  
                   WHEN sr.status = 'moderate' THEN 2
                   ELSE 1 END) as avg_severity_score
         FROM zones z
         LEFT JOIN alerts a ON z.id = a.zone_id 
           AND a.time > NOW() - INTERVAL '${periodMap[period]}'
         LEFT JOIN sensors s ON z.id = s.zone_id
         LEFT JOIN sensor_readings sr ON s.id = sr.sensor_id
           AND sr.time > NOW() - INTERVAL '${periodMap[period]}'
         WHERE z.building_id = $1
         GROUP BY z.id, z.name, z.floor
         ORDER BY alert_count DESC, avg_severity_score DESC
         LIMIT 5`,
        [buildingId]
      );

      return {
        period,
        summary: {
          totalZones: overview.totalZones,
          statusCounts: overview.statusCounts,
          averageReadings: overview.averageReadings,
        },
        trends,
        historicalData,
        alerts: {
          total: parseInt(alertStats[0]?.total_alerts || 0),
          critical: parseInt(alertStats[0]?.critical_alerts || 0),
          high: parseInt(alertStats[0]?.high_alerts || 0),
          resolved: parseInt(alertStats[0]?.resolved_alerts || 0),
          resolutionRate:
            alertStats[0]?.total_alerts > 0
              ? Math.round(
                  (alertStats[0].resolved_alerts / alertStats[0].total_alerts) *
                    100
                )
              : 100,
        },
        zonePerformance: zonePerformance.map((zone) => ({
          id: zone.id,
          name: zone.name,
          floor: zone.floor,
          alertCount: parseInt(zone.alert_count || 0),
          severityScore: parseFloat(zone.avg_severity_score || 1),
        })),
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error(`Error in getBuildingAnalytics: ${error.message}`, {
        buildingId,
        period,
        error: error.stack,
      });
      throw error;
    }
  }

  // =============================================================================
  // User Operations
  // =============================================================================

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.query('SELECT * FROM users WHERE email = $1', [
      email,
    ]);
    return result[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.query('SELECT * FROM users WHERE id = $1', [id]);
    return result[0] || null;
  }

  async createUser(
    user: Omit<User, 'id' | 'created_at' | 'updated_at'>
  ): Promise<User> {
    const result = await this.query(
      `INSERT INTO users (email, password_hash, name, role, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user.email,
        user.password_hash,
        user.name,
        user.role,
        JSON.stringify(user.permissions),
        user.is_active,
      ]
    );
    return result[0];
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await this.query('UPDATE users SET last_login = NOW() WHERE id = $1', [
      userId,
    ]);
  }

  // =============================================================================
  // Session Operations
  // =============================================================================

  async createSession(
    session: Omit<UserSession, 'id' | 'created_at' | 'last_used_at'>
  ): Promise<UserSession> {
    const result = await this.query(
      `INSERT INTO user_sessions (user_id, token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        session.user_id,
        session.token_hash,
        session.refresh_token_hash,
        session.ip_address,
        session.user_agent,
        session.expires_at,
      ]
    );
    return result[0];
  }

  async getSessionByToken(tokenHash: string): Promise<UserSession | null> {
    const result = await this.query(
      'SELECT * FROM user_sessions WHERE token_hash = $1 AND is_active = true AND expires_at > NOW()',
      [tokenHash]
    );
    return result[0] || null;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.query(
      'UPDATE user_sessions SET is_active = false WHERE id = $1',
      [sessionId]
    );
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.query('DELETE FROM user_sessions WHERE expires_at < NOW()');
  }
}

export const dbService = new TimescaleDBService();
export default dbService;
