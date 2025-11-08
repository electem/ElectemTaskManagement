import { Request, Response } from "express";
import prisma from "../prisma/client";
import { Task } from "@prisma/client";

// ✅ Get all tasks (optionally filter by project)
export const getTasks = async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : {},
      include: { projectRel: true },
      orderBy: [
        { owner: "asc" },       // 1️⃣ Owner alphabetically A–Z
        { dueDate: "asc" },     // 2️⃣ Older dueDate first
        { status: "asc" },      // 3️⃣ Just normal alphabetical order (optional)
      ],
    });

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};




// ✅ Create a task
export const createTask = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      dueDate,
      status,
      projectId,
      project,
      owner,
      members,
      url,
      dependentTaskId, // <-- should be an array of numbers
    } = req.body;

    // ✅ Wrap in a transaction
    const task = await prisma.$transaction(async (tx) => {
      // 1️⃣ Create the new task
      const newTask = await tx.task.create({
        data: {
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : null,
          status,
          projectId,
          project,
          owner,
          members,
          url,
          dependentTaskId: Array.isArray(dependentTaskId)
            ? dependentTaskId.map((id) => Number(id))
            : [],
        },
      });

      // 2️⃣ Ensure Notes entry exists for this project
      const existingNotes = await tx.notes.findUnique({
        where: { projectId },
      });

      if (!existingNotes) {
        await tx.notes.create({
          data: {
            projectId,
            notes: [], // default empty array
          },
        });
      }

      return newTask;
    });

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create task" });
  }
};


// ✅ Update a task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      dueDate,
      status,
      projectId,
      project,
      owner,
      members,
      url,
      dependentTaskId, // <-- array of numbers 
    } = req.body;

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        projectId,
        project,
        owner,
        members,
        url,
        dependentTaskId: Array.isArray(dependentTaskId)
          ? dependentTaskId.map((id) => Number(id))
          : [],
      },
    });

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

// ✅ Delete a task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

// ✅ Update only task status
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

// ✅ Search tasks by title, description, or message conversation
export const searchTasks = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string)?.trim();
    if (!query) {
      return res.status(400).json({ error: "Missing search query parameter 'q'." });
    }

    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const params = words;

    // For each word, check if it appears in title, description, or conversation
    const matchConditions = words
      .map(
        (_, i) => `
          (POSITION(LOWER($${i + 1}) IN LOWER(t.title)) > 0 OR
           POSITION(LOWER($${i + 1}) IN LOWER(t.description)) > 0 OR
           POSITION(LOWER($${i + 1}) IN LOWER(CAST(m.conversation AS TEXT))) > 0)
        `
      )
      .join(" OR ");

    // Each word contributes 1 point if it appears anywhere (title, desc, or chat)
    const matchScore = words
      .map(
        (_, i) => `
          CASE WHEN (
            POSITION(LOWER($${i + 1}) IN LOWER(t.title)) > 0 OR
            POSITION(LOWER($${i + 1}) IN LOWER(t.description)) > 0 OR
            POSITION(LOWER($${i + 1}) IN LOWER(CAST(m.conversation AS TEXT))) > 0
          ) THEN 1 ELSE 0 END
        `
      )
      .join(" + ");

    const tasks = await prisma.$queryRawUnsafe<
      (Task & { match_score: number })[]
    >(
      `
      SELECT DISTINCT t.*, (${matchScore}) AS match_score
      FROM "Task" t
      LEFT JOIN "Message" m ON m."taskId" = t.id
      WHERE ${matchConditions}
      ORDER BY match_score DESC, t."createdAt" DESC;
    `,
      ...params
    );

    // Now get all tasks with max matched word count
    let filteredTasks = tasks;
    if (tasks.length > 0) {
      const maxScore = Math.max(...tasks.map(t => Math.round(t.match_score)));
      filteredTasks = tasks.filter(t => Math.round(t.match_score) === maxScore);
    }

    return res.json({ count: filteredTasks.length, results: filteredTasks });
  } catch (error) {
    console.error("Error searching tasks:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};





