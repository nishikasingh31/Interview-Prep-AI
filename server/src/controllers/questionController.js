import QuestionSet from "../models/Questions.js";
import {
  generateInterviewQuestions,
  streamInterviewQuestions,
  generateExtraQuestions,
} from "../services/aiService.js";

export const generateQuestions = async (req, res) => {
  console.log("generateQuestions HIT");
  try {
    const { role, experienceLevel = "Junior", topics = [], numQuestions = 5 } = req.body;

    if (!role || typeof role !== "string") {
      return res.status(400).json({ success: false, message: "Field 'role' is required and must be a string." });
    }
    if (numQuestions < 1 || numQuestions > 20) {
      return res.status(400).json({ success: false, message: "numQuestions must be between 1 and 20." });
    }

    // Pull recent questions for this user+role so we can ask the AI to avoid repeats
    let excludeQuestions = [];
    if (req.user?._id) {
      const recentSets = await QuestionSet.find({ userId: req.user._id, role })
        .sort({ createdAt: -1 })
        .limit(5);
      excludeQuestions = recentSets.flatMap((set) => set.questions.map((q) => q.question)).slice(0, 40);
    }

    const questions = await generateInterviewQuestions({
      role,
      experienceLevel,
      topics,
      numQuestions,
      excludeQuestions,
    });

    const savedSet = await QuestionSet.create({
      role,
      experienceLevel,
      topics,
      numQuestions,
      questions,
      userId: req.user?._id || null,
    });

    return res.status(201).json({ success: true, data: savedSet });
  } catch (err) {
    console.error("generateQuestions error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to generate questions.", error: err.message });
  }
};

export const getQuestionsByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const sets = await QuestionSet.find({ role: new RegExp(role, "i") }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: sets.length, data: sets });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch questions.", error: err.message });
  }
};

export const getQuestionSetById = async (req, res) => {
  try {
    const set = await QuestionSet.findById(req.params.id);
    if (!set) return res.status(404).json({ success: false, message: "Question set not found." });
    return res.status(200).json({ success: true, data: set });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch question set.", error: err.message });
  }
};

export const streamQuestions = async (req, res) => {
  try {
    const { role, experienceLevel = "Junior", numQuestions = 5, difficulty = "mixed", categories } = req.query;

    if (!role) {
      return res.status(400).json({ success: false, message: "role query param is required." });
    }

    const targetCount = Number(numQuestions);

    const categoryList = categories
      ? categories.split(",")
      : ["technical", "behavioral", "situational", "general"];

    // Pull recent questions for this user+role so we can ask the AI to avoid repeats
    let excludeQuestions = [];
    if (req.user?._id) {
      const recentSets = await QuestionSet.find({ userId: req.user._id, role })
        .sort({ createdAt: -1 })
        .limit(5);
      excludeQuestions = recentSets.flatMap((set) => set.questions.map((q) => q.question)).slice(0, 40);
    }

    const fullText = await streamInterviewQuestions(
      {
        role,
        experienceLevel,
        numQuestions: targetCount,
        difficulty,
        categories: categoryList,
        excludeQuestions,
      },
      res
    );

    // Parse the streamed pipe-format text into structured questions
    let parsedQuestions = fullText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("|"))
      .map((line) => {
        const parts = line.split("|");
        if (parts.length < 3) return null;
        const [category, difficultyVal, ...rest] = parts;
        const questionText = rest.join("|").trim();
        if (!questionText) return null;
        return {
          category: category.trim().toLowerCase(),
          difficulty: difficultyVal.trim().toLowerCase(),
          question: questionText,
        };
      })
      .filter(Boolean);

    // Top up if the model returned fewer questions than requested
    if (parsedQuestions.length < targetCount) {
      const shortfall = targetCount - parsedQuestions.length;
      try {
        const extra = await generateExtraQuestions({
          role,
          experienceLevel,
          difficulty,
          categories: categoryList,
          count: shortfall,
          existingQuestions: parsedQuestions,
        });
        parsedQuestions = [...parsedQuestions, ...extra];
      } catch (topUpErr) {
        console.error("Top-up generation failed:", topUpErr.message);
        // Not fatal — just proceed with what we have
      }
    }

    const finalQuestions = parsedQuestions.slice(0, targetCount);

    if (finalQuestions.length > 0 && req.user) {
      await QuestionSet.create({
        role,
        experienceLevel,
        numQuestions: targetCount,
        questions: finalQuestions,
        userId: req.user._id,
      });
    }
  } catch (err) {
    console.error("streamQuestions error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Streaming failed.", error: err.message });
    } else {
      res.end();
    }
  }
};

export const getMyQuestionSets = async (req, res) => {
  try {
    const sets = await QuestionSet.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: sets.length, data: sets });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch your question sets.", error: err.message });
  }
};
