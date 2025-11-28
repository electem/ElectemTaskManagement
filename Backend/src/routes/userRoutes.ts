// src/routes/userRoutes.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { onlineUsers } from "../server";

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
// ✅ Get users + online status
router.get("/online-status", async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true }
  });

  const result = users.map(u => ({
    id: u.id,
    username: u.username,
    online: onlineUsers.get(u.username) === true

  }));

  res.json(result);
});

export default router;
