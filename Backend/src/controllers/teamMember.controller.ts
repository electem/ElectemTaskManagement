import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';

export const createTeamMember = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password } = req.body;

    const existingMember = await prisma.teamMember.findUnique({
      where: { email },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const teamMember = await prisma.teamMember.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(teamMember);
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(500).json({ error: 'Failed to create team member' });
  }
};

export const getAllTeamMembers = async (req: Request, res: Response) => {
  try {
    const teamMembers = await prisma.teamMember.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};

export const getTeamMemberById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    res.json(teamMember);
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({ error: 'Failed to fetch team member' });
  }
};

export const updateTeamMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password } = req.body;

    const updateData: any = { name, email, phone };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const teamMember = await prisma.teamMember.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(teamMember);
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.teamMember.delete({
      where: { id },
    });

    res.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
};
