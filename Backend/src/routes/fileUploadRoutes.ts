import express from "express";
import { getAllFilesWithTaskTitle } from "../controllers/fileListController";

const router = express.Router();

router.get("/file-list", getAllFilesWithTaskTitle);

export default router;
