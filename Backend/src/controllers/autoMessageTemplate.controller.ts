import { Request, Response } from "express";
import prisma from "../prisma/client";

/**
 * 🟢 Get all message templates by type
 * Example: GET /auto-message-template/type/email
 */
export const getTemplatesByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({ error: "Missing 'type' parameter" });
    }

    const templates = await prisma.autoMessageTemplate.findMany({
      where: { type },
    });

    if (!templates.length) {
      return res.status(404).json({ message: `No templates found for type '${type}'` });
    }

    return res.status(200).json(templates);
  } catch (error) {
    console.error("❌ Error fetching templates by type:", error);
    return res.status(500).json({ error: "Failed to fetch templates by type" });
  }
};

/**
 * 🟣 Get message template by from, to, and type
 * Example: GET /auto-message-template/search?from=system&to=user&type=email
 */
export const getTemplateByFromToType = async (req: Request, res: Response) => {
  try {
    const { from, to, type } = req.query;

    if (!from || !to || !type) {
      return res.status(400).json({ error: "Missing 'from', 'to', or 'type' query parameters" });
    }

    const template = await prisma.autoMessageTemplate.findFirst({
      where: {
        from: String(from),
        to: String(to),
        type: String(type),
      },
    });

    if (!template) {
      return res.status(404).json({ message: "No matching template found" });
    }

    return res.status(200).json(template);
  } catch (error) {
    console.error("❌ Error fetching template by from/to/type:", error);
    return res.status(500).json({ error: "Failed to fetch template" });
  }
};

// GET /auto-message-template/bulk
export const getTemplatesBulk = async (req: Request, res: Response) => {
  try {
    const { changes } = req.body; // [{type, from, to}, ...]

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: "Invalid or empty changes array" });
    }

    // Build OR conditions dynamically
    const templates = await prisma.autoMessageTemplate.findMany({
      where: {
        OR: changes.map((c) => ({
          type: c.type,
          from: c.from,
          to: c.to,
        })),
      },
    });

    return res.status(200).json(templates);
  } catch (error) {
    console.error("❌ Error fetching bulk templates:", error);
    return res.status(500).json({ error: "Failed to fetch bulk templates" });
  }
};

