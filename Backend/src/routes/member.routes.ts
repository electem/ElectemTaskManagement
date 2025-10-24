import { Router } from "express";
import { createMember } from "../controllers/member.controller"; 

const router = Router();


router.post("/", createMember);

export default router;
