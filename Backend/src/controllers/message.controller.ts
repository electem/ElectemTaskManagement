import { Request, Response } from "express";
import prisma from "../prisma/client";

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
      let updatedConversation: typeof newMessage[] = [];
  
      if (existing && Array.isArray(existing.conversation)) {
        if (isEdit) {
          // Replace the message with the same ID safely
          updatedConversation = existing.conversation
            .filter((m): m is typeof newMessage => m !== null)
            .map((m) => (m.id === newMessage.id ? newMessage : m));
        } else {
          updatedConversation = [...existing.conversation, newMessage];
        }
      } else {
        updatedConversation = [newMessage];
      }
      
  
      // Upsert the message record
      const result = await prisma.message.upsert({
        where: { taskId },
        update: { conversation: updatedConversation },
        create: {
          taskId,
          conversationId: BigInt(newMessage.id), // initial message ID
          conversation: updatedConversation,
        },
      });
  
      // Convert BigInt to string for safe JSON response
      const safeResult = {
        ...result,
        conversationId: result.conversationId.toString(),
      };
  
      res.json(safeResult);
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to upsert message" });
    }
  };
  
