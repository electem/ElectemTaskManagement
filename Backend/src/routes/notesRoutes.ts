// routes/notesRoutes.ts
import { Router } from "express";
import { addNote, getNotes } from "../controllers/notesController";
import { authGuard } from "../middlewares/auth.middleware";


const router = Router();

router.post("/addnotes",authGuard , addNote);      
router.get("/:projectId",authGuard , getNotes); 

export default router;
