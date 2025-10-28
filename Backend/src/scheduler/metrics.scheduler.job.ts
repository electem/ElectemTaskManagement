// src/jobs/metrics.scheduler.job.ts
import prisma from "../prisma/client";
import { MetricsSchedulerHelper } from './metrics.scheduler.helper';
import {
  getCycleEfficiencyByDeveloperAndPeriod,
  getDeliveryRateByDeveloper,
  getReworkRatioByDeveloper,
} from './metrics.scheduler.logic'; // You already have these functions

export class MetricsSchedulerJob {
  /**
   * Run metrics computation for all developers for a given period
   */
  static async runForPeriod(periodType: 'daily' | 'weekly' | 'monthly') {
    const { startDate, endDate } = MetricsSchedulerHelper.getDateRange(periodType);
    const developerIds = await MetricsSchedulerHelper.getAllDevelopers();

    console.log(`⚙️ Running metrics job for ${periodType} (${developerIds.length} developers)`);

    for (const developerId of developerIds) {
      const [cycle, delivery, rework] = await Promise.all([
        getCycleEfficiencyByDeveloperAndPeriod(developerId, startDate, endDate),
        getDeliveryRateByDeveloper(developerId, startDate, endDate),
        getReworkRatioByDeveloper(developerId, startDate, endDate),
      ]);

      await prisma.developerPerformanceMetric.upsert({
        where: {
          developerId_periodType_startDate_endDate: {
            developerId,
            periodType,
            startDate,
            endDate,
          },
        },
        update: {
          cycleEfficiency: cycle.cycleEfficiency,
          totalLeadHours: cycle.totalLeadHours,
          totalActiveHours: cycle.totalActiveHours,
          completedTaskCount: cycle.completedTaskCount,
          deliveryRatePerDay: delivery.deliveryRatePerDay,
          completedCount: delivery.completedCount,
          reworkRatio: rework.reworkRatio,
          totalReopened: rework.totalReopened,
          computedAt: new Date(),
        },
        create: {
          developerId,
          periodType,
          startDate,
          endDate,
          cycleEfficiency: cycle.cycleEfficiency,
          totalLeadHours: cycle.totalLeadHours,
          totalActiveHours: cycle.totalActiveHours,
          completedTaskCount: cycle.completedTaskCount,
          deliveryRatePerDay: delivery.deliveryRatePerDay,
          completedCount: delivery.completedCount,
          reworkRatio: rework.reworkRatio,
          totalReopened: rework.totalReopened,
        },
      });

      console.log(`✅ Metrics saved for Developer ${developerId} (${periodType})`);
    }

    console.log(`🎯 Completed metrics computation for ${periodType}`);
  }

  /**
   * Run all period types sequentially
   */
  static async runAll() {
    await this.runForPeriod('daily');
    await this.runForPeriod('weekly');
    await this.runForPeriod('monthly');
  }
}
