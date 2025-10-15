import { Router, Request, Response } from 'express';
import {
  authenticate,
  authorize,
  validateBuildingAccess,
} from '../middleware/auth';
import { dbService } from '../services/database';
import { getWebSocketService } from '../services/websocket';
import { logger } from '../utils/logger';
import {
  ApiResponse,
  BuildingDataResponse,
  BuildingOverviewResponse,
  AlertNotificationResponse,
} from '../types';

const router = Router();

// Apply authentication to all building routes
router.use(authenticate);

// =============================================================================
// Dashboard Page Endpoints
// =============================================================================

/**
 * GET /api/buildings/{buildingId}
 * Purpose: Get complete building data with all zones and current sensor readings
 * Usage: Initial dashboard load
 */
router.get(
  '/:buildingId',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;

      const buildingData = await dbService.getBuildingData(buildingId);

      res.json({
        success: true,
        data: buildingData,
      } as ApiResponse<BuildingDataResponse>);

      logger.info(
        `Building data retrieved for ${buildingId} by user ${req.user?.email}`
      );
    } catch (error) {
      logger.error('Error retrieving building data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BUILDING_DATA_ERROR',
          message: 'Failed to retrieve building data',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * GET /api/buildings/{buildingId}/alerts
 * Purpose: Get current active alerts for the building
 * Usage: Display alerts panel
 */
router.get(
  '/:buildingId/alerts',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;

      const alerts = await dbService.getActiveAlerts(buildingId);

      res.json({
        success: true,
        data: alerts,
      } as ApiResponse<AlertNotificationResponse[]>);

      logger.debug(`Active alerts retrieved for building ${buildingId}`);
    } catch (error) {
      logger.error('Error retrieving building alerts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ALERTS_ERROR',
          message: 'Failed to retrieve building alerts',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * GET /api/buildings/{buildingId}/overview
 * Purpose: Get aggregated data for air quality overview charts
 */
router.get(
  '/:buildingId/overview',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;

      const overview = await dbService.getBuildingOverview(buildingId);

      res.json({
        success: true,
        data: overview,
      } as ApiResponse<BuildingOverviewResponse>);

      logger.debug(`Building overview retrieved for ${buildingId}`);
    } catch (error) {
      logger.error('Error retrieving building overview:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OVERVIEW_ERROR',
          message: 'Failed to retrieve building overview',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * GET /api/buildings/{buildingId}/analytics
 * Purpose: Get building analytics data with time-based aggregations
 * Query Parameters: period (24h, 7d, 30d)
 */
router.get(
  '/:buildingId/analytics',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;
      const { period } = req.query;

      // Validate period parameter
      const validPeriods = ['24h', '7d', '30d'];
      const selectedPeriod = validPeriods.includes(period as string)
        ? (period as '24h' | '7d' | '30d')
        : '7d';

      const analytics = await dbService.getBuildingAnalytics(
        buildingId,
        selectedPeriod
      );

      res.json({
        success: true,
        data: analytics,
      } as ApiResponse);

      logger.debug(
        `Building analytics retrieved for ${buildingId}, period: ${selectedPeriod}`
      );
    } catch (error) {
      logger.error('Error retrieving building analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to retrieve building analytics',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

// =============================================================================
// Real-time Data Endpoints
// =============================================================================

/**
 * POST /api/buildings/{buildingId}/sensor-data
 * Purpose: Receive sensor data (typically from IoT devices)
 * This endpoint would be called by sensor systems to submit readings
 */
router.post(
  '/:buildingId/sensor-data',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;
      const { sensor_id, value, timestamp, raw_value, quality_score } =
        req.body;

      if (!sensor_id || value === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SENSOR_DATA',
            message: 'sensor_id and value are required',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Verify sensor belongs to this building
      const sensor = await dbService.getSensor(sensor_id);
      if (!sensor) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SENSOR_NOT_FOUND',
            message: 'Sensor not found',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Get zone to verify building ownership
      const zone = await dbService.getZone(sensor.zone_id);
      if (!zone || zone.building_id !== buildingId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'SENSOR_ACCESS_DENIED',
            message: 'Sensor does not belong to this building',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Insert sensor reading
      const reading = await dbService.insertSensorReading({
        time: timestamp || new Date().toISOString(),
        sensor_id,
        value: parseFloat(value),
        raw_value: raw_value ? parseFloat(raw_value) : undefined,
        quality_score: quality_score || 100,
      });

      // Broadcast real-time update
      try {
        const wsService = getWebSocketService();
        const latestReadings = await dbService.getLatestReadings(zone.id);
        const sensorReading = latestReadings.find((r) => r.id === sensor_id);

        if (sensorReading) {
          wsService.broadcastSensorReading(zone.id, sensorReading);
        }
      } catch (wsError) {
        logger.warn('Failed to broadcast sensor reading:', wsError);
        // Don't fail the request if WebSocket broadcast fails
      }

      res.status(201).json({
        success: true,
        data: {
          id: reading.sensor_id,
          timestamp: reading.time,
          status: reading.status,
          message: 'Sensor reading recorded successfully',
        },
      } as ApiResponse);

      logger.debug(`Sensor reading recorded: ${sensor_id} = ${value}`);
    } catch (error) {
      logger.error('Error recording sensor data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SENSOR_DATA_ERROR',
          message: 'Failed to record sensor data',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/buildings/{buildingId}/occupancy
 * Purpose: Update zone occupancy data
 */
router.post(
  '/:buildingId/occupancy',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;
      const { zone_id, occupancy_count, detection_method } = req.body;

      if (!zone_id || occupancy_count === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OCCUPANCY_DATA',
            message: 'zone_id and occupancy_count are required',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Verify zone belongs to this building
      const zone = await dbService.getZone(zone_id);
      if (!zone || zone.building_id !== buildingId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ZONE_ACCESS_DENIED',
            message: 'Zone does not belong to this building',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Insert occupancy log
      const occupancyLog = await dbService.insertOccupancyLog({
        time: new Date().toISOString(),
        zone_id,
        occupancy_count: parseInt(occupancy_count),
        max_occupancy: zone.max_occupancy,
        detection_method: detection_method || 'manual',
      });

      // Broadcast real-time update
      try {
        const wsService = getWebSocketService();
        wsService.broadcastOccupancyUpdate(zone_id, occupancyLog);
      } catch (wsError) {
        logger.warn('Failed to broadcast occupancy update:', wsError);
      }

      res.status(201).json({
        success: true,
        data: {
          zone_id,
          occupancy_count: occupancyLog.occupancy_count,
          occupancy_percentage: occupancyLog.occupancy_percentage,
          timestamp: occupancyLog.time,
          message: 'Occupancy data recorded successfully',
        },
      } as ApiResponse);

      logger.debug(
        `Occupancy updated: zone ${zone_id} = ${occupancy_count}/${zone.max_occupancy}`
      );
    } catch (error) {
      logger.error('Error recording occupancy data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OCCUPANCY_DATA_ERROR',
          message: 'Failed to record occupancy data',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

// =============================================================================
// Building Management Endpoints (Admin only)
// =============================================================================

/**
 * GET /api/buildings
 * Purpose: Get all buildings (admin/manager only)
 */
router.get(
  '/',
  authorize(['admin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const buildings = await dbService.getAllBuildings();

      res.json({
        success: true,
        data: buildings,
      } as ApiResponse);

      logger.debug(`All buildings retrieved by user ${req.user?.email}`);
    } catch (error) {
      logger.error('Error retrieving buildings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BUILDINGS_ERROR',
          message: 'Failed to retrieve buildings',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/buildings
 * Purpose: Create a new building (admin only)
 */
router.post(
  '/',
  authorize(['admin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        address,
        timezone,
        temperature_unit,
        contact_email,
        contact_phone,
      } = req.body;

      if (!name || !address) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BUILDING_DATA',
            message: 'name and address are required',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      const building = await dbService.createBuilding({
        name,
        address,
        timezone: timezone || 'UTC',
        temperature_unit: temperature_unit || 'celsius',
        contact_email,
        contact_phone,
      });

      res.status(201).json({
        success: true,
        data: building,
      } as ApiResponse);

      logger.info(
        `Building created: ${building.name} by user ${req.user?.email}`
      );
    } catch (error) {
      logger.error('Error creating building:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_BUILDING_ERROR',
          message: 'Failed to create building',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * PUT /api/buildings/{buildingId}
 * Purpose: Update building information (admin only)
 */
router.put(
  '/:buildingId',
  authorize(['admin']),
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated this way
      delete updates.id;
      delete updates.created_at;
      delete updates.updated_at;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_UPDATES_PROVIDED',
            message: 'No valid updates provided',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      const building = await dbService.updateBuilding(buildingId, updates);

      res.json({
        success: true,
        data: building,
      } as ApiResponse);

      logger.info(`Building updated: ${buildingId} by user ${req.user?.email}`);
    } catch (error) {
      logger.error('Error updating building:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_BUILDING_ERROR',
          message: 'Failed to update building',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

// =============================================================================
// Health and Status Endpoints
// =============================================================================

/**
 * GET /api/buildings/{buildingId}/health
 * Purpose: Get building system health status
 */
router.get(
  '/:buildingId/health',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;

      // Get building basic info
      const building = await dbService.getBuilding(buildingId);
      if (!building) {
        res.status(404).json({
          success: false,
          error: {
            code: 'BUILDING_NOT_FOUND',
            message: 'Building not found',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Get zones count
      const zones = await dbService.getZonesByBuilding(buildingId);

      // Get active sensors count
      let activeSensors = 0;
      for (const zone of zones) {
        const sensors = await dbService.getSensorsByZone(zone.id);
        activeSensors += sensors.length;
      }

      // Get active alerts count
      const activeAlerts = await dbService.getActiveAlerts(buildingId);

      // Get WebSocket connections count
      let connectedClients = 0;
      try {
        const wsService = getWebSocketService();
        connectedClients = wsService.getConnectedClientsForBuilding(buildingId);
      } catch (wsError) {
        logger.warn('WebSocket service not available for health check');
      }

      const healthStatus = {
        building: {
          id: building.id,
          name: building.name,
          status: 'operational',
        },
        zones: zones.length,
        activeSensors,
        activeAlerts: activeAlerts.length,
        connectedClients,
        lastUpdated: new Date().toISOString(),
      };

      res.json({
        success: true,
        data: healthStatus,
      } as ApiResponse);

      logger.debug(`Health status retrieved for building ${buildingId}`);
    } catch (error) {
      logger.error('Error retrieving building health:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to retrieve building health status',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

export default router;
