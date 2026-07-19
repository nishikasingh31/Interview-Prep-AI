import Answer from "../models/Answer.js";
import { evaluateAnswer, generateModelAnswer } from "../services/aiService.js";

export const submitAnswer = async (req, res) => {
  try {
    const { question, idealAnswerNotes, userAnswer, role, experienceLevel, questionSetId } = req.body;

    if (!question || !userAnswer) {
      return res.status(400).json({ success: false, message: "question and userAnswer are required." });
    }

    const feedback = await evaluateAnswer({
      question,
      idealAnswerNotes,
      userAnswer,
      role: role || "the given role",
      experienceLevel: experienceLevel || "Junior",
    });

    const saved = await Answer.create({
      userId: req.user._id,
      questionSetId: questionSetId || null,
      question,
      userAnswer,
      feedback,
    });

    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error("submitAnswer error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to evaluate answer.", error: err.message });
  }
};

export const getMyAnswers = async (req, res) => {
  try {
    const answers = await Answer.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: answers.length, data: answers });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch answers.", error: err.message });
  }
};

export const getModelAnswer = async (req, res) => {
  try {
    const { question, role, experienceLevel } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: "question is required." });
    }

    const result = await generateModelAnswer({
      question,
      role: role || "the given role",
      experienceLevel: experienceLevel || "Junior",
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("getModelAnswer error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate model answer.", error: err.message });
  }
};