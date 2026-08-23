import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { NavBar } from "../components/NavBar.jsx";

export default function LabView() {
  const { courseId, labId } = useParams();
  const [lab, setLab] = useState(null);
  const [flag, setFlag] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "labs", labId));
      setLab(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }
    load();
  }, [labId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!flag.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const submit = httpsCallable(functions, "submitLabFlag");
      const { data } = await submit({ labId, flag });
      setResult(data);
      if (data.correct) setFlag("");
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!lab) {
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
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">🚩 {lab.title}</h1>
          <p className="text-ivory-muted">{lab.description}</p>
        </div>

        <div className="card whitespace-pre-wrap leading-relaxed">{lab.instructions}</div>

        <form onSubmit={handleSubmit} className="card space-y-3">
          <label className="label">Weka Flag</label>
          <input
            className="input-field font-mono"
            placeholder="FLAG{...}"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Inakagua..." : "Wasilisha Flag"}
          </button>
        </form>

        {result && (
          <div className={`card text-center ${result.correct ? "border-teal" : "border-danger"}`}>
            {result.correct ? (
              <>
                <p className="text-3xl mb-1">✅</p>
                <p className="text-teal font-bold">
                  {result.alreadySolved ? "Tayari umepata flag hii." : "Sahihi!"}
                </p>
                {result.xpAwarded > 0 && <p className="text-amber font-mono mt-1">+{result.xpAwarded} XP</p>}
              </>
            ) : (
              <>
                <p className="text-3xl mb-1">❌</p>
                <p className="text-danger font-bold">Sio sahihi — jaribu tena (jaribio la {result.tries})</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
