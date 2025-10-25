import { Router } from "express";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/project.controller";
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authGuard ,getProjects);
router.post("/",authGuard , createProject);
router.put("/:id",authGuard , updateProject);
router.delete("/:id",authGuard , deleteProject);

export default router;