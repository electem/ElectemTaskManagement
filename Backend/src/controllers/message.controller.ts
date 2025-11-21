import { Request, Response } from "express";
import prisma from "../prisma/client";
import { broadcastUpdate } from "../server";

export const getMessages = async (req: Request, res: Response) => {
  try {
    const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;

    if (!taskId) return res.status(400).json({ error: "taskId is required" });

    const messages = await prisma.message.findUnique({
      where: { taskId },
    });

    res.json(messages ? messages.conversation : []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// get all the conversations for all the tasks
export const getMessagesBulk = async (req: Request, res: Response) => {
  try {
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: "taskIds (array) are required" });
    }

    const messages = await prisma.$queryRawUnsafe(`
      SELECT
        id,
        "taskId",
        -- take last 2 messages (if available)
        CASE
          WHEN jsonb_array_length(conversation) >= 2 THEN
            jsonb_build_array(
              conversation -> (jsonb_array_length(conversation) - 2),
              conversation -> (jsonb_array_length(conversation) - 1)
            )
          ELSE
            conversation
        END AS conversation,
        "createdAt",
        "updatedAt",
        "updatedAt" AS "lastMessageTime"
      FROM "Message"
      WHERE "taskId" = ANY($1)
      ORDER BY "lastMessageTime" DESC
    `, taskIds);

    res.json(messages);
  } catch (error) {
    console.error("Error fetching bulk messages:", error);
    res.status(500).json({ error: "Failed to fetch messages in bulk" });
  }
};




export const upsertMessage = async (req: Request, res: Response) => {
  try {
    const { taskId, newMessage, currentUser, } = req.body;

    if (!taskId || !newMessage) {
      return res.status(400).json({ error: "taskId and newMessage are required" });
    }
    // Upsert the message record
    const result = await prisma.message.upsert({
      where: { taskId },
      update: { conversation: newMessage },
      create: {
        taskId,
        conversation: newMessage,
      },
    });

    // Broadcast the updated conversation to all connected clients
    broadcastUpdate(newMessage, taskId, currentUser);

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upsert message" });
  }
};

export const appendMessages = async (req: Request, res: Response) => {
  try {
    const { taskId, currentUser, contents } = req.body;

    if (!taskId || !contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: "taskId and contents (array) are required" });
    }

    // Fetch existing conversation
    const existing = await prisma.message.findUnique({
      where: { taskId },
    });

    // Ensure existing conversation is an array
   const existingConversation: unknown[] = Array.isArray(existing?.conversation)
  ? (existing.conversation as unknown[])
  : [];


    // Append new contents
    const updatedConversation = [...existingConversation, ...contents];

    // Upsert conversation
    const result = await prisma.message.upsert({
      where: { taskId },
      update: { conversation: updatedConversation },
      create: {
        taskId,
        conversation: updatedConversation,
      },
    });

    // Broadcast the update
    broadcastUpdate(updatedConversation, taskId, currentUser);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to append messages" });
  }
};
