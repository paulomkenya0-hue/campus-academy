import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection, doc, addDoc, setDoc, updateDoc, getDocs, getDoc, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const DEFAULT_WEIGHTS = { quizzes: 0.3, labs: 0.4, finalAssessment: 0.3 };
const DEFAULT_TOP_N = 5;

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

  async function safe(fn) {
    setError(""); setBusy(true);
    try { await fn(); }
    catch (err) { setError(err.message || "Samahani, kuna tatizo."); }
    finally { setBusy(false); }
  }

  async function handleCreate() {
    if (!title.trim()) return;
    await safe(async () => {
      await addDoc(collection(db, "competitions"), {
        courseId, title: title.trim(), scoringWeights: DEFAULT_WEIGHTS, topN: DEFAULT_TOP_N,
        status: "open", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setTitle("");
      await loadCompetitions(courseId);
    });
  }

  // --- Qualification: hesabu inafanyika kwenye browser cha Admin (badala ya Cloud Function) ---
  async function handleQualify(comp) {
    await safe(async () => {
      const [attemptsSnap, labsSnap, labAttemptsSnap, studentsSnap] = await Promise.all([
        getDocs(query(collection(db, "quizAttempts"), where("courseId", "==", comp.courseId))),
        getDocs(query(collection(db, "labs"), where("courseId", "==", comp.courseId), where("published", "==", true))),
        getDocs(query(collection(db, "labAttempts"), where("courseId", "==", comp.courseId), where("solved", "==", true))),
        getDocs(query(collection(db, "students"), where("status", "==", "active"))),
      ]);

      const quizByStudent = {};
      attemptsSnap.forEach((d) => {
        const a = d.data();
        if (!quizByStudent[a.studentId]) quizByStudent[a.studentId] = { sum: 0, count: 0 };
        quizByStudent[a.studentId].sum += a.percent || 0;
        quizByStudent[a.studentId].count += 1;
      });

      const totalLabs = labsSnap.size;
      const labsSolvedByStudent = {};
      labAttemptsSnap.forEach((d) => {
        const a = d.data();
        labsSolvedByStudent[a.studentId] = (labsSolvedByStudent[a.studentId] || 0) + 1;
      });

      // Mtihani wa mwisho: alama bora kutoka topics zilizowekwa isFinalAssessment=true
      const finalByStudent = {};
      attemptsSnap.forEach((d) => {
        const a = d.data();
        if (a.isFinalAssessment && (!finalByStudent[a.studentId] || a.percent > finalByStudent[a.studentId])) {
          finalByStudent[a.studentId] = a.percent || 0;
        }
      });

      const weights = comp.scoringWeights || DEFAULT_WEIGHTS;
      const scored = [];
      studentsSnap.forEach((d) => {
        const uid = d.id;
        const quizPct = quizByStudent[uid] ? quizByStudent[uid].sum / quizByStudent[uid].count : 0;
        const labsPct = totalLabs > 0 ? ((labsSolvedByStudent[uid] || 0) / totalLabs) * 100 : 0;
        const finalPct = finalByStudent[uid] || 0;
        const weighted = quizPct * weights.quizzes + labsPct * weights.labs + finalPct * weights.finalAssessment;
        if (quizByStudent[uid] || labsSolvedByStudent[uid] || finalByStudent[uid]) {
          scored.push({ studentId: uid, displayName: d.data().displayName, quizPct, labsPct, finalPct, weighted });
        }
      });

      scored.sort((a, b) => b.weighted - a.weighted);
      const topN = comp.topN || DEFAULT_TOP_N;
      const qualifiedList = scored.slice(0, topN);

      for (let i = 0; i < qualifiedList.length; i++) {
        const s = qualifiedList[i];
        await setDoc(doc(db, "competitionParticipants", `${comp.id}_${s.studentId}`), {
          competitionId: comp.id, studentId: s.studentId, displayName: s.displayName,
          qualifyingRank: i + 1, qualifyingScore: Math.round(s.weighted * 100) / 100,
          breakdown: { quizPct: Math.round(s.quizPct), labsPct: Math.round(s.labsPct), finalPct: Math.round(s.finalPct) },
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, "notifications"), {
          studentId: s.studentId, type: "competition_qualified", read: false,
          title: "🏅 Umefuzu kwa Mashindano ya Mwisho!",
          body: `${comp.title} — nafasi #${i + 1}`, data: { competitionId: comp.id },
          createdAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, "competitions", comp.id), { status: "qualified", updatedAt: serverTimestamp() });
      await loadCompetitions(courseId);
      await loadParticipants({ ...comp, status: "qualified" });
    });
  }

  async function handleRoundScore(studentId, roundNumber) {
    const score = Number(roundScores[`${studentId}_${roundNumber}`] || 0);
    await safe(async () => {
      await setDoc(doc(db, "competitionParticipants", `${selected.id}_${studentId}`), {
        rounds: { [`round${roundNumber}`]: { title: `Round ${roundNumber}`, score } },
      }, { merge: true });
      await loadParticipants(selected);
    });
  }

  async function handlePublish() {
    await safe(async () => {
      const snap = await getDocs(query(collection(db, "competitionParticipants"), where("competitionId", "==", selected.id)));
      const results = snap.docs.map((d) => {
        const p = d.data();
        const roundTotal = Object.values(p.rounds || {}).reduce((sum, r) => sum + (r.score || 0), 0);
        return { studentId: p.studentId, displayName: p.displayName, roundTotal };
      });
      results.sort((a, b) => b.roundTotal - a.roundTotal);
      const medals = ["🥇", "🥈", "🥉"];

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        await setDoc(doc(db, "competitionResults", `${selected.id}_${r.studentId}`), {
          competitionId: selected.id, studentId: r.studentId, displayName: r.displayName,
          place: i + 1, medal: medals[i] || null, totalScore: r.roundTotal,
          publishedAt: serverTimestamp(),
        });
        await addDoc(collection(db, "notifications"), {
          studentId: r.studentId, type: "competition_result", read: false,
          title: `${medals[i] || "🏅"} Matokeo ya Mashindano`, body: `Umeshika nafasi ya #${i + 1}`,
          data: { competitionId: selected.id }, createdAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, "competitions", selected.id), { status: "completed", updatedAt: serverTimestamp() });
      await loadCompetitions(courseId);
    });
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
                    Endesha Uhesabuji wa Kufuzu (Top {selected.topN || DEFAULT_TOP_N})
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
                              <input type="number" className="input-field text-xs py-1 w-14"
                                value={roundScores[`${q.studentId}_${round}`] ?? q.rounds?.[`round${round}`]?.score ?? ""}
                                onChange={(e) => setRoundScores({ ...roundScores, [`${q.studentId}_${round}`]: e.target.value })} />
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
