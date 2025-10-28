// src/controllers/metrics.scheduler.controller.ts
import { Request, Response } from 'express';
import { MetricsSchedulerJob } from './metrics.scheduler.job';

export class MetricsSchedulerController {
  static async runAllMetrics(req: Request, res: Response) {
    try {
      await MetricsSchedulerJob.runAll();
      res.json({ message: '✅ Metrics computation completed for all periods.' });
    } catch (error) {
      console.error('❌ Error running all metrics job:', error);
      res.status(500).json({ error: 'Failed to run all metrics job' });
    }
  }

  static async runPeriodMetrics(req: Request, res: Response) {
    try {
      const period = (req.params.period as 'daily' | 'weekly' | 'monthly') || 'daily';
      await MetricsSchedulerJob.runForPeriod(period);
      res.json({ message: `✅ Metrics computation completed for ${period}` });
    } catch (error) {
      console.error('❌ Error running period metrics job:', error);
      res.status(500).json({ error: 'Failed to run metrics for given period' });
    }
  }
}
