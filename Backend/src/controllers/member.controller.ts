import { Request, Response } from "express";
import prisma from "../prisma/client"; 

// Create new team member
export const createMember = async (req: Request, res: Response) => {
  try {
    const { username, email, role } = req.body;

    if (!username || !email || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const member = await prisma.user.create({
      data: {
        username,
        email,
        role,
        // createdAt will automatically be set by Prisma
      },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create team member" });
  }
};
