import express from "express";
import { submitAnswer, getMyAnswers, getModelAnswer } from "../controllers/answerController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, submitAnswer);
router.get("/mine", protect, getMyAnswers);
router.post("/model-answer", protect, getModelAnswer); // new

export default router;