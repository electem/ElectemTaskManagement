import { Router } from "express";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
} from "../controllers/task.controller";

const router = Router();

router.get("/", getTasks);
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);
router.patch("/:id/status", updateTaskStatus);

export default router;
