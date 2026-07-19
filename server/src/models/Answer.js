import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    questionSetId: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionSet" },
    question: { type: String, required: true },
    userAnswer: { type: String, required: true },
    feedback: {
      score: Number,
      strengths: [String],
      gaps: [String],
      improvedAnswerExample: String,
      overallFeedback: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Answer", AnswerSchema);