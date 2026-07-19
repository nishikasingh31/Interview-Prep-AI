import mongoose from "mongoose";

const QuestionItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    category: {
      type: String,
      enum: ["technical", "behavioral", "situational", "general"],
      default: "general",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    idealAnswerNotes: { type: String, default: "" },
  },
  { _id: false }
);

const QuestionSetSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, trim: true },
    experienceLevel: {
      type: String,
      enum: ["Fresher", "Junior", "Mid", "Senior"],
      default: "Junior",
    },
    topics: [{ type: String }],
    numQuestions: { type: Number, default: 10 },
    questions: [QuestionItemSchema],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const QuestionSet = mongoose.model("QuestionSet", QuestionSetSchema);
export default QuestionSet;