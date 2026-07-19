import { useState, useRef } from "react";

function parseQuestions(rawText) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("|"))
    .map((line) => {
      const parts = line.split("|");
      if (parts.length < 3) return null;
      const [category, difficulty, ...rest] = parts;
      return {
        category: category.trim().toLowerCase(),
        difficulty: difficulty.trim().toLowerCase(),
        question: rest.join("|").trim(),
      };
    })
    .filter(Boolean);
}

function QuestionCard({ q, index }) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [modelAnswer, setModelAnswer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [error, setError] = useState("");

  const authHeader = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ question: q.question, userAnswer: answer }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setFeedback(data.data.feedback);
    } catch (err) {
      setError(err.message || "Failed to get feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowModelAnswer = async () => {
    setLoadingModel(true);
    setError("");
    try {
      const res = await fetch("/api/answers/model-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ question: q.question }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setModelAnswer(data.data);
    } catch (err) {
      setError(err.message || "Failed to load model answer.");
    } finally {
      setLoadingModel(false);
    }
  };

  return (
    <div className="question-card">
      <div className="question-meta">
        <span className= {`badge badge-category-${q.category}`}>
          {q.category}
        </span>
        <span className={`badge badge-difficulty-${q.difficulty}`}>{q.difficulty}</span>
      </div>
      <p className="question-text">{index + 1}. {q.question}</p>

      {error && <p className="error-text">{error}</p>}

      {!feedback && (
        <>
          <textarea
            className="answer-input"
            placeholder="Type your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
          />
          <div className="card-actions">
            <button className="btn btn-primary" onClick={handleSubmitAnswer} disabled={submitting}>
              {submitting ? "Evaluating..." : "Submit Answer"}
            </button>
            <button className="btn btn-ghost" onClick={handleShowModelAnswer} disabled={loadingModel}>
              {loadingModel ? "Loading..." : "Show Answer"}
            </button>
          </div>
        </>
      )}

      {feedback && (
        <div className="feedback-box">
          <div className="feedback-score">Score: {feedback.score}/10</div>
          <p><strong>Feedback:</strong> {feedback.overallFeedback}</p>
          {feedback.strengths?.length > 0 && (
            <div>
              <strong>Strengths:</strong>
              <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {feedback.gaps?.length > 0 && (
            <div>
              <strong>Gaps:</strong>
              <ul>{feedback.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </div>
          )}
          {feedback.improvedAnswerExample && (
            <p><strong>Stronger answer example:</strong> {feedback.improvedAnswerExample}</p>
          )}
        </div>
      )}

      {modelAnswer && (
        <div className="model-answer-box">
          <strong>Suggested answer:</strong>
          <p>{modelAnswer.modelAnswer}</p>
          {modelAnswer.keyPoints?.length > 0 && (
            <>
              <strong>Key points:</strong>
              <ul>{modelAnswer.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Junior");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("mixed"); 
  const [categories, setCategories] = useState({          
    technical: true,
    behavioral: true,
    situational: true,
    general: true,
  });
  const [streamedText, setStreamedText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const eventSourceRef = useRef(null);

  const toggleCategory = (cat) => {
    setCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    setError("");
    setStreamedText("");
    setParsedQuestions([]);
    setIsStreaming(true);

    if (eventSourceRef.current) eventSourceRef.current.close();

    const selectedCategories = Object.entries(categories)
      .filter(([, checked]) => checked)
      .map(([cat]) => cat);

    if (selectedCategories.length === 0) {
      setError("Select at least one question type.");
      setIsStreaming(false);
      return;
    }

    const params = new URLSearchParams({
      role,
      experienceLevel,
      numQuestions: String(numQuestions),
      difficulty,
      categories: selectedCategories.join(","),
      token: localStorage.getItem("token"),
    });

    const es = new EventSource(`${import.meta.env.VITE_API_URL}/api/questions/stream?${params.toString()}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.token) setStreamedText((prev) => prev + data.token);
      if (data.done) {
        setParsedQuestions(parseQuestions(data.fullText));
        setIsStreaming(false);
        es.close();
      }
    };

    es.onerror = () => {
      setError("Connection lost while streaming. Please try again.");
      setIsStreaming(false);
      es.close();
    };
  };

  return (
    <div className="dashboard">
      <h1>Generate Interview Questions</h1>
      <form onSubmit={handleGenerate} className="generator-form">
        <label>Job role</label>
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Backend Developer" required />

        <label>Experience level</label>
        <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
          <option value="Fresher">Fresher</option>
          <option value="Junior">Junior</option>
          <option value="Mid">Mid</option>
          <option value="Senior">Senior</option>
        </select>

        <label>Difficulty</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="mixed">Mixed (easy, medium, hard)</option>
          <option value="easy">Basic / Easy only</option>
          <option value="medium">Medium only</option>
          <option value="hard">Hard only</option>
        </select>

        <label>Question types</label>
        <div className="category-checkboxes">
          {Object.keys(categories).map((cat) => (
            <label key={cat} className="checkbox-label">
              <input
                type="checkbox"
                checked={categories[cat]}
                onChange={() => toggleCategory(cat)}
              />
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </label>
          ))}
        </div>

        <label>Number of questions</label>
        <input type="number" min={1} max={20} value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)} />

        <div className="card-actions">
          <button type="submit" className="btn btn-primary" disabled={isStreaming}>
            {isStreaming ? "Generating..." : "Generate questions"}
          </button>
        </div>
      </form>

      {error && <p className="error-text">{error}</p>}

      {isStreaming && (
        <div className="stream-output">
          <h2>Generating...</h2>
          <pre className="stream-text">
            {streamedText}
            <span className="cursor-blink">▌</span>
          </pre>
        </div>
      )}

      {!isStreaming && parsedQuestions.length > 0 && (
        <div className="question-list">
          {parsedQuestions.map((q, i) => (
            <QuestionCard key={i} q={q} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
