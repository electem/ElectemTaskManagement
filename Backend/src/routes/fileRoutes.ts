import express from "express";
import { uploadFile, getFile, getFilesByTask, deleteFile, upload } from "../controllers/file.controller";
import { authGuard } from "../middlewares/auth.middleware";


const router = express.Router();

// File upload route
router.post("/",authGuard , upload.single("file"), uploadFile);

// File retrieval routes
router.get("/uploads/:filename",authGuard , getFile);
router.get("/files/task/:taskId",authGuard , getFilesByTask);
router.delete("/files/:fileId",authGuard , deleteFile);

export default router;