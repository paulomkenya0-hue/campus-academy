import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";

export default function CompetitionManager() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [competitions, setCompetitions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qualified, setQualified] = useState([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [roundScores, setRoundScores] = useState({});

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "courses"));
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, []);

  async function loadCompetitions(cid) {
    const snap = await getDocs(query(collection(db, "competitions"), where("courseId", "==", cid)));
    setCompetitions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  useEffect(() => { if (courseId) loadCompetitions(courseId); }, [courseId]);

  async function loadParticipants(comp) {
    setSelected(comp);
    const snap = await getDocs(query(collection(db, "competitionParticipants"), where("competitionId", "==", comp.id)));
    setQualified(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.qualifyingRank - b.qualifyingRank));
  }

  async function call(fnName, payload) {
    setError(""); setBusy(true);
    try {
      const fn = httpsCallable(functions, fnName);
      const { data } = await fn(payload);
      return data;
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo.");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    if (!title.trim()) return;
    await call("createCompetition", { courseId, title });
    setTitle("");
    await loadCompetitions(courseId);
  }

  async function handleQualify(comp) {
    await call("runQualification", { competitionId: comp.id });
    await loadCompetitions(courseId);
    await loadParticipants({ ...comp, status: "qualified" });
  }

  async function handleRoundScore(studentId, roundNumber) {
    const score = Number(roundScores[`${studentId}_${roundNumber}`] || 0);
    await call("submitRoundScore", { competitionId: selected.id, studentId, roundNumber, score });
    await loadParticipants(selected);
  }

  async function handlePublish() {
    await call("publishFinalResults", { competitionId: selected.id });
    await loadCompetitions(courseId);
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Mashindano</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <select className="input-field text-sm" value={courseId} onChange={(e) => { setCourseId(e.target.value); setSelected(null); }}>
          <option value="">-- Chagua Kozi --</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        {error && <p className="text-danger text-sm">{error}</p>}

        {courseId && (
          <>
            <div className="card flex gap-2">
              <input className="input-field text-sm flex-1" placeholder="Jina la mashindano" value={title} onChange={(e) => setTitle(e.target.value)} />
              <button onClick={handleCreate} disabled={busy} className="btn-primary text-sm">Unda</button>
            </div>

            <div className="flex flex-wrap gap-2">
              {competitions.map((c) => (
                <button key={c.id} onClick={() => loadParticipants(c)}
                  className={`px-3 py-1.5 rounded-full text-sm ${selected?.id === c.id ? "bg-amber text-night font-bold" : "bg-night-raised text-ivory-muted"}`}>
                  {c.title} ({c.status})
                </button>
              ))}
            </div>

            {selected && (
              <div className="space-y-4">
                {selected.status === "open" && (
                  <button onClick={() => handleQualify(selected)} disabled={busy} className="btn-secondary text-sm w-full">
                    Endesha Uhesabuji wa Kufuzu (Top {selected.topN})
                  </button>
                )}

                {qualified.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-display font-bold">Waliofuzu ({qualified.length})</h3>
                    {qualified.map((q) => (
                      <div key={q.studentId} className="card">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">#{q.qualifyingRank} {q.displayName}</span>
                          <span className="font-mono text-teal text-sm">{q.qualifyingScore} pts</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {[1, 2, 3].map((round) => (
                            <div key={round} className="flex items-center gap-1 text-xs">
                              <span className="text-ivory-muted">R{round}:</span>
                              <input
                                type="number"
                                className="input-field text-xs py-1 w-14"
                                value={roundScores[`${q.studentId}_${round}`] ?? q.rounds?.[`round${round}`]?.score ?? ""}
                                onChange={(e) => setRoundScores({ ...roundScores, [`${q.studentId}_${round}`]: e.target.value })}
                              />
                              <button onClick={() => handleRoundScore(q.studentId, round)} className="text-teal">✓</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {selected.status !== "completed" && (
                      <button onClick={handlePublish} disabled={busy} className="btn-primary text-sm w-full">
                        Chapisha Matokeo ya Mwisho
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
