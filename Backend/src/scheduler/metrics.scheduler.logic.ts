import prisma from "../prisma/client";

// ADD AT TOP OF FILE
const ACTIVE_STATUSES = [
  "In Progress", "Reviewed", "Tested", "Needs Validation",
  "Changes Requested", "Reviewed by Vinod"
];

const COMPLETION_STATUSES = [
  "Completed", "Tested", "Reviewed by Vinod" // Define what counts as done
];

const INACTIVE_STATUSES = [
  "Pending", "On Hold", "Paused", "Partially Clear", "Draft", "Bug"
];

// ADD THESE HELPER FUNCTIONS AT TOP OF FILE

// Safe array inclusion check for nullable values
function isActiveStatus(status: string | null): boolean {
  return status ? ACTIVE_STATUSES.includes(status) : false;
}

function isCompletionStatus(status: string | null): boolean {
  return status ? COMPLETION_STATUSES.includes(status) : false;
}

function isInactiveStatus(status: string | null): boolean {
  return status ? INACTIVE_STATUSES.includes(status) : false;
}
export async function getCycleEfficiencyByDeveloperAndPeriod(
  developerId: string,
  startDate: Date,
  endDate: Date
) {
  // ONLY get tasks that were COMPLETED in this period
  const completionEvents = await prisma.taskChangeHistory.findMany({
    where: {
      fieldChanged: 'status',
      newValue: { in: COMPLETION_STATUSES },
      changedAt: { gte: startDate, lte: endDate },
      task: { owner: developerId },
    },
    include: {
      task: {
        include: {
          histories: {
            where: { fieldChanged: 'status' },
            orderBy: { changedAt: 'asc' },
          },
        },
      },
    },
  });

  let totalLeadTime = 0;
  let totalActiveTime = 0;
  const completedTaskIds = new Set<number>();

  for (const completionEvent of completionEvents) {
    const taskId = completionEvent.taskId;

    // Avoid double-counting same task
    if (completedTaskIds.has(taskId)) continue;
    completedTaskIds.add(taskId);

    const task = completionEvent.task;
    const allStatusChanges = task.histories;

    let taskActiveTime = 0;
    let currentActiveStart: Date | null = null;

    // Calculate active time for ENTIRE task lifetime
    for (const change of allStatusChanges) {
      if (isActiveStatus(change.newValue) && !currentActiveStart) {
        currentActiveStart = change.changedAt;
      }

      if (currentActiveStart &&
          (isInactiveStatus(change.newValue) || isCompletionStatus(change.newValue))) {
        taskActiveTime += change.changedAt.getTime() - currentActiveStart.getTime();
        currentActiveStart = null;
      }
    }

    // Calculate lead time (creation to completion)
    const leadTime = completionEvent.changedAt.getTime() - task.createdAt.getTime();

    totalLeadTime += leadTime;
    totalActiveTime += taskActiveTime;
  }

  const completedTaskCount = completedTaskIds.size;
  const cycleEfficiency = totalLeadTime > 0 ? (totalActiveTime / totalLeadTime) * 100 : 0;

  return {
    developerId,
    startDate,
    endDate,
    completedTaskCount,
    totalLeadHours: +(totalLeadTime / 3600000).toFixed(2),
    totalActiveHours: +(totalActiveTime / 3600000).toFixed(2),
    cycleEfficiency: +cycleEfficiency.toFixed(2),
  };
}
export async function getDeliveryRateByDeveloper(developerId: string, startDate: Date, endDate: Date) {
  // Get UNIQUE tasks completed in period
  const completedTasks = await prisma.taskChangeHistory.findMany({
    where: {
      fieldChanged: 'status',
      newValue: { in: COMPLETION_STATUSES },
      changedAt: { gte: startDate, lte: endDate },
      task: { owner: developerId },
    },
    distinct: ['taskId'],
    select: { taskId: true },
  });

  const completedCount = completedTasks.length;
  const totalDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const deliveryRatePerDay = completedCount / totalDays;

  return {
    developerId,
    completedCount,
    periodDays: +totalDays.toFixed(1),
    deliveryRatePerDay: +deliveryRatePerDay.toFixed(2),
  };
}


export async function getReworkRatioByDeveloper(developerId: string, startDate: Date, endDate: Date) {
  // Get all completion events in period
  const completionEvents = await prisma.taskChangeHistory.findMany({
    where: {
      fieldChanged: 'status',
      newValue: { in: COMPLETION_STATUSES },
      changedAt: { gte: startDate, lte: endDate },
      task: { owner: developerId },
    },
    select: { taskId: true, changedAt: true },
  });

  const completedTasks = new Set<number>();
  const reopenedTasks = new Set<number>();

  for (const completion of completionEvents) {
    completedTasks.add(completion.taskId);

    // Check if this task was later reopened (moved back to active status)
    const laterReopening = await prisma.taskChangeHistory.findFirst({
      where: {
        taskId: completion.taskId,
        fieldChanged: 'status',
        oldValue: { in: COMPLETION_STATUSES },
        newValue: { in: ACTIVE_STATUSES },
        changedAt: { gt: completion.changedAt, lte: endDate },
      },
    });

    if (laterReopening) {
      reopenedTasks.add(completion.taskId);
    }
  }

  const reworkRatio = completedTasks.size > 0 ? (reopenedTasks.size / completedTasks.size) * 100 : 0;

  return {
    developerId,
    totalCompleted: completedTasks.size,
    totalReopened: reopenedTasks.size,
    reworkRatio: +reworkRatio.toFixed(2),
  };
}
