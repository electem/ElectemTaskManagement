// src/routes/metrics.route.ts
import express from 'express';
import { MetricsController } from '../controllers/metrics.controller';

const metricsRoutes = express.Router();

// Individual Metric Endpoints
metricsRoutes.get('/cycle-efficiency/:developerId', MetricsController.getCycleEfficiency);
metricsRoutes.get('/delivery-rate/:developerId', MetricsController.getDeliveryRate);
metricsRoutes.get('/rework-ratio/:developerId', MetricsController.getReworkRatio);

// Combined Dashboard Metrics
metricsRoutes.get('/developer/:developerId', MetricsController.getAllMetrics);
metricsRoutes.get("/all", MetricsController.getAllDevelopersMetrics);

export default metricsRoutes;
