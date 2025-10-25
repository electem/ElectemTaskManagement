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
    const { taskId, newMessage, isEdit } = req.body;

    if (!taskId || !newMessage) {
      return res.status(400).json({ error: "taskId and newMessage are required" });
    }

    // Find existing conversation
    const existing = await prisma.message.findUnique({
      where: { taskId },
    });

    // Prepare updated conversation
    let updatedConversation: any[] = [];

    if (existing && Array.isArray(existing.conversation)) {
      if (isEdit) {
        // For editing, we expect the full updated threads array
        updatedConversation = newMessage;
      } else {
        // For new messages, we expect a single message object to add
        updatedConversation = [...existing.conversation, newMessage];
      }
    } else {
      // If no existing conversation, start with the new message
      updatedConversation = [newMessage];
    }

    // Upsert the message record
    const result = await prisma.message.upsert({
      where: { taskId },
      update: { conversation: updatedConversation },
      create: {
        taskId,
        conversation: updatedConversation,
      },
    });

    // Broadcast the updated conversation to all connected clients
    broadcastUpdate(updatedConversation, taskId);
    
    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upsert message" });
  }
};