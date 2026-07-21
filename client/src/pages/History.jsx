import { useEffect, useState } from "react";
import client from "../api/client.js";

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

export default function History() {
  const [tab, setTab] = useState("searches");
  const [answers, setAnswers] = useState([]);
  const [questionSets, setQuestionSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [answersRes, setsRes] = await Promise.all([
          client.get("/api/answers/mine"),
          client.get("/api/questions/mine"),
        ]);
        setAnswers(answersRes.data.data);
        setQuestionSets(setsRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <p className="status-text">Loading history...</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <div className="history-page">
      <h1>Your History</h1>
      <div className="tabs">
        <button className={`tab ${tab === "searches" ? "tab-active" : ""}`} onClick={() => setTab("searches")}>
          Past searches ({questionSets.length})
        </button>
        <button className={`tab ${tab === "answers" ? "tab-active" : ""}`} onClick={() => setTab("answers")}>
          Answered questions ({answers.length})
        </button>
      </div>

      {tab === "searches" && (
        questionSets.length === 0 ? (
          <p className="status-text">No searches yet — generate some questions first.</p>
        ) : (
          questionSets.map((set) => (
            <div key={set._id} className="question-card">
              <p className="question-text">
                <strong>{set.role}</strong> — {capitalize(set.experienceLevel)} Level ({set.questions.length} Questions)
              </p>
              <p className="history-date">{new Date(set.createdAt).toLocaleString()}</p>
              <details>
                <summary>View questions</summary>
                <div className="history-question-list">
                  {set.questions.map((q, i) => (
                    <div key={i} className="history-question-item">
                      <div className="question-meta">
                        <span className={`badge badge-category-${q.category}`}>
                          {q.category}
                        </span>
                        <span className={`badge badge-difficulty-${q.difficulty}`}>{q.difficulty}</span>
                      </div>
                      <p className="question-text">{i + 1}. {q.question}</p>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))
        )
      )}

      {tab === "answers" && (
        answers.length === 0 ? (
          <p className="status-text">No answers submitted yet.</p>
        ) : (
          answers.map((a) => (
            <div key={a._id} className="question-card">
              <p className="question-text">{a.question}</p>
              <p><strong>Your answer:</strong> {a.userAnswer}</p>
              {a.feedback && (
                <div className="feedback-box">
                  <div className="feedback-score">Score: {a.feedback.score}/10</div>
                  <p>{a.feedback.overallFeedback}</p>
                </div>
              )}
              <p className="history-date">{new Date(a.createdAt).toLocaleString()}</p>
            </div>
          ))
        )
      )}
    </div>
  );
}
