import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import connectDB from "./src/config/db.js";
import questionRoutes from "./src/routes/questionRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import answerRoutes from "./src/routes/answerRoutes.js";
import { notFound, errorHandler } from "./src/middleware/errorHandler.js";

const app = express();

connectDB();

app.use(cors({
  origin: "https://interview-prep-ai-nishika-singh.vercel.app",
  credentials: true,
}));

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});
app.use("/api/", limiter);

app.get("/api/health", (req, res) => res.json({ success: true, message: "API is running" }));
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/answers", answerRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

console.log("GROQ key loaded:", process.env.GROQ_API_KEY ? "YES" : "NO");
console.log("GROQ key length:", process.env.GROQ_API_KEY?.length);
