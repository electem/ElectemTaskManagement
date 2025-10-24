import { Router } from "express";
import { getMessages, upsertMessage } from "../controllers/message.controller";

const router = Router();

router.get("/", getMessages);
router.post("/upsert", upsertMessage);

export default router;
