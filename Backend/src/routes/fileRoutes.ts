import express from "express";
import { uploadFile, getFile, getFilesByTask, deleteFile, upload } from "../controllers/file.controller";

const router = express.Router();

// File upload route
router.post("/", upload.single("file"), uploadFile);

// File retrieval routes
router.get("/uploads/:filename", getFile);
router.get("/files/task/:taskId", getFilesByTask);
router.delete("/files/:fileId", deleteFile);

export default router;