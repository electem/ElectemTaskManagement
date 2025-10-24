import { Request, Response } from "express";
import prisma from "../prisma/client";

// Get tasks (optional project filter)
export const getTasks = async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : {},
      include: { projectRel: true }, // use the correct relation field name
    });

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};
// Create task
export const createTask = async (req: Request, res: Response) => {
  try {
    const { title, description, dueDate, status, projectId,project,owner, members } = req.body;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        projectId,
        owner,
        project, // ✅ include this
        members,
      },
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status, projectId, members } = req.body;
    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        projectId,
        members,
      },
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ message: "Task deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

// Update task status
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: { status },
    });
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task status" });
  }
};
