import express from 'express';
import { body } from 'express-validator';
import * as teamMemberController from '../controllers/teamMember.controller';

const router = express.Router();

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  teamMemberController.createTeamMember
);

router.get('/', teamMemberController.getAllTeamMembers);
router.get('/:id', teamMemberController.getTeamMemberById);
router.put('/:id', teamMemberController.updateTeamMember);
router.delete('/:id', teamMemberController.deleteTeamMember);

export default router;
