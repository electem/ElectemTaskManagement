// controllers/notesController.ts
import { Request, Response } from "express";
import prisma from "../prisma/client";

export const addNote = async (req: Request, res: Response) => {
  try {
    const { projectId, message } = req.body;

    if (!projectId || !message) {
      return res.status(400).json({ error: "projectId and message are required" });
    }

    const noteObject = { content: String(message) };

    const result = await prisma.$transaction(async (tx) => {
      // Find existing notes row
      let notesRow = await tx.notes.findUnique({ where: { projectId } });

      if (!notesRow) {
        // First note for this project
        notesRow = await tx.notes.create({
          data: {
            projectId,
            notes: [noteObject],
          },
        });
        return { created: true, notes: notesRow.notes as { content: string }[] };
      }

      // Cast JSON array to proper type
      const existingNotes: { content: string }[] = Array.isArray(notesRow.notes)
        ? (notesRow.notes as { content: string }[])
        : [];

      // Filter out invalid entries just in case
      const validNotes = existingNotes.filter(
        (n): n is { content: string } => n && typeof n.content === "string"
      );

      // Duplicate check
      const isDuplicate = validNotes.some(
        (n) => n.content.trim().toLowerCase() === noteObject.content.trim().toLowerCase()
      );

      if (isDuplicate) {
        return { created: false, notes: validNotes };
      }

      // Append new note
      const updated = await tx.notes.update({
        where: { projectId },
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

    const notesRow = await prisma.notes.findUnique({ where: { projectId } });
    if (!notesRow) return res.json({ found: false, notes: [] });

    // Cast to proper type
    const notes: { content: string }[] = Array.isArray(notesRow.notes)
      ? (notesRow.notes as { content: string }[])
      : [];

    return res.json({ found: true, notes });
  } catch (err) {
    console.error("getNotes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
