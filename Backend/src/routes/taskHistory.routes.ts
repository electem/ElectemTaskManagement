import { Router } from "express";
import {
  createTaskChangeHistory,
  getLatestByField,
  getTaskChangeHistory,
} from "../controllers/taskHistory.controller";
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();

// POST /task-history
router.post("/", authGuard, createTaskChangeHistory);

// GET /task-history/:taskId
router.get("/:taskId", authGuard, getTaskChangeHistory);
router.get("/latest/:taskId/:fieldChanged", authGuard, getLatestByField);

export default router;
