// src/helpers/metrics.scheduler.helper.ts
import { startOfDay, endOfDay, subDays, subWeeks, subMonths } from 'date-fns';
import prisma from "../prisma/client";

export class MetricsSchedulerHelper {
  /**
   * Generate start and end date for a given periodType (daily, weekly, monthly)
   */
  static getDateRange(periodType: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let startDate: Date;

    switch (periodType) {
      case 'daily':
        startDate = startOfDay(subDays(now, 1));
        break;
      case 'weekly':
        startDate = startOfDay(subWeeks(now, 1));
        break;
      case 'monthly':
        startDate = startOfDay(subMonths(now, 1));
        break;
      default:
        startDate = startOfDay(subDays(now, 1));
    }

    const endDate = endOfDay(now);
    return { startDate, endDate };
  }

  /**
   * Get all distinct developers with assigned tasks
   */
  static async getAllDevelopers(): Promise<string[]> {
    const developers = await prisma.task.findMany({
      distinct: ['owner'],
      select: { owner: true },
    });

    return developers.map((d) => d.owner!) as string[];
  }

  /**
   * Generic loop executor that takes a callback per developer
   */
  static async forEachDeveloper(
    callback: (developerId: string) => Promise<void>
  ) {
    const developerIds = await this.getAllDevelopers();
    for (const developerId of developerIds) {
      await callback(developerId);
    }
  }
}
