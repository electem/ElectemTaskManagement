  // controllers/notesController.ts
  import { Request, Response } from "express";
  import prisma from "../prisma/client";

  // controllers/notesController.ts

export const addNote = async (req: Request, res: Response) => {
  try {
    const { taskId, message } = req.body;

    if (!taskId || !message) {
      return res.status(400).json({ error: "taskId and message are required" });
    }

    const noteObject = message;

    const result = await prisma.$transaction(async (tx) => {
      let notesRow = await tx.notes.findUnique({ where: { taskId } });

      if (!notesRow) {
        notesRow = await tx.notes.create({
          data: {
            taskId,
            notes: [noteObject],
          },
        });
        return { created: true, notes: notesRow.notes as { content: string }[] };
      }

      const existingNotes: { content: string }[] = Array.isArray(notesRow.notes)
        ? (notesRow.notes as { content: string }[])
        : [];

      const validNotes = existingNotes.filter(
        (n): n is { content: string } => n && typeof n.content === "string"
      );

      const isDuplicate = validNotes.some(
        (n) => n.content.trim().toLowerCase() === noteObject.content.trim().toLowerCase()
      );

      if (isDuplicate) return { created: false, notes: validNotes };

      const updated = await tx.notes.update({
        where: { taskId },
        data: { notes: [...validNotes, noteObject] },
      });

      return { created: true, notes: updated.notes as { content: string }[] };
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("addNote error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

 export const getNotes = async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) return res.status(400).json({ error: "Invalid projectId" });

    // Get all tasks for project
    const tasks = await prisma.task.findMany({ where: { projectId } });
    const taskIds = tasks.map(t => t.id);

    // Fetch notes for all tasks
    const notesRows = await prisma.notes.findMany({
      where: { taskId: { in: taskIds } },
    });

    const notes = notesRows.map(row => row.notes).flat();

    return res.json({ found: true, notes });
  } catch (err) {
    console.error("getNotes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

