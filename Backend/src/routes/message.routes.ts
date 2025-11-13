import { Router } from "express";
import { appendMessages, getMessages, getMessagesBulk, upsertMessage } from "../controllers/message.controller";
import { authGuard } from "../middlewares/auth.middleware";
const router = Router();

router.get("/",authGuard , getMessages);
router.post("/upsert",authGuard , upsertMessage);
router.post("/append", authGuard, appendMessages);
router.post("/allMessages", getMessagesBulk);
export default router;
