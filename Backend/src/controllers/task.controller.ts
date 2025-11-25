import { Request, Response } from "express";
import prisma from "../prisma/client";
import { broadcastUpdate } from "../server";
import { Task } from "@prisma/client";
import { Prisma } from "@prisma/client";

// ✅ Get all tasks (optionally filter by project)
export const getTasks = async (req: Request, res: Response) => {
  try {
    const { project, owner, status, projectId, search } = req.query;
    const username = (req as any).user.username;

    // Normalize string query params
    const statusStr = typeof status === "string" ? status : undefined;
    const projectStr = typeof project === "string" ? project : undefined;
    const ownerStr = typeof owner === "string" ? owner : undefined;
    const searchStr = typeof search === "string" ? search.trim() : "";

    const isSearching = searchStr.length > 0;

    // Base filter → user should be owner or member
    const filters: Prisma.TaskWhereInput = {
      OR: [{ owner: username }, { members: { has: username } }],
    };

    // ============================
    // PROJECT ID FILTER
    // ============================
    if (
      projectId &&
      typeof projectId === "string" &&
      projectId !== "undefined" &&
      projectId !== "null" &&
      !isNaN(Number(projectId))
    ) {
      filters.projectId = Number(projectId);
    }

    // ============================
    // PROJECT FILTER
    // ============================
    if (projectStr && projectStr !== "all") {
      // If user selects a specific project, use it
      filters.project = projectStr;
    } else {
      // Initial load → exclude INTERNAL projects
      filters.project = { not: "INTERNAL" };
    }


    // ============================
    // OWNER FILTER
    // ============================
    if (ownerStr && ownerStr !== "all") {
      filters.owner = ownerStr;
    }

    // ============================
    // STATUS FILTER LOGIC
    // ============================

    if (!isSearching) {
      // 🔥 ONLY APPLY STATUS LOGIC WHEN NOT SEARCHING

      if (statusStr === "Completed" || statusStr === "Cancelled") {
        filters.status = statusStr;
      } else if (statusStr === "all" || statusStr === undefined) {
        filters.status = {
          notIn: ["Completed", "Cancelled"],
        };
      } else if (statusStr) {
        filters.status = statusStr;
      }
    }
    // else: searching → do NOT apply any status filter

    // ============================
    // SEARCH LOGIC
    // ============================
    if (isSearching) {
      filters.AND = [
        { 
          OR: [
            { title: { contains: searchStr, mode: "insensitive" } },
            { description: { contains: searchStr, mode: "insensitive" } },
            { status: { contains: searchStr, mode: "insensitive" } },
            { project: { contains: searchStr, mode: "insensitive" } },
          ],
        },
      ];
    }

    // ============================
    // FETCH TASKS
    // ============================
    const tasks = await prisma.task.findMany({
      where: filters,
      include: { projectRel: true },
      orderBy: [{ owner: "asc" }, { dueDate: "asc" }, { status: "asc" }],
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
      dependentTaskId, // <-- array of numbers
      initialMessage,  // optional first message
      currentUser,     // optional for broadcasting
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


      // 3️⃣ Insert initial message if it exists
      if (initialMessage && Array.isArray(initialMessage)) {
        await tx.message.create({
          data: {
            taskId: newTask.id,
            conversation: initialMessage,
          },
        });

        // Optional: broadcast to other users
        if (currentUser) {
          broadcastUpdate(initialMessage, newTask.id, currentUser);
        }
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
     // 1️⃣ Fetch the existing task
    const existingTask = await prisma.task.findUnique({
      where: { id: Number(id) },
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    // 2️⃣ Decide due date:
    // - If frontend sends valid date → use it
    // - If null → use createdAt
    const finalDueDate = dueDate
      ? new Date(dueDate)
      : existingTask.createdAt;  // 👈 use createdAt date

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        dueDate: finalDueDate,
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

    

    // Build match conditions (for WHERE)
    const matchConditions = words
      .map(
        (_, i) => `
          (POSITION(LOWER($${i + 1}) IN LOWER(t.title)) > 0 OR
           POSITION(LOWER($${i + 1}) IN LOWER(t.description)) > 0 OR
           POSITION(LOWER($${i + 1}) IN LOWER(CAST(m.conversation AS TEXT))) > 0)
        `
      )
      .join(" OR ");

    // ✅ Improved scoring: count occurrences (not just existence)
    const matchScore = words
      .map(
        (_, i) => `
          (
            (
              LENGTH(LOWER(t.title)) - LENGTH(REPLACE(LOWER(t.title), LOWER($${i + 1}), ''))
            ) / NULLIF(LENGTH(LOWER($${i + 1})), 0)
          ) +
          (
            (
              LENGTH(LOWER(t.description)) - LENGTH(REPLACE(LOWER(t.description), LOWER($${i + 1}), ''))
            ) / NULLIF(LENGTH(LOWER($${i + 1})), 0)
          ) +
          (
            (
              LENGTH(LOWER(CAST(m.conversation AS TEXT))) - LENGTH(REPLACE(LOWER(CAST(m.conversation AS TEXT)), LOWER($${i + 1}), ''))
            ) / NULLIF(LENGTH(LOWER($${i + 1})), 0)
          )
        `
      )
      .join(" + ");

    console.log("🧮 Generated SQL matchScore:\n", matchScore);

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

    tasks.forEach((t, index) => {
      console.log(`   ${index + 1}. Task ID: ${t.id}, Title: "${t.title}", match_score: ${t.match_score}`);
    });

    // ✅ Return all results (not just the ones with max score)
    const sortedTasks = tasks.sort((a, b) => b.match_score - a.match_score);

    console.log("✅ Returning sorted tasks count:", sortedTasks.length);

    return res.json({ count: sortedTasks.length, results: sortedTasks });
  } catch (error) {
    console.error("❌ Error searching tasks:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};





