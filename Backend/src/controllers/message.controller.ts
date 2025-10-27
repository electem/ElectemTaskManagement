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

export const upsertMessage = async (req: Request, res: Response) => {
  try {
    const { taskId, newMessage, currentUser, isEdit } = req.body;

    if (!taskId || !newMessage) {
      return res.status(400).json({ error: "taskId and newMessage are required" });
    }

    // Find existing conversation
    const existing = await prisma.message.findUnique({
      where: { taskId },
    });


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