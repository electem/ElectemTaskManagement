import { Request, Response } from "express";
import prisma from "../prisma/client";
import crypto from "crypto";

export const createTaskChangeHistory = async (req: Request, res: Response) => {
    try {
      const { taskId, changes, changedAt } = req.body;

      if (!taskId || !Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({ error: "Invalid request data. Expected { taskId, changes[] }" });
      }

      const changeGroupId = crypto.randomUUID();
      const timestamp = changedAt ? new Date(changedAt) : new Date(); // ⏰ capture full date + time

      const insertData = changes.map((c) => ({
        taskId: Number(taskId),
        fieldChanged: c.fieldChanged,
        oldValue: c.oldValue ?? null,
        newValue: c.newValue ?? null,
        changeGroupId,
        changedAt: timestamp, // 🕒 save exact time
      }));

      const createdRecords = await prisma.$transaction(
        insertData.map((data) => prisma.taskChangeHistory.create({ data }))
      );

      return res.status(201).json(createdRecords);
    } catch (error) {
      console.error("❌ Error creating task change history:", error);
      return res.status(500).json({ error: "Failed to create task change history" });
    }
  };

// 🟣 GET: Fetch change history for a specific task
export const getTaskChangeHistory = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    if (!taskId || isNaN(Number(taskId))) {
      return res.status(400).json({ error: "Invalid or missing taskId" });
    }

    // Fetch and sort by most recent first
    const history = await prisma.taskChangeHistory.findMany({
      where: { taskId: Number(taskId) },
      orderBy: { changedAt: "desc" },
    });

    if (history.length === 0) {
      return res.status(404).json({ message: "No change history found for this task" });
    }

    // Group by changeGroupId
    const groupedHistory = Object.values(
      history.reduce((acc: Record<string, any>, record) => {
        if (!acc[record.changeGroupId]) {
          acc[record.changeGroupId] = {
            changeGroupId: record.changeGroupId,
            changedAt: record.changedAt,
            changes: [],
          };
        }

        acc[record.changeGroupId].changes.push({
          fieldChanged: record.fieldChanged,
          oldValue: record.oldValue,
          newValue: record.newValue,
        });

        return acc;
      }, {})
    );

    return res.status(200).json({
      taskId: Number(taskId),
      totalGroups: groupedHistory.length,
      history: groupedHistory,
    });
  } catch (error) {
    console.error("❌ Error fetching task change history:", error);
    return res.status(500).json({ error: "Failed to fetch task change history" });
  }
};

// controllers/taskHistory.controller.ts

export const getLatestByField = async (req: Request, res: Response) => {
  try {
    const { taskId, fieldChanged } = req.params;

    if (!taskId || isNaN(Number(taskId)) || !fieldChanged) {
      return res.status(400).json({ error: "Invalid taskId or missing fieldChanged" });
    }

    // Fetch latest record for that taskId and fieldChanged
    const latestRecord = await prisma.taskChangeHistory.findFirst({
      where: { taskId: Number(taskId), fieldChanged },
      orderBy: { changedAt: "desc" },
    });

    if (!latestRecord) {
      return res.status(200).json({ oldValue: null, newValue: null });
    }

    return res.status(200).json({
      oldValue: latestRecord.oldValue || null,
      newValue: latestRecord.newValue || null,
    });
  } catch (error) {
    console.error("❌ Error fetching latest record by field:", error);
    return res.status(500).json({ error: "Failed to fetch latest record" });
  }
};

