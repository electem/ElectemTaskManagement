// src/routes/userRoutes.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();
const prisma = new PrismaClient();

// GET all users
router.get("/users" , async (req, res) => {
  try {
    const users = await prisma.user.findMany(); // fetch all columns
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default router;
