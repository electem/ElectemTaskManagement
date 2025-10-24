import express from 'express';
import { body } from 'express-validator';
import * as chatController from '../controllers/chat.controller';

const router = express.Router();

router.post(
  '/',
  [
    body('taskId').trim().notEmpty().withMessage('Task ID is required'),
    body('senderId').trim().notEmpty().withMessage('Sender ID is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  chatController.createMessage
);

router.get('/task/:taskId', chatController.getMessagesByTask);

export default router;
