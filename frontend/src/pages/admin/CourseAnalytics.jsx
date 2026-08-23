import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";

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
    setSelected(course);
    setLoading(true);
    try {
      const fn = httpsCallable(functions, "getCourseAnalytics");
      const { data } = await fn({ courseId: course.id });
      setStats(data);
    } finally {
      setLoading(false);
    }
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
            <button
              key={c.id}
              onClick={() => loadStats(c)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                selected?.id === c.id ? "bg-amber text-night font-bold" : "bg-night-raised text-ivory-muted"
              }`}
            >
              {c.title}
            </button>
          ))}
          {courses.length === 0 && <p className="text-ivory-muted text-sm">Hakuna kozi zilizochapishwa.</p>}
        </div>

        {loading && <p className="text-ivory-muted">Inapakia takwimu...</p>}

        {stats && !loading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat label="Majaribio ya Quiz" value={stats.totalAttempts} />
              <Stat label="Wastani wa Alama" value={`${stats.avgScore}%`} />
              <Stat label="Wamekamilisha Kozi" value={stats.completedCount} />
              <Stat label="Wanafunzi Hai" value={stats.activeStudentCount} />
            </div>

            <div>
              <h2 className="font-display font-bold mb-3">Utendaji kwa Kila Mada</h2>
              <div className="space-y-2">
                {stats.topicBreakdown.map((t) => (
                  <div key={t.topicId} className="card flex items-center justify-between text-sm">
                    <span className="font-mono text-ivory-muted">{t.topicId}</span>
                    <div className="flex gap-4">
                      <span>Majaribio: {t.attempts}</span>
                      <span>Ufaulu: {t.passRate}%</span>
                      <span>Wastani: {t.avgScore}%</span>
                    </div>
                  </div>
                ))}
                {stats.topicBreakdown.length === 0 && (
                  <p className="text-ivory-muted text-sm">Bado hakuna majaribio ya quiz kwa kozi hii.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm text-ivory-muted mb-1">{label}</p>
      <p className="font-display font-bold text-2xl">{value}</p>
    </div>
  );
}
