import { Router } from 'express';
import healthRoutes from './health';
import authRoutes from './auth';
import buildingRoutes from './buildings';
import zoneRoutes from './zones';
import chatRoutes from './chat';
import apiRoutes from './api';

const router = Router();

// Health check routes (no authentication required)
router.use('/health', healthRoutes);

// Authentication routes (no authentication required)
router.use('/api/auth', authRoutes);

// Building management routes (authentication required)
router.use('/api/buildings', buildingRoutes);

// Zone management routes (authentication required)
router.use('/api/zones', zoneRoutes);

// Chat routes (authentication required)
router.use('/api/chat', chatRoutes);

// General API information routes
router.use('/api', apiRoutes);

export default router;
