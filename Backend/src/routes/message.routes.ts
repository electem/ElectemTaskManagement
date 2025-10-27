import { Router } from "express";
import { getMessages, upsertMessage } from "../controllers/message.controller";
import { authGuard } from "../middlewares/auth.middleware";
import { broadcastUpdate } from "../server";
const router = Router();

router.get("/",authGuard , getMessages);
router.post("/upsert",authGuard , upsertMessage);

export default router;
