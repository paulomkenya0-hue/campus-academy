import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { Layout } from "../components/Sidebar.jsx";

const ACCENTS = ["teal", "violet", "amber", "pink"];

export default function Dashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    async function load() {
      const q = query(collection(db, "courses"), where("published", "==", true));
      const snap = await getDocs(q);
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, []);

  if (!profile) {
    return (
      <Layout>
        <div className="p-8 text-muted">Inapakia wasifu wako...</div>
      </Layout>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Habari za asubuhi" : hour < 17 ? "Habari za mchana" : "Habari za jioni";

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{greeting}, {profile.displayName?.split(" ")[0]} 👋</h1>
            <p className="text-muted mt-1">Endelea kujifunza uendelee kutunza mfululizo wako.</p>
          </div>
          <div className="card flex items-center gap-4 px-5 py-3 w-fit">
            <span className="text-sm text-muted">🔥 Mfululizo wa siku {profile.streak?.current || 0}</span>
            <span className="text-amber font-bold font-display">⚡ {profile.xp || 0} XP</span>
          </div>
        </div>

        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-display font-bold text-lg">LEVEL {profile.level || 1}</p>
            <p className="text-sm text-muted mb-3">Endelea kusonga mbele kwenye safari yako ya kujifunza</p>
            <div className="h-2.5 rounded-full bg-canvas overflow-hidden">
              <div className="h-full bg-teal transition-all duration-500" style={{ width: `${Math.min(100, ((profile.xp || 0) % 500) / 5)}%` }} />
            </div>
          </div>
          <Link to={courses[0] ? `/course/${courses[0].id}` : "#"} className="btn-accent whitespace-nowrap">Endelea →</Link>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3">Kozi Zinazopatikana</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <Link key={c.id} to={`/course/${c.id}`} className="card hover:shadow-lg transition-shadow overflow-hidden">
                  <div className={`h-1.5 w-full bg-${accent} -mt-5 -mx-5 mb-4`} style={{ width: "calc(100% + 2.5rem)" }} />
                  <p className="font-display font-bold">{c.title}</p>
                  <p className="text-sm text-muted mt-1 line-clamp-2">{c.description}</p>
                </Link>
              );
            })}
            {courses.length === 0 && <p className="text-muted">Hakuna kozi zilizochapishwa bado.</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
