import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const VARIETY_ANGLES = [
  "focus on debugging a tricky production issue",
  "focus on a design/architecture tradeoff decision",
  "focus on a time they disagreed with a teammate or lead",
  "focus on performance or scaling a system under load",
  "focus on a mistake they made and what they learned",
  "focus on collaborating across teams or with non-technical stakeholders",
  "focus on prioritizing under a tight deadline",
  "focus on a tool/technology choice and why",
  "focus on onboarding into unfamiliar code or a legacy system",
  "focus on handling ambiguous or incomplete requirements",
];

function pickRandomAngles(count = 3) {
  const shuffled = [...VARIETY_ANGLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function generateInterviewQuestions({
  role,
  experienceLevel,
  topics = [],
  numQuestions = 10,
  excludeQuestions = [],
}) {
  const topicsLine = topics.length ? `The candidate wants extra focus on: ${topics.join(", ")}.` : "";
  const angles = pickRandomAngles(3);
  const angleLine = `To keep things fresh, lean into these angles where relevant: ${angles.join("; ")}.`;
  const excludeLine = excludeQuestions.length
    ? `Do NOT repeat or closely resemble any of these previously used questions: ${excludeQuestions.join(" | ")}`
    : "";

  const systemPrompt = `You are a senior hiring manager who has personally interviewed hundreds of candidates for "${role}" positions.
Write questions exactly as you would actually ask them in a real interview — specific, grounded in real tools/scenarios for this role, not generic textbook questions.
Avoid vague phrasing like "explain the concept of X" — instead ask how the candidate would use it, debug it, or decide between tradeoffs, the way a real interviewer probes reasoning.
Avoid the most common, cliché interview questions — assume the candidate has heard those before.
Always respond with ONLY valid JSON — no markdown, no commentary.`;

  const userPrompt = `Generate ${numQuestions} interview questions for a "${role}" candidate at ${experienceLevel} level.
${topicsLine}
${angleLine}
${excludeLine}

Requirements:
- Ground questions in real, specific tools/scenarios for this exact role (name actual technologies, real situations, real tradeoffs) — not generic "what is X" questions.
- Mix categories: technical (hands-on, scenario-based), behavioral (past real experiences using STAR-style prompts), situational (hypothetical on-the-job problems), general (culture/motivation fit).
- Vary difficulty appropriately for a ${experienceLevel} candidate.
- Each question should sound like it came from an actual interview transcript, not a study guide.

Respond with ONLY this JSON:
{
  "questions": [
    {
      "question": "string",
      "category": "technical | behavioral | situational | general",
      "difficulty": "easy | medium | hard",
      "idealAnswerNotes": "what a strong answer should specifically cover for THIS question"
    }
  ]
}`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.95,
    max_tokens: 2048,
  });

  const raw = response.choices[0].message.content;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in AI response");

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error("Failed to parse AI response as JSON: " + err.message);
  }

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("AI response missing 'questions' array");
  }

  return parsed.questions;
}

