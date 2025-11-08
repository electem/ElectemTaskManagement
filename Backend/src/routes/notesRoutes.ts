// routes/notesRoutes.ts
import { Router } from "express";
import { addNote, getNotes } from "../controllers/notesController";

const router = Router();

router.post("/addnotes", addNote);      
router.get("/:projectId", getNotes); 

export default router;
