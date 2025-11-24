import { Request, Response } from "express";
import prisma from "../prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + fileExtension);
  },
});

// File filter to block harmful files only
const fileFilter = (req, file, cb) => {
  const blockedTypes = [
    "application/x-msdownload",                 // .exe
    "application/x-ms-installer",               // .msi
    "application/vnd.microsoft.portable-executable",
    "application/x-sh",                         // .sh
    "application/x-bat",                        // .bat
    "application/x-cmd",                        // .cmd
    "application/vnd.android.package-archive",  // .apk
    "application/x-dosexec",                    // .dll
  ];

  if (blockedTypes.includes(file.mimetype)) {
    cb(new Error("This file type is not allowed for security reasons"), false);
  } else {
    cb(null, true); // Allow all other types
  }
};


export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const { taskId, messageId } = req.body;
    const uploadedFiles = [];

    for (const file of files) {
      const fileRecord = await prisma.uploadedFile.create({
        data: {
          originalName: file.originalname,
          fileName: file.filename,
          filePath: file.path,
          mimeType: file.mimetype,
          size: file.size,
          taskId: taskId ? Number(taskId) : null,
          messageId: messageId || null,
          uploadDate: new Date(),
        },
      });

      uploadedFiles.push({
        id: fileRecord.id,
        originalName: file.originalname,
        url: `https://iot.electems.com/task/api/uploads/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
      });
    }

    res.json({ success: true, files: uploadedFiles });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "Failed to upload files" });
  }
};


export const getFile = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    const fileRecord = await prisma.uploadedFile.findFirst({
      where: { fileName: filename },
    });

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = path.join(__dirname, "..", fileRecord.filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found on server" });
    }

    // Set appropriate headers
    res.setHeader("Content-Type", fileRecord.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileRecord.originalName}"`);

    // Send file
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error("File retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve file" });
  }
};

export const getFilesByTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
    }

    const files = await prisma.uploadedFile.findMany({
      where: { taskId: Number(taskId) },
      orderBy: { uploadDate: "desc" },
    });

    // Add full URLs to each file
    const filesWithUrls = files.map(file => ({
      ...file,
      url: `https://iot.electems.com/task/api/uploads/${file.fileName}`
    }));

    res.json(filesWithUrls);

  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const fileRecord = await prisma.uploadedFile.findUnique({
      where: { id: Number(fileId) },
    });

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete physical file
    const filePath = path.join(__dirname, "..", fileRecord.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await prisma.uploadedFile.delete({
      where: { id: Number(fileId) },
    });

    res.json({ success: true, message: "File deleted successfully" });

  } catch (error) {
    console.error("File deletion error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};