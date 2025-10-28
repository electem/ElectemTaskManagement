import prisma from "../prisma/client";

export async function getCycleEfficiencyByDeveloperAndPeriod(
  developerId: string,
  startDate: Date,
  endDate: Date
) {
  // Fetch all tasks for the developer that had status changes in this period
  const tasks = await prisma.task.findMany({
    where: {
      owner: developerId,
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
          fieldChanged: 'status',
          changedAt: { gte: startDate, lte: endDate },
        },
        orderBy: { changedAt: 'asc' },
      },
    },
  });

  let totalLeadTime = 0;
  let totalActiveTime = 0;
  let completedTaskCount = 0;

  for (const task of tasks) {
    const changes = task.histories;
    if (!changes.length) continue;

    // Determine time periods spent "In Progress"
    let inProgressStart: Date | null = null;
    let activeTime = 0;

    for (const change of changes) {
      if (change.newValue === 'In Progress') {
        inProgressStart = change.changedAt;
      }
      if (change.oldValue === 'In Progress' && inProgressStart) {
        const end = change.changedAt;
        activeTime += end.getTime() - inProgressStart.getTime();
        inProgressStart = null;
      }
    }

    // Determine lead time (Created → Done)
    const doneEvent = changes.find(c => c.newValue === 'Completed');
    const completedAt = doneEvent?.changedAt || task.createdAt;

    // Only count if completion within range
    if (!completedAt || completedAt < startDate || completedAt > endDate) continue;

    const createdAt = task.createdAt < startDate ? startDate : task.createdAt;
    const leadTime = completedAt.getTime() - createdAt.getTime();

    if (leadTime <= 0) continue;

    totalLeadTime += leadTime;
    totalActiveTime += activeTime;
    completedTaskCount++;
  }

  const cycleEfficiency =
    totalLeadTime > 0 ? (totalActiveTime / totalLeadTime) * 100 : 0;

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
  // Find all tasks for this developer that were completed during period
  const completedChanges = await prisma.taskChangeHistory.findMany({
    where: {
      fieldChanged: 'status',
      newValue: 'Done',
      changedAt: { gte: startDate, lte: endDate },
      task: { owner: developerId },
    },
    select: { taskId: true },
  });

  const completedCount = new Set(completedChanges.map(c => c.taskId)).size;

  const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  const deliveryRatePerDay = completedCount / totalDays;

  return {
    developerId,
    completedCount,
    periodDays: +totalDays.toFixed(1),
    deliveryRatePerDay: +deliveryRatePerDay.toFixed(2),
  };
}


export async function getReworkRatioByDeveloper(developerId: string, startDate: Date, endDate: Date) {
  const changes = await prisma.taskChangeHistory.findMany({
    where: {
      fieldChanged: 'status',
      changedAt: { gte: startDate, lte: endDate },
      task: { owner: developerId },
    },
    select: { taskId: true, oldValue: true, newValue: true },
  });

  const reopened = new Set<number>();
  const completed = new Set<number>();

  for (const c of changes) {
    if (c.oldValue === 'Completed' && c.newValue === 'In Progress') reopened.add(c.taskId);
    if (c.newValue === 'Completed') completed.add(c.taskId);
  }

  const reworkRatio =
    completed.size > 0 ? (reopened.size / completed.size) * 100 : 0;

  return {
    developerId,
    totalCompleted: completed.size,
    totalReopened: reopened.size,
    reworkRatio: +reworkRatio.toFixed(2),
  };
}
