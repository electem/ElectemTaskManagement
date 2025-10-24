import { Router } from "express";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
} from "../controllers/task.controller";
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();

router.get("/",authGuard , getTasks);
router.post("/",authGuard , createTask);
router.put("/:id",authGuard , updateTask);
router.delete("/:id",authGuard , deleteTask);
router.patch("/:id/status",authGuard , updateTaskStatus);

export default router;
