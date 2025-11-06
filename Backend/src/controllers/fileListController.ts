import { Request, Response } from "express";
import prisma from "../prisma/client";

// ✅ Fetch all files with pagination
export const getAllFilesWithTaskTitle = async (req: Request, res: Response) => {
  try {
    // 1️⃣ Parse query params (page & limit)
    const page = parseInt(req.query.page as string) || 1; // default 1
    const limit = parseInt(req.query.limit as string) || 20; // default 20
    const skip = (page - 1) * limit;

    // 2️⃣ Fetch files with pagination
    const [files, totalCount] = await Promise.all([
      prisma.uploadedFile.findMany({
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { uploadDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.uploadedFile.count(), // total count for pagination
    ]);

    // 3️⃣ Add URLs
    const filesWithUrls = files.map((file) => ({
      id: file.id,
      taskId: file.task?.id || null,
      title: file.task?.title || "No Task",
      fileUrl: `https://iot.electems.com/task/api/uploads/${file.fileName}`,
      fileName: file.originalName,
      uploadDate: file.uploadDate,
    }));

    // 4️⃣ Send paginated response
    res.json({
      data: filesWithUrls,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching files with task titles:", error);
    res.status(500).json({ error: "Failed to fetch file list" });
  }
};
