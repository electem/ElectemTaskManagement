import express from "express";
import { getFile, getFilesByTask, deleteFile, upload, uploadFiles } from "../controllers/file.controller";
import { authGuard } from "../middlewares/auth.middleware";


const router = express.Router();

// File upload route
router.post("/", upload.array("file", 10), uploadFiles); 

// File retrieval routes
router.get("/uploads/:filename",authGuard , getFile);
router.get("/files/task/:taskId",authGuard , getFilesByTask);
router.delete("/files/:fileId",authGuard , deleteFile);

export default router;