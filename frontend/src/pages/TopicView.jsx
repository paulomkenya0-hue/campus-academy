import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { NavBar } from "../components/NavBar.jsx";
import { useAssessmentGuard, formatTime } from "../hooks/useAssessmentGuard.js";

export default function TopicView() {
  const { courseId, stageId, topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [mode, setMode] = useState("lesson"); // lesson | quiz | result
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(null);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "courses", courseId, "stages", stageId, "topics", topicId));
      setTopic(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }
    load();
  }, [courseId, stageId, topicId]);

  async function startQuiz() {
    setLoading(true);
    setError("");
    try {
      const getQuiz = httpsCallable(functions, "getQuizQuestions");
      const { data } = await getQuiz({ courseId, stageId, topicId });
      setQuiz(data.quiz);
      setAnswers({});
      setStartedAt(Date.now());
      setMode("quiz");
    } catch (err) {
      setError("Samahani, kuna tatizo. Jaribu tena.");
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz() {
    setLoading(true);
    setError("");
    try {
      const submit = httpsCallable(functions, "submitQuizAttempt");
      const timeTakenSeconds = Math.round((Date.now() - startedAt) / 1000);
      const { data } = await submit({ courseId, stageId, topicId, answers, timeTakenSeconds });
      setResult(data);
      setMode("result");
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo. Jaribu tena.");
    } finally {
      setLoading(false);
    }
  }

  const { secondsLeft, violationCount, warning } = useAssessmentGuard({
    active: mode === "quiz" && topic?.assessmentMode,
    courseId, stageId, topicId,
    timeLimitSeconds: topic?.timeLimitSeconds,
    onAutoSubmit: submitQuiz,
  });

  if (!topic) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="max-w-2xl mx-auto px-4 py-8 text-ivory-muted">Inapakia...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">{topic.title}</h1>

        {mode === "lesson" && (
          <div className="space-y-6">
            <div className="card whitespace-pre-wrap leading-relaxed">{topic.content}</div>
            <button onClick={startQuiz} disabled={loading} className="btn-primary w-full">
              {loading ? "Inaandaa Quiz..." : "Endelea kwenye Quiz →"}
            </button>
            {error && <p className="text-danger text-sm">{error}</p>}
          </div>
        )}

        {mode === "quiz" && quiz && (
          <div className="space-y-5">
            {topic.assessmentMode && (
              <div className="card border-amber flex items-center justify-between">
                <div>
                  <p className="text-amber font-bold text-sm">⏱️ Hali ya Mtihani (Assessment Mode)</p>
                  <p className="text-xs text-ivory-muted mt-1">
                    Usiondoke ukurasa huu. Matukio ya kutoka yanahifadhiwa.
                  </p>
                </div>
                {topic.timeLimitSeconds && (
                  <span className="font-mono text-lg text-amber">{formatTime(secondsLeft)}</span>
                )}
              </div>
            )}
            {warning && <p className="text-danger text-sm bg-night-raised p-2 rounded-lg">{warning}</p>}
            {quiz.map((q, i) => (
              <div key={q.id} className="card">
                <p className="font-display font-bold mb-3">{i + 1}. {q.text}</p>
                <div className="space-y-2">
                  {q.choices.map((c) => (
                    <label
                      key={c.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${answers[q.id] === c.key ? "border-teal bg-night-raised" : "border-night-border"}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === c.key}
                        onChange={() => setAnswers({ ...answers, [q.id]: c.key })}
                        className="accent-teal"
                      />
                      <span>{c.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error && <p className="text-danger text-sm">{error}</p>}
            <button
              onClick={submitQuiz}
              disabled={loading || Object.keys(answers).length < quiz.length}
              className="btn-primary w-full"
            >
              {loading ? "Inatuma..." : "Wasilisha Majibu"}
            </button>
          </div>
        )}

        {mode === "result" && result && (
          <div className="space-y-5">
            <div className={`card text-center ${result.passed ? "border-teal" : "border-danger"}`}>
              <p className="text-4xl font-display font-bold mb-1">
                {result.correctCount}/{result.total}
              </p>
              <p className="text-ivory-muted">Umepata {result.percent}%</p>
              <p className={`mt-2 font-bold ${result.passed ? "text-teal" : "text-danger"}`}>
                {result.passed ? "✅ Umefaulu!" : "❌ Hujafaulu — jaribu tena"}
              </p>
              {result.xpAwarded > 0 && (
                <p className="mt-2 text-amber font-mono">+{result.xpAwarded} XP</p>
              )}
              {result.stageCompleted && (
                <p className="mt-2 text-teal text-sm">🎉 Umekamilisha stage nzima!</p>
              )}
              {result.newBadges?.length > 0 && (
                <p className="mt-2 text-amber text-sm">🏅 Beji mpya: {result.newBadges.length}! Angalia wasifu wako.</p>
              )}
            </div>

            <div className="space-y-3">
              {result.breakdown.map((b, i) => (
                <div key={b.questionId} className="card">
                  <p className="text-sm text-ivory-muted mb-1">
                    Swali {i + 1}: {b.isCorrect ? "✅ Sahihi" : "❌ Sio Sahihi"}
                  </p>
                  {!b.isCorrect && (
                    <p className="text-sm">
                      Jibu sahihi: <span className="text-teal font-bold">{b.correctAnswer}</span>
                    </p>
                  )}
                  {b.explanation && <p className="text-sm text-ivory-muted mt-1">{b.explanation}</p>}
                </div>
              ))}
            </div>

            <button onClick={() => navigate(`/course/${courseId}/stage/${stageId}`)} className="btn-secondary w-full">
              Rudi kwenye Stage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
