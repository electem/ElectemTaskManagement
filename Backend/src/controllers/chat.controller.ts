import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../lib/prisma';

export const createMessage = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, senderId, message } = req.body;

    const chatMessage = await prisma.chatMessage.create({
      data: {
        taskId,
        senderId,
        message,
      },
    });

    res.status(201).json(chatMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
};

export const getMessagesByTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const messages = await prisma.chatMessage.findMany({
      where: { taskId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
