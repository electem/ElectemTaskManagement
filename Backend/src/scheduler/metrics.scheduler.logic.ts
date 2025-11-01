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


// ADD THIS HELPER FUNCTION
async function getOwnerAtTime(taskId: number, timestamp: Date): Promise<string> {
  const ownerChange = await prisma.taskChangeHistory.findFirst({
    where: {
      taskId: taskId,
      fieldChanged: 'owner',
      changedAt: { lte: timestamp },
    },
    orderBy: { changedAt: 'desc' },
    select: { newValue: true },
  });

  return ownerChange?.newValue || 'Unknown';
}
export async function getCycleEfficiencyByDeveloperAndPeriod(
  developerId: string,
  startDate: Date,
  endDate: Date
) {
  // GET ALL TASKS that had ANY activity in period (not filtered by owner)
  const tasks = await prisma.task.findMany({
    where: {
      histories: {
        some: {
          fieldChanged: 'status',
          changedAt: { gte: startDate, lte: endDate },
        },
      },
    },
    include: {
      histories: {
        where: {
          fieldChanged: { in: ['status', 'owner'] }, // GET OWNER CHANGES TOO
          changedAt: { gte: startDate, lte: endDate },
        },
        orderBy: { changedAt: 'asc' },
      },
    },
  });

  // TRACK METICS PER DEVELOPER
  const developerMetrics: Record<string, { activeTime: number; leadTime: number; completedCount: number }> = {};

  for (const task of tasks) {
    const changes = task.histories;
    if (!changes.length) continue;

    let currentActiveStart: Date | null = null;
    let currentOwner: string = task.owner || 'Unknown';

    for (const change of changes) {
      // UPDATE OWNER if owner change
      if (change.fieldChanged === 'owner') {
        currentOwner = change.newValue || currentOwner;
      }

      // Start active time when entering ACTIVE status
      if (change.fieldChanged === 'status' && isActiveStatus(change.newValue) && !currentActiveStart) {
        currentActiveStart = change.changedAt;
      }

      // End active time when leaving ACTIVE status
      if (currentActiveStart && change.fieldChanged === 'status' &&
          (isInactiveStatus(change.newValue) || isCompletionStatus(change.newValue))) {

        const activeTime = change.changedAt.getTime() - currentActiveStart.getTime();

        // CREDIT ACTIVE TIME TO CURRENT OWNER
        if (!developerMetrics[currentOwner]) {
          developerMetrics[currentOwner] = { activeTime: 0, leadTime: 0, completedCount: 0 };
        }
        developerMetrics[currentOwner].activeTime += activeTime;

        currentActiveStart = null;
      }

      // Track completion - credit to current owner
      if (change.fieldChanged === 'status' && isCompletionStatus(change.newValue)) {
        if (!developerMetrics[currentOwner]) {
          developerMetrics[currentOwner] = { activeTime: 0, leadTime: 0, completedCount: 0 };
        }
        developerMetrics[currentOwner].completedCount += 1;

        // Calculate lead time for this completion
        const leadTime = change.changedAt.getTime() - task.createdAt.getTime();
        developerMetrics[currentOwner].leadTime += leadTime;
      }
    }
  }

  // Now process metrics for the requested developer
  const devMetrics = developerMetrics[developerId] || { activeTime: 0, leadTime: 0, completedCount: 0 };

  const cycleEfficiency = devMetrics.leadTime > 0 ? (devMetrics.activeTime / devMetrics.leadTime) * 100 : 0;

  return {
    developerId,
    startDate,
    endDate,
    completedTaskCount: devMetrics.completedCount,
    totalLeadHours: +(devMetrics.leadTime / 3600000).toFixed(2),
    totalActiveHours: +(devMetrics.activeTime / 3600000).toFixed(2),
    cycleEfficiency: +cycleEfficiency.toFixed(2),
  };
}
export async function getDeliveryRateByDeveloper(developerId: string, startDate: Date, endDate: Date) {
  // Get ALL completion events in period (not filtered by owner)
  const completionEvents = await prisma.taskChangeHistory.findMany({
    where: {
      fieldChanged: 'status',
      newValue: { in: COMPLETION_STATUSES },
      changedAt: { gte: startDate, lte: endDate },
    },
    include: {
      task: {
        select: { id: true }
      }
    },
  });

  // Track completions per developer
  const developerCompletions: Record<string, Set<number>> = {};

  for (const completion of completionEvents) {
    // Get owner at time of completion
    const ownerAtCompletion = await getOwnerAtTime(completion.taskId, completion.changedAt);

    if (!developerCompletions[ownerAtCompletion]) {
      developerCompletions[ownerAtCompletion] = new Set();
    }

    // Credit completion to owner at that time
    developerCompletions[ownerAtCompletion].add(completion.taskId);
  }

  // Get completions for the requested developer
  const completedTasks = developerCompletions[developerId] || new Set();
  const completedCount = completedTasks.size;

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
  // Get ALL completion events in period
  const completionEvents = await prisma.taskChangeHistory.findMany({
    where: {
      fieldChanged: 'status',
      newValue: { in: COMPLETION_STATUSES },
      changedAt: { gte: startDate, lte: endDate },
    },
    select: { taskId: true, changedAt: true },
  });

  const developerCompletions: Record<string, Set<number>> = {};
  const developerReopened: Record<string, Set<number>> = {};

  for (const completion of completionEvents) {
    // Get owner at time of completion
    const completionOwner = await getOwnerAtTime(completion.taskId, completion.changedAt);

    if (!developerCompletions[completionOwner]) {
      developerCompletions[completionOwner] = new Set();
    }
    developerCompletions[completionOwner].add(completion.taskId);

    // Check if this task was later reopened
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
      // Get owner at time of reopening (who needs to fix it)
      const reopenOwner = await getOwnerAtTime(completion.taskId, laterReopening.changedAt);

      if (!developerReopened[reopenOwner]) {
        developerReopened[reopenOwner] = new Set();
      }
      developerReopened[reopenOwner].add(completion.taskId);
    }
  }

  // Get metrics for requested developer
  const completedTasks = developerCompletions[developerId] || new Set();
  const reopenedTasks = developerReopened[developerId] || new Set();

  const reworkRatio = completedTasks.size > 0 ? (reopenedTasks.size / completedTasks.size) * 100 : 0;

  return {
    developerId,
    totalCompleted: completedTasks.size,
    totalReopened: reopenedTasks.size,
    reworkRatio: +reworkRatio.toFixed(2),
  };
}