export async function streamInterviewQuestions(
  {
    role,
    experienceLevel,
    topics = [],
    numQuestions = 5,
    difficulty = "mixed",
    categories = ["technical", "behavioral", "situational", "general"],
    excludeQuestions = [],
  },
  res
) {
  const topicsLine = topics.length ? `Focus especially on: ${topics.join(", ")}.` : "";
  const difficultyLine =
    difficulty === "mixed"
      ? "Vary difficulty across easy, medium, and hard."
      : `All questions must be ${difficulty} difficulty only — no exceptions.`;
  const categoryLine = `Only generate questions from these categories: ${categories.join(", ")}.`;
  const angles = pickRandomAngles(3);
  const angleLine = `To keep things fresh and varied, lean into these angles where relevant: ${angles.join("; ")}.`;
  const excludeLine = excludeQuestions.length
    ? `Do NOT repeat or closely resemble any of these previously used questions:\n${excludeQuestions.join("\n")}`
    : "";

  const systemPrompt = `You are a senior hiring manager who has personally interviewed hundreds of candidates for "${role}" positions.
Write questions exactly as you would actually ask them in a real interview — specific, grounded in real tools/scenarios for this role.
Avoid the most common, cliché interview questions — assume the candidate has already heard those before.
Output ONLY plain text, one question per line, in EXACTLY this format with pipe separators:
category|difficulty|question text here

Rules:
- category must be exactly one of: technical, behavioral, situational, general
- difficulty must be exactly one of: easy, medium, hard
- No numbering, no brackets, no markdown, no extra commentary — just the pipe-separated lines.
- Keep each question concise (under 30 words) so you can fit the full requested count.`;

  const userPrompt = `Generate exactly ${numQuestions} interview questions for role: "${role}", experience level: ${experienceLevel}.
${categoryLine}
${difficultyLine}
${topicsLine}
${angleLine}
${excludeLine}
Write all ${numQuestions} questions completely — do not stop early.`;

  // Scale token budget with requested count, with generous headroom
  const estimatedTokens = Math.max(1024, numQuestions * 120);

  const stream = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.9,
    max_tokens: estimatedTokens,
    stream: true,
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullText = "";
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    if (token) {
      fullText += token;
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
  res.end();

  return fullText;
}

export async function evaluateAnswer({ question, idealAnswerNotes, userAnswer, role, experienceLevel }) {
  const systemPrompt = `You are a senior technical interviewer giving honest, constructive feedback on a candidate's answer.
Be specific and reference what they actually said. Don't be generically positive — point out real gaps and real strengths.
Always respond with ONLY valid JSON — no markdown, no commentary.`;

  const userPrompt = `Role: ${role} (${experienceLevel} level)
Question asked: "${question}"
What a strong answer should cover: ${idealAnswerNotes || "general competence in this area"}
Candidate's actual answer: "${userAnswer}"

Evaluate this answer and respond with ONLY this JSON:
{
  "score": <integer 1-10>,
  "strengths": ["specific thing they did well", "..."],
  "gaps": ["specific thing missing or weak", "..."],
  "improvedAnswerExample": "a short example of how a stronger answer could have been phrased",
  "overallFeedback": "2-3 sentence direct summary, like a real interviewer would give"
}`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
  });

  const raw = response.choices[0].message.content;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in AI response");

  return JSON.parse(jsonMatch[0]);
}

export async function generateModelAnswer({ question, role, experienceLevel }) {
  const systemPrompt = `You are a senior ${role} being interviewed. Answer the question the way a strong, well-prepared candidate at ${experienceLevel} level actually would in a real interview — confident, specific, real examples where relevant, not textbook-perfect.
Always respond with ONLY valid JSON — no markdown, no commentary.`;

  const userPrompt = `Question: "${question}"

Respond with ONLY this JSON:
{
  "modelAnswer": "a realistic, strong spoken-style answer, 3-6 sentences",
  "keyPoints": ["short bullet of a key point covered", "..."]
}`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.6,
  });

  const raw = response.choices[0].message.content;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in AI response");

  return JSON.parse(jsonMatch[0]);
}

export async function generateExtraQuestions({ role, experienceLevel, difficulty, categories, count, existingQuestions }) {
  const existingList = existingQuestions.map((q) => q.question).join(" | ");

  const systemPrompt = `You are a senior hiring manager for "${role}" positions. Output ONLY plain text, one question per line, in this format:
category|difficulty|question text here
No numbering, no commentary.`;

  const userPrompt = `Generate exactly ${count} NEW interview questions for role: "${role}", experience level: ${experienceLevel}, difficulty: ${difficulty}, categories: ${categories.join(", ")}.
Do not repeat or closely resemble these already-used questions: ${existingList}`;

  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: Math.max(512, count * 120),
  });

  const raw = response.choices[0].message.content;
  return raw
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
}
