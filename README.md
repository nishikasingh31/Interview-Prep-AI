# Interview Prep AI

A full-stack MERN-style application that generates realistic, role-specific interview questions using an LLM, lets users practice answering them, and gives AI-scored feedback — or shows a model answer instantly. 
Built with a Node/Express + MongoDB backend and a React (Vite) frontend, powered by an LLM via the Groq API.

## Features

- **AI-generated interview questions** — Tailored to a specific job role, experience level (Fresher/Junior/Mid/Senior), difficulty (Easy/Medium/Hard), and question type (Technical, Behavioral, Situational, General)
- **Real-time streaming responses** — Questions stream in live token-by-token via Server-Sent Events (SSE), similar to a ChatGPT-style experience
- **Two ways to practice**:
  - Type your own answer and get AI-evaluated feedback (score out of 10, strengths, gaps, and a stronger example answer)
  - Instantly view an AI-generated model answer with key points, no typing required
- **User authentication** — JWT-based register/login, protected routes
- **Persistent history** — Every generated question set and every submitted answer is saved to MongoDB, viewable later in a dedicated History page with tabs for "Past Searches" and "Answered Questions"
- **Configurable generation** — Pick exact difficulty and question categories, or use a one-click "Basic Questions" preset for fresher-level practice
- **Polished UI** — Animated transitions with Framer Motion and icons via Lucide React

## Tech Stack

**Frontend**
- React 18 (Vite)
- React Router
- Framer Motion (animations)
- Lucide React (icons)
- Axios

**Backend**
- Node.js + Express (ES Modules)
- MongoDB + Mongoose
- JWT authentication (jsonwebtoken, bcryptjs)
- Groq API (OpenAI-compatible SDK) for LLM-powered question generation and answer evaluation

## Project Structure

```
interview-prep-ai/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── questionController.js
│   │   │   └── answerController.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Question.js
│   │   │   └── Answer.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── questionRoutes.js
│   │   │   └── answerRoutes.js
│   │   └── services/
│   │       └── aiService.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── client/
    ├── src/
    │   ├── api/
    │   │   └── client.js
    │   ├── components/
    │   │   └── Navbar.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   └── History.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

## How It Works

1. **Register / Log in** — JWT token is issued and stored client-side; all subsequent requests are authenticated.
2. **Generate questions** — Pick a role, experience level, difficulty, and question types, then hit *Generate*. The backend streams the LLM's response live via SSE, parsed into structured question objects
3. (`category`, `difficulty`, `question`), and saves the full set to MongoDB tied to the logged-in user.
4. **Practice** — Under each question, either:
   - Type an answer → Backend sends it to the LLM for evaluation → Returns a score, strengths, gaps, and a stronger example answer, saved to MongoDB
   - Or click "Show AI's answer instead" → backend generates a model answer + key points on demand
5. **Review history** — The History page pulls all past question sets and answered questions from MongoDB via `/api/questions/mine` and `/api/answers/mine`.

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create a new account | No |
| POST | `/api/auth/login` | Log in, receive JWT | No |
| GET | `/api/questions/stream` | Stream generated questions (SSE) | Yes |
| POST | `/api/questions/generate` | Generate questions (non-streamed, JSON) | Yes |
| GET | `/api/questions/mine` | Get all question sets for the logged-in user | Yes |
| GET | `/api/questions/set/:id` | Get a specific question set by ID | Yes |
| GET | `/api/questions/:role` | Get question sets matching a role | Yes |
| POST | `/api/answers` | Submit an answer for AI evaluation | Yes |
| GET | `/api/answers/mine` | Get all answers submitted by the logged-in user | Yes |
| POST | `/api/answers/model-answer` | Get an AI-generated model answer for a question | Yes |

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local instance or MongoDB Atlas)
- A free Groq API key (console.groq.com)

### Backend Setup
```bash
cd server
npm install
cp .env.example .env
```
Fill in `.env`:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
JWT_SECRET=a_long_random_secret_string
NODE_ENV=development
```
Run the server:
```bash
npm run dev
```

### Frontend Setup
```bash
cd client
npm install
npm run dev
```
Visit `http://localhost:5173` — the Vite dev server proxies `/api/*` requests to the backend on port 5000.

## Why Groq?

This project uses Groq's free, fast inference API running open models (Llama 3.1), making it easy to run and demo end-to-end at zero cost. The AI service layer (`aiService.js`) is written using the OpenAI SDK pointed at 
Groq's OpenAI-compatible endpoint, so swapping to OpenAI, Gemini, or any other OpenAI-compatible provider only requires changing the client configuration — the rest of the application logic is provider-agnostic.

## Prompt Engineering

Three distinct prompt strategies are used across the app, each tuned for its specific job:

**1. Question generation (streaming)** — instructs the model to act as *"a senior hiring manager who has personally interviewed hundreds of candidates for this role"* rather than a generic assistant, and explicitly 
avoids textbook-style phrasing (e.g. "explain the concept of X") in favor of real, scenario-based questions grounded in actual tools and tradeoffs. Output is constrained to a strict `category|difficulty|question` pipe-delimited format rather than JSON, since pipe-delimited text can be parsed incrementally as it streams in — JSON cannot be safely parsed until the full response is received.

Example system prompt:
```
You are a senior hiring manager who has personally interviewed hundreds of
candidates for "{role}" positions. Write questions exactly as you would
actually ask them in a real interview — specific, grounded in real
tools/scenarios for this role. Output ONLY plain text, one question per
line, in EXACTLY this format:
category|difficulty|question text here
```

**2. Answer evaluation** — the model is prompted to give *honest, specific* feedback rather than generic encouragement, explicitly instructed to reference what the candidate actually wrote and call out real gaps, 
not just strengths. Output is structured JSON (score, strengths, gaps, improved example, overall feedback) since this is a single non-streamed response where JSON parsing is safe.

**3. Model answer generation** — the model is prompted to respond *as the candidate* ("You are a senior {role} being interviewed... answer the way a strong, well-prepared candidate would"), producing a natural 
spoken-style answer rather than a textbook definition, plus a short list of key points a strong answer should hit.

**Reliability techniques used:**
- **Token budgeting** — `max_tokens` is scaled dynamically based on how many questions were requested (`numQuestions * ~120`), since a fixed low limit was causing responses to be truncated mid-question for larger batches.
- **Regex-based JSON extraction** (`raw.match(/\{[\s\S]*\}/)`) as a safety net for the non-streamed endpoints, in case the model wraps its JSON output in extra commentary or markdown fences despite instructions not to.
- **Auto top-up on shortfall** — if the parsed question count comes up short (a known LLM reliability issue — models don't always hit exact counts from instructions alone), a second, smaller follow-up call requests only
- the missing questions and explicitly excludes ones already generated, so the final result always matches what the user asked for.
- **Malformed-line filtering** — any streamed line that doesn't fully match the expected pipe format (e.g. cut off mid-sentence) is filtered out before saving, rather than storing incomplete/empty question entries.

## Key Engineering Decisions

- **Streaming via SSE** rather than waiting for the full LLM response, for a more responsive, real-time feel.
- **JWT auth over SSE** — since `EventSource` cannot send custom headers, the auth token is passed as a query parameter for the `/stream` endpoint specifically, with the auth middleware updated to accept either
- the `Authorization` header or the query param.

## Future Improvements

- Voice-based answer input with speech-to-text
- Progress tracking and score trends over time
- Resume upload to auto-generate personalized questions
- Export question sets / feedback as PDF
