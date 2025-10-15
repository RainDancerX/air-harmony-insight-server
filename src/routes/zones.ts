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
  ZoneResponse,
  HistoricalDataResponse,
  Zone,
} from '../types';

const router = Router();

// Apply authentication to all zone routes
router.use(authenticate);

// =============================================================================
// Zones Page Endpoints
// =============================================================================

/**
 * GET /api/buildings/{buildingId}/zones
 * Purpose: Get all zones with current readings
 * Query Parameters: floor, search, status
 */
router.get(
  '/buildings/:buildingId/zones',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;
      const { floor, search, status } = req.query;

      // Get zones with optional filters
      const filters: any = {};
      if (floor) {
        filters.floor = parseInt(floor as string);
      }

      let zones = await dbService.getZonesByBuilding(buildingId, filters);

      // Apply search filter if provided
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        zones = zones.filter((zone) =>
          zone.name.toLowerCase().includes(searchTerm)
        );
      }

      // Build zone response with current readings
      const zoneResponses: (ZoneResponse | null)[] = await Promise.all(
        zones.map(async (zone) => {
          const readings = await dbService.getLatestReadings(zone.id);
          const occupancy = await dbService.getLatestOccupancy(zone.id);

          // Apply status filter if provided
          if (status) {
            const hasMatchingStatus = readings.some(
              (reading) => reading.status === status
            );
            if (!hasMatchingStatus) {
              return null;
            }
          }

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

      // Filter out null results from status filtering
      const filteredZones = zoneResponses.filter(
        (zone): zone is ZoneResponse => zone !== null
      );

      res.json({
        success: true,
        data: filteredZones,
      } as ApiResponse<ZoneResponse[]>);

      logger.debug(
        `Zones retrieved for building ${buildingId}: ${filteredZones.length} zones`
      );
    } catch (error) {
      logger.error('Error retrieving zones:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ZONES_ERROR',
          message: 'Failed to retrieve zones',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * GET /api/buildings/{buildingId}/zones/{zoneId}
 * Purpose: Get specific zone details
 */
router.get(
  '/buildings/:buildingId/zones/:zoneId',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId, zoneId } = req.params;

      // Verify zone belongs to building
      const zone = await dbService.getZone(zoneId);
      if (!zone || zone.building_id !== buildingId) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ZONE_NOT_FOUND',
            message: 'Zone not found in this building',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      const readings = await dbService.getLatestReadings(zoneId);
      const occupancy = await dbService.getLatestOccupancy(zoneId);

      const zoneResponse: ZoneResponse = {
        id: zone.id,
        name: zone.name,
        floor: zone.floor,
        readings,
        occupancy: occupancy?.occupancy_count || 0,
        maxOccupancy: zone.max_occupancy,
        lastUpdated: readings[0]?.timestamp || new Date().toISOString(),
      };

      res.json({
        success: true,
        data: zoneResponse,
      } as ApiResponse<ZoneResponse>);

      logger.debug(`Zone details retrieved: ${zoneId}`);
    } catch (error) {
      logger.error('Error retrieving zone details:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ZONE_DETAILS_ERROR',
          message: 'Failed to retrieve zone details',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

// =============================================================================
// Zone Details Page Endpoints
// =============================================================================

/**
 * GET /api/zones/{zoneId}/details
 * Purpose: Get comprehensive zone data including historical trends
 */
router.get(
  '/:zoneId/details',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId } = req.params;

      // Get zone basic info
      const zone = await dbService.getZone(zoneId);
      if (!zone) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ZONE_NOT_FOUND',
            message: 'Zone not found',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Get current readings
      const readings = await dbService.getLatestReadings(zoneId);
      const occupancy = await dbService.getLatestOccupancy(zoneId);

      // Get sensors for this zone
      const sensors = await dbService.getSensorsByZone(zoneId);

      // Generate basic historical data for the past 24 hours
      const historicalData: Record<string, any[]> = {};
      const sensorTypes = await dbService.getSensorTypes();

      for (const sensorType of sensorTypes) {
        try {
          const history = await dbService.getHistoricalReadings(
            zoneId,
            sensorType.type_name,
            '24h',
            '1h'
          );
          if (history.data.length > 0) {
            historicalData[sensorType.type_name] = history.data;
          }
        } catch (historyError) {
          logger.warn(
            `Failed to get historical data for ${sensorType.type_name}:`,
            historyError
          );
        }
      }

      // Generate basic recommendations based on current readings
      const recommendations: string[] = [];
      readings.forEach((reading) => {
        if (reading.status === 'critical') {
          recommendations.push(
            `Immediate action required: ${reading.type} level is critical (${reading.value} ${reading.unit})`
          );
        } else if (reading.status === 'poor') {
          recommendations.push(
            `Consider improving ${reading.type} levels (currently ${reading.value} ${reading.unit})`
          );
        }
      });

      if (occupancy && occupancy.occupancy_percentage > 90) {
        recommendations.push(
          'Zone is near maximum occupancy. Consider increasing ventilation.'
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          'All sensor readings are within acceptable ranges.'
        );
      }

      const detailedZone = {
        zone: {
          id: zone.id,
          name: zone.name,
          floor: zone.floor,
          readings,
          occupancy: occupancy?.occupancy_count || 0,
          maxOccupancy: zone.max_occupancy,
          lastUpdated: readings[0]?.timestamp || new Date().toISOString(),
          zoneType: zone.zone_type,
          areaSqm: zone.area_sqm,
          sensors: sensors.length,
        },
        historicalData,
        recommendations,
      };

      res.json({
        success: true,
        data: detailedZone,
      } as ApiResponse);

      logger.debug(`Detailed zone data retrieved: ${zoneId}`);
    } catch (error) {
      logger.error('Error retrieving zone details:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ZONE_DETAILS_ERROR',
          message: 'Failed to retrieve zone details',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * GET /api/zones/{zoneId}/history
 * Purpose: Get historical sensor data for charts
 * Query Parameters: sensorType, period, interval
 */
router.get(
  '/:zoneId/history',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId } = req.params;
      const { sensorType, period, interval } = req.query;

      if (!sensorType) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_SENSOR_TYPE',
            message: 'sensorType query parameter is required',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Validate period and interval
      const validPeriods = ['24h', '7d', '30d'];
      const validIntervals = ['5m', '1h', '1d'];

      const selectedPeriod = validPeriods.includes(period as string)
        ? (period as '24h' | '7d' | '30d')
        : '24h';
      const selectedInterval = validIntervals.includes(interval as string)
        ? (interval as '5m' | '1h' | '1d')
        : '1h';

      // Verify zone exists
      const zone = await dbService.getZone(zoneId);
      if (!zone) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ZONE_NOT_FOUND',
            message: 'Zone not found',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      const historicalData = await dbService.getHistoricalReadings(
        zoneId,
        sensorType as string,
        selectedPeriod,
        selectedInterval
      );

      res.json({
        success: true,
        data: historicalData,
      } as ApiResponse<HistoricalDataResponse>);

      logger.debug(
        `Historical data retrieved for zone ${zoneId}, sensor ${sensorType}`
      );
    } catch (error) {
      logger.error('Error retrieving historical data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HISTORICAL_DATA_ERROR',
          message: 'Failed to retrieve historical data',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/zones/{zoneId}/controls
 * Purpose: Send control commands to zone systems
 */
router.post(
  '/:zoneId/controls',
  authorize(['admin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId } = req.params;
      const { action, parameters } = req.body;

      if (!action) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_ACTION',
            message: 'action is required',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Verify zone exists
      const zone = await dbService.getZone(zoneId);
      if (!zone) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ZONE_NOT_FOUND',
            message: 'Zone not found',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      const validActions = [
        'increase_ventilation',
        'decrease_ventilation',
        'adjust_temperature',
        'emergency_purge',
      ];

      if (!validActions.includes(action)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: `Action must be one of: ${validActions.join(', ')}`,
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Log the control action
      await dbService.query(
        `INSERT INTO audit_logs (time, user_id, action, entity_type, entity_id, new_values)
       VALUES (NOW(), $1, $2, 'zone_control', $3, $4)`,
        [
          req.user?.id,
          `zone_control_${action}`,
          zoneId,
          JSON.stringify({ action, parameters }),
        ]
      );

      // In a real implementation, you would send the control command to the building automation system
      // For now, we'll just simulate the response
      let message = '';
      switch (action) {
        case 'increase_ventilation':
          message = 'Ventilation system has been increased';
          break;
        case 'decrease_ventilation':
          message = 'Ventilation system has been decreased';
          break;
        case 'adjust_temperature':
          message = `Temperature has been adjusted${
            parameters?.temperature ? ` to ${parameters.temperature}°C` : ''
          }`;
          break;
        case 'emergency_purge':
          message = 'Emergency air purge has been activated';
          break;
      }

      // Broadcast control action to WebSocket clients
      try {
        const wsService = getWebSocketService();
        wsService.sendToZone(zoneId, 'zone_control', {
          action,
          parameters,
          message,
          timestamp: new Date().toISOString(),
          user: req.user?.name,
        });
      } catch (wsError) {
        logger.warn('Failed to broadcast zone control action:', wsError);
      }

      res.json({
        success: true,
        data: {
          action,
          parameters,
          message,
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);

      logger.info(
        `Zone control action executed: ${action} on zone ${zoneId} by user ${req.user?.email}`
      );
    } catch (error) {
      logger.error('Error executing zone control:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ZONE_CONTROL_ERROR',
          message: 'Failed to execute zone control',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * POST /api/buildings/:buildingId/alerts/clear
 * Purpose: Resolve (clear) all active alerts for a building
 * Requires authentication and building access
 */
router.post(
  '/buildings/:buildingId/alerts/clear',
  validateBuildingAccess,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { buildingId } = req.params;
      const userId = req.user?.id || null;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      const resolvedCount = await dbService.resolveAllAlertsForBuilding(
        buildingId,
        userId
      );
      res.json({
        success: true,
        data: { resolvedCount },
      });
      logger.info(
        `All alerts resolved for building ${buildingId} by user ${userId} (${resolvedCount} alerts)`
      );
    } catch (error) {
      logger.error('Error clearing all alerts for building:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEAR_ALERTS_ERROR',
          message: 'Failed to clear alerts for building',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// =============================================================================
// Zone Management Endpoints (Admin/Manager only)
// =============================================================================

/**
 * POST /api/zones
 * Purpose: Create a new zone (admin/manager only)
 */
router.post(
  '/',
  authorize(['admin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { building_id, name, floor, max_occupancy, zone_type, area_sqm } =
        req.body;

      if (!building_id || !name || floor === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ZONE_DATA',
            message: 'building_id, name, and floor are required',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Verify building exists
      const building = await dbService.getBuilding(building_id);
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

      const zone = await dbService.createZone({
        building_id,
        name,
        floor: parseInt(floor),
        max_occupancy: max_occupancy || 50,
        zone_type: zone_type || 'office',
        area_sqm: area_sqm ? parseFloat(area_sqm) : undefined,
      });

      res.status(201).json({
        success: true,
        data: zone,
      } as ApiResponse<Zone>);

      logger.info(
        `Zone created: ${zone.name} in building ${building_id} by user ${req.user?.email}`
      );
    } catch (error) {
      logger.error('Error creating zone:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ZONE_ERROR',
          message: 'Failed to create zone',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

/**
 * PUT /api/zones/{zoneId}
 * Purpose: Update zone information (admin/manager only)
 */
router.put(
  '/:zoneId',
  authorize(['admin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId } = req.params;
      const updates = req.body;

      // Verify zone exists
      const zone = await dbService.getZone(zoneId);
      if (!zone) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ZONE_NOT_FOUND',
            message: 'Zone not found',
            timestamp: new Date().toISOString(),
          },
        } as ApiResponse);
        return;
      }

      // Remove sensitive fields that shouldn't be updated this way
      delete updates.id;
      delete updates.building_id;
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

      // Build update query dynamically
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      const values = [zoneId, ...Object.values(updates)];

      const result = await dbService.query(
        `UPDATE zones SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        values
      );

      res.json({
        success: true,
        data: result[0],
      } as ApiResponse<Zone>);

      logger.info(`Zone updated: ${zoneId} by user ${req.user?.email}`);
    } catch (error) {
      logger.error('Error updating zone:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ZONE_ERROR',
          message: 'Failed to update zone',
          timestamp: new Date().toISOString(),
        },
      } as ApiResponse);
    }
  }
);

export default router;
