import { Router } from "express";
import { appendMessages, getMessages, upsertMessage } from "../controllers/message.controller";
import { authGuard } from "../middlewares/auth.middleware";
import { broadcastUpdate } from "../server";
const router = Router();

router.get("/",authGuard , getMessages);
router.post("/upsert",authGuard , upsertMessage);
router.post("/append", authGuard, appendMessages);
export default router;
