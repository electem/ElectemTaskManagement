import { Router } from "express";
import {
  getTemplatesByType,
  getTemplateByFromToType,
  getTemplatesBulk,
} from "../controllers/autoMessageTemplate.controller";
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();

// GET /auto-message-template/type/:type → fetch all by type
router.get("/type/:type", authGuard, getTemplatesByType);

// GET /auto-message-template/search?from=&to=&type= → fetch one by from/to/type
router.get("/search", authGuard, getTemplateByFromToType);

router.post("/bulk", authGuard, getTemplatesBulk);

export default router;
