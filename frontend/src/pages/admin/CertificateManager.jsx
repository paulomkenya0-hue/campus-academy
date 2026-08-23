import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";

export default function CertificateManager() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [students, setStudents] = useState([]);
  const [issued, setIssued] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(collection(db, "courses"), where("published", "==", true)));
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, []);

  async function loadEligible(cid) {
    setCourseId(cid);
    const stagesSnap = await getDocs(query(collection(db, "courses", cid, "stages"), where("published", "==", true)));
    const lastStage = stagesSnap.docs.sort((a, b) => (a.data().order || 0) - (b.data().order || 0)).slice(-1)[0];
    if (!lastStage) { setStudents([]); return; }

    const studentsSnap = await getDocs(query(collection(db, "students"), where("status", "==", "active")));
    const eligible = studentsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.unlockedStages?.[`${cid}_${lastStage.id}_completed`]);
    setStudents(eligible);

    const certsSnap = await getDocs(query(collection(db, "certificates"), where("courseId", "==", cid)));
    const issuedMap = {};
    certsSnap.forEach((d) => { issuedMap[d.data().studentUid] = d.data().certId; });
    setIssued(issuedMap);
  }

  async function handleIssue(studentUid) {
    setBusy(true);
    setError("");
    try {
      const fn = httpsCallable(functions, "issueCertificate");
      await fn({ studentUid, courseId });
      await loadEligible(courseId);
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Vyeti</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <select className="input-field text-sm" value={courseId} onChange={(e) => loadEligible(e.target.value)}>
          <option value="">-- Chagua Kozi --</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.id} className="card flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">{s.displayName}</p>
                <p className="text-xs text-ivory-muted font-mono">{s.regNumber}</p>
              </div>
              {issued[s.id] ? (
                <span className="text-teal text-sm font-mono">✓ {issued[s.id]}</span>
              ) : (
                <button onClick={() => handleIssue(s.id)} disabled={busy} className="btn-primary text-sm">
                  Toa Cheti
                </button>
              )}
            </div>
          ))}
          {courseId && students.length === 0 && (
            <p className="text-ivory-muted text-sm">Hakuna mwanafunzi aliyekamilisha kozi hii bado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
