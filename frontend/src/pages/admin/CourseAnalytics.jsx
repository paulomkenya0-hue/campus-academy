import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

export default function CourseAnalytics() {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(collection(db, "courses"), where("published", "==", true)));
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, []);

  async function loadStats(course) {
    setSelected(course); setLoading(true);
    try {
      const [attemptsSnap, stagesSnap, activeSnap] = await Promise.all([
        getDocs(query(collection(db, "quizAttempts"), where("courseId", "==", course.id))),
        getDocs(query(collection(db, "courses", course.id, "stages"), where("published", "==", true))),
        getDocs(query(collection(db, "students"), where("status", "==", "active"))),
      ]);

      let totalPercent = 0;
      const topicStats = {};
      attemptsSnap.forEach((d) => {
        const a = d.data();
        totalPercent += a.percent || 0;
        if (!topicStats[a.topicId]) topicStats[a.topicId] = { attempts: 0, passed: 0, totalPercent: 0 };
        topicStats[a.topicId].attempts += 1;
        topicStats[a.topicId].totalPercent += a.percent || 0;
        if (a.passed) topicStats[a.topicId].passed += 1;
      });

      const lastStage = stagesSnap.docs.sort((a, b) => (a.data().order || 0) - (b.data().order || 0)).slice(-1)[0];
      let completedCount = 0;
      if (lastStage) {
        activeSnap.forEach((d) => { if (d.data().unlockedStages?.[`${course.id}_${lastStage.id}_completed`]) completedCount += 1; });
      }

      setStats({
        totalAttempts: attemptsSnap.size,
        avgScore: attemptsSnap.size ? Math.round(totalPercent / attemptsSnap.size) : 0,
        completedCount, activeStudentCount: activeSnap.size,
        topicBreakdown: Object.entries(topicStats).map(([topicId, s]) => ({
          topicId, attempts: s.attempts,
          passRate: Math.round((s.passed / s.attempts) * 100),
          avgScore: Math.round(s.totalPercent / s.attempts),
        })),
      });
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Uchambuzi wa Kozi</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => (
            <button key={c.id} onClick={() => loadStats(c)} className={`px-3 py-1.5 rounded-full text-sm ${selected?.id === c.id ? "bg-amber text-night font-bold" : "bg-night-raised text-ivory-muted"}`}>
              {c.title}
            </button>
          ))}
        </div>
        {loading && <p className="text-ivory-muted">Inapakia...</p>}
        {stats && !loading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Majaribio ya Quiz" value={stats.totalAttempts} />
              <Stat label="Wastani wa Alama" value={`${stats.avgScore}%`} />
              <Stat label="Wamekamilisha Kozi" value={stats.completedCount} />
              <Stat label="Wanafunzi Hai" value={stats.activeStudentCount} />
            </div>
            <div className="space-y-2">
              {stats.topicBreakdown.map((t) => (
                <div key={t.topicId} className="card flex items-center justify-between text-sm">
                  <span className="font-mono text-ivory-muted text-xs">{t.topicId}</span>
                  <div className="flex gap-4"><span>Majaribio: {t.attempts}</span><span>Ufaulu: {t.passRate}%</span><span>Wastani: {t.avgScore}%</span></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function Stat({ label, value }) {
  return <div className="card"><p className="text-sm text-ivory-muted mb-1">{label}</p><p className="font-display font-bold text-2xl">{value}</p></div>;
}
