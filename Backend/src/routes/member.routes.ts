import { Router } from "express";
import { createMember } from "../controllers/member.controller"; 
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();


router.post("/",authGuard , createMember);

export default router;
