import { Request, Response } from "express";
import prisma from "../prisma/client";

// ✅ Get all tasks (optionally filter by project)
export const getTasks = async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;

    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : {},
      include: { projectRel: true },
    });

    res.json(tasks);
  } catch (error) {
    console.error(error);
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

    const task = await prisma.task.create({
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
        // ✅ ensure dependentTaskId is always an Int[]
        dependentTaskId: Array.isArray(dependentTaskId)
          ? dependentTaskId.map((id) => Number(id))
          : [],
      },
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

    const lowerQ = query.toLowerCase();

    // ✅ Step 1: Fetch all tasks with messages
    const tasks = await prisma.task.findMany({
      include: { messages: true },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Step 2: Filter manually (title, description, messages)
    const matchedTasks = tasks.filter((task) => {
      // Check title and description
      if (task.title?.toLowerCase().includes(lowerQ)) return true;
      if (task.description?.toLowerCase().includes(lowerQ)) return true;

      // Check inside JSON conversation content
      return task.messages?.some((msg) => {
        try {
          // conversation could be JSON or string
          const convo = typeof msg.conversation === "string"
            ? msg.conversation
            : JSON.stringify(msg.conversation);

          return convo.toLowerCase().includes(lowerQ);
        } catch {
          return false;
        }
      });
    });

    // ✅ Step 3: Add snippet from messages
    const results = matchedTasks.map((task) => {
      let snippet: string | null = null;

      if (task.messages?.length) {
        for (const msg of task.messages) {
          try {
            const convo = typeof msg.conversation === "string"
              ? msg.conversation
              : JSON.stringify(msg.conversation);

            const idx = convo.toLowerCase().indexOf(lowerQ);
            if (idx !== -1) {
              snippet = convo.substring(Math.max(0, idx - 30), idx + query.length + 30);
              snippet = snippet.replace(/[\[\]\{\}"]/g, ""); // clean snippet
              break;
            }
          } catch {
            continue;
          }
        }
      }

      return { ...task, snippet };
    });

    res.json({ count: results.length, results });
  } catch (error) {
    console.error("Error searching tasks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

