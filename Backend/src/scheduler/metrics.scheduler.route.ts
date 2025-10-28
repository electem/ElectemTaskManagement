// src/routes/metrics.scheduler.route.ts
import express from 'express';
import { MetricsSchedulerController } from './metrics.scheduler.controller';

const router = express.Router();

// Run metrics job for a specific period
// GET /metrics/scheduler/run/:period
// e.g. /metrics/scheduler/run/daily
router.get('/run/:period', MetricsSchedulerController.runPeriodMetrics);

// Run all (daily + weekly + monthly)
router.get('/run-all', MetricsSchedulerController.runAllMetrics);

export default router;
