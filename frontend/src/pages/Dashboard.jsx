import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { NavBar } from "../components/NavBar.jsx";
import { XpBadge, StreakBadge } from "../components/Badges.jsx";

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
      <div className="min-h-screen">
        <NavBar />
        <div className="max-w-5xl mx-auto px-4 py-8 text-ivory-muted">Inapakia wasifu wako...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Karibu, {profile.displayName} 👋</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <XpBadge level={profile.level} xp={profile.xp} />
          <StreakBadge current={profile.streak?.current || 0} longest={profile.streak?.longest || 0} />
          <div className="card">
            <p className="text-ivory-muted text-sm mb-1">Alama za Kozi</p>
            <p className="font-display font-bold text-2xl">{courses.length}</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-3">Kozi Zinazopatikana</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map((c) => (
              <Link key={c.id} to={`/course/${c.id}`} className="card hover:border-teal transition-colors">
                <p className="font-display font-bold">{c.title}</p>
                <p className="text-sm text-ivory-muted mt-1">{c.description}</p>
              </Link>
            ))}
            {courses.length === 0 && (
              <p className="text-ivory-muted">Hakuna kozi zilizochapishwa bado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
