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

// Utility function to convert BigInts to Number/String for JSON serialization
const safeJsonSerialize = (data: any) => {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (typeof value === 'bigint') {
        return Number(value);
      }
      return value;
    })
  );
};


// ✅ Search tasks by title, description, or message conversation
export const searchTasks = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string)?.trim();
    if (!query) {
      return res.status(400).json({ error: "Missing search query parameter 'q'." });
    }

    // Split into words, filter out empty strings
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const params = words;

    // The boundary for the end of the word is now:
    // s? followed by a character class [\\s\\.,!?:;] (whitespace OR common punctuation) OR end of string ($)
    const END_BOUNDARY = 's?([\\s\\.,!?:;]|$)';

    // ------------------------------------------------------
    // 1️⃣ ROBUST WHOLE WORD MATCH CONDITIONS (with punctuation support)
    // ------------------------------------------------------
    const matchConditions = words
      .map(
        (_, i) => `
        (
          LOWER(t.title) ~ ('(^|\\s)' || LOWER($${i + 1}) || '${END_BOUNDARY}') OR
          LOWER(t.description) ~ ('(^|\\s)' || LOWER($${i + 1}) || '${END_BOUNDARY}') OR
          LOWER(CAST(m.conversation AS TEXT)) ~ ('(^|\\s)' || LOWER($${i + 1}) || '${END_BOUNDARY}')
        )
      `
      )
      .join(" OR ");

    console.log("Generated SQL Match Conditions:\n", matchConditions);

    // ------------------------------------------------------
    // 2️⃣ EXACT WORD MATCH COUNT (score) (with punctuation support)
    // ------------------------------------------------------
    const matchScore = words
      .map(
        (_, i) => `
          (
            SELECT
              COUNT(*)
            FROM regexp_matches(LOWER(t.title), '(^|\\s)' || LOWER($${i + 1}) || '${END_BOUNDARY}', 'g')
          ) +
          (
            SELECT
              COUNT(*)
            FROM regexp_matches(LOWER(t.description), '(^|\\s)' || LOWER($${i + 1}) || '${END_BOUNDARY}', 'g')
          ) +
          (
            SELECT
              COUNT(*)
            FROM regexp_matches(LOWER(CAST(m.conversation AS TEXT)), '(^|\\s)' || LOWER($${i + 1}) || '${END_BOUNDARY}', 'g')
          )
        `
      )
      .join(" + ");

    console.log("Generated robust word-match SQL scoring:\n", matchScore);
    console.log("SQL Parameters (words):\n", params);

    // ------------------------------------------------------
    // 3️⃣ Execute Query
    // ------------------------------------------------------
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

    // Log results
    tasks.forEach((t, i) => {
      console.log(`Result ${i + 1}: ID=${t.id}, Score=${t.match_score}, Title=${t.title}`);
    });

    const responsePayload = safeJsonSerialize(tasks);
    console.log(`Serialization Check: Successfully serialized ${responsePayload.length} results.`);

    return res.json({ count: responsePayload.length, results: responsePayload });
  } catch (error) {
    console.error("❌ Error searching tasks:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};






