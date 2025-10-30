import { Request, Response } from "express";
import prisma from "../prisma/client";
import crypto from "crypto";
import { broadcastUpdate } from "../server";

export const createTaskChangeHistory = async (req: Request, res: Response) => {
  try {
    const { taskId, changes, changedAt, currentUser } = req.body;

    if (!taskId || !Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: "Invalid request data. Expected { taskId, changes[] }" });
    }

    const changeGroupId = crypto.randomUUID();
    const timestamp = changedAt ? new Date(changedAt) : new Date();

    // Step 1: Insert change history
    const insertData = changes.map((c) => ({
      taskId: Number(taskId),
      fieldChanged: c.fieldChanged,
      oldValue: c.oldValue ?? null,
      newValue: c.newValue ?? null,
      changeGroupId,
      changedAt: timestamp,
    }));

    const createdRecords = await prisma.$transaction(
      insertData.map((data) => prisma.taskChangeHistory.create({ data }))
    );

    // Step 2: Fetch templates in bulk
    const payload = changes.map((c) => ({
      type: c.fieldChanged,
      from: c.fieldChanged === "owner" ? null : c.oldValue,
      to: c.fieldChanged === "owner" ? null : c.newValue,
    }));

    const templates = await prisma.autoMessageTemplate.findMany({
      where: {
        OR: payload.map((p) => ({
          type: p.type,
          from: p.from,
          to: p.to,
        })),
      },
    });

    if (templates.length === 0) {
      console.log("ℹ️ No templates found for changes.");
      return res.status(201).json({ createdRecords });
    }

    // Step 3: Build messages
    const username = currentUser || "System";
    const currentTime = new Date();
    const formattedTime = `${currentTime.getDate()}/${
      currentTime.getMonth() + 1
    } ${currentTime.getHours()}:${currentTime.getMinutes()}`;

    let contentsToAppend: any[] = [];

    for (const change of changes) {
      const template = templates.find((t) => t.type === change.fieldChanged);
      if (!template) continue;

      let messages = JSON.parse(template.content);
      let replacingOldValue = `@${username}`;
      let replacingNewValue = `@${username}`;

        // Get latest owner from DB
        const ownerChange = await prisma.taskChangeHistory.findFirst({
          where: { taskId: Number(taskId), fieldChanged: "owner" },
          orderBy: { changedAt: "desc" },
        });
        console.log("======================");
        console.log(ownerChange);
        if (ownerChange) {
          replacingOldValue = `@${ownerChange.oldValue || username}`;
          replacingNewValue = `@${ownerChange.newValue || username}`;
        }


      for (const msg of messages) {
        let updatedContent = msg.content;

        if (replacingOldValue === replacingNewValue) {
          updatedContent = updatedContent.replace(/@oldowner/g, replacingOldValue);
          updatedContent = updatedContent.replace(/@newowner/g, "");
        } else {
          updatedContent = updatedContent
            .replace(/@oldowner/g, replacingOldValue)
            .replace(/@newowner/g, replacingNewValue);
        }

        contentsToAppend.push({
          ...msg,
          content: `Vin(${formattedTime}): ${updatedContent}`,
        });
      }
    }
    let updatedConversation;
    // Step 4: Append messages to DB
    if (contentsToAppend.length > 0) {
      const existing = await prisma.message.findUnique({
        where: { taskId: Number(taskId) },
      });

      const existingConversation = Array.isArray(existing?.conversation)
        ? existing.conversation
        : [];

      updatedConversation = [...existingConversation, ...contentsToAppend];

      await prisma.message.upsert({
        where: { taskId: Number(taskId) },
        update: { conversation: updatedConversation },
        create: {
          taskId: Number(taskId),
          conversation: updatedConversation,
        },
      });

      // Broadcast message update
      broadcastUpdate(updatedConversation, taskId, currentUser);
    }

    return res.status(201).json({ createdRecords, messagesAppended: contentsToAppend.length,updatedConversation, });
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

