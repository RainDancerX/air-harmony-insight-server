import { Router } from 'express';
import healthRoutes from './health';
import apiRoutes from './api';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/api', apiRoutes);

export default router;
