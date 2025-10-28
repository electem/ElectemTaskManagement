// src/controllers/metrics.controller.ts
import prisma from "../prisma/client";
import { Request, Response } from 'express';

export class MetricsController {

  /**
   * GET /metrics/cycle-efficiency/:developerId
   * Returns last 12 records of cycle efficiency for given period
   */
  static async getCycleEfficiency(req: Request, res: Response) {
    try {
      const developerId = Number(req.params.developerId);
      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'weekly';

      const data = await prisma.developerPerformanceMetric.findMany({
        where: { developerId, periodType: period },
        orderBy: { startDate: 'desc' },
        take: 12,
        select: {
          startDate: true,
          endDate: true,
          cycleEfficiency: true,
          totalLeadHours: true,
          totalActiveHours: true,
          completedTaskCount: true,
          computedAt: true,
        },
      });

      return res.json({ developerId, period, records: data.reverse() });
    } catch (error) {
      console.error('❌ Error fetching cycle efficiency:', error);
      res.status(500).json({ error: 'Failed to fetch cycle efficiency data' });
    }
  }

  /**
   * GET /metrics/delivery-rate/:developerId
   * Returns last 12 delivery rate records for given period
   */
  static async getDeliveryRate(req: Request, res: Response) {
    try {
      const developerId = Number(req.params.developerId);
      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'weekly';

      const data = await prisma.developerPerformanceMetric.findMany({
        where: { developerId, periodType: period },
        orderBy: { startDate: 'desc' },
        take: 12,
        select: {
          startDate: true,
          endDate: true,
          completedCount: true,
          deliveryRatePerDay: true,
          computedAt: true,
        },
      });

      return res.json({ developerId, period, records: data.reverse() });
    } catch (error) {
      console.error('❌ Error fetching delivery rate:', error);
      res.status(500).json({ error: 'Failed to fetch delivery rate data' });
    }
  }

  /**
   * GET /metrics/rework-ratio/:developerId
   * Returns last 12 rework ratio records for given period
   */
  static async getReworkRatio(req: Request, res: Response) {
    try {
      const developerId = Number(req.params.developerId);
      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'weekly';

      const data = await prisma.developerPerformanceMetric.findMany({
        where: { developerId, periodType: period },
        orderBy: { startDate: 'desc' },
        take: 12,
        select: {
          startDate: true,
          endDate: true,
          reworkRatio: true,
          totalReopened: true,
          totalCompleted: true,
          computedAt: true,
        },
      });

      return res.json({ developerId, period, records: data.reverse() });
    } catch (error) {
      console.error('❌ Error fetching rework ratio:', error);
      res.status(500).json({ error: 'Failed to fetch rework ratio data' });
    }
  }

  /**
   * GET /metrics/developer/:developerId
   * Returns all three metrics together for dashboard
   */
  static async getAllMetrics(req: Request, res: Response) {
    try {
      const developerId = Number(req.params.developerId);
      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'weekly';

      const records = await prisma.developerPerformanceMetric.findMany({
        where: { developerId, periodType: period },
        orderBy: { startDate: 'desc' },
        take: 12,
        select: {
          startDate: true,
          endDate: true,
          cycleEfficiency: true,
          deliveryRatePerDay: true,
          reworkRatio: true,
          completedCount: true,
          totalReopened: true,
          completedTaskCount: true,
          computedAt: true,
        },
      });

      return res.json({ developerId, period, records: records.reverse() });
    } catch (error) {
      console.error('❌ Error fetching combined metrics:', error);
      res.status(500).json({ error: 'Failed to fetch combined metrics data' });
    }
  }
}
