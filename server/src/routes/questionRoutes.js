import express from "express";
import {
  generateQuestions,
  getQuestionsByRole,
  getQuestionSetById,
  getMyQuestionSets,
  streamQuestions,
} from "../controllers/questionController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/stream",protect, streamQuestions);
router.get("/mine", protect, getMyQuestionSets); 
router.post("/generate", protect, generateQuestions);
router.get("/set/:id", protect, getQuestionSetById);
router.get("/:role", protect, getQuestionsByRole);

export default router;