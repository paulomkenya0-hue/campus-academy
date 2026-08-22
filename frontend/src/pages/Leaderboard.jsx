import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { NavBar } from "../components/NavBar.jsx";

export default function Leaderboard() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "leaderboards", "all-time"));
      setEntries(snap.exists() ? snap.data().entries || [] : []);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Ubao wa Ushindi</h1>
        <p className="text-ivory-muted mb-6">Wanafunzi bora kwa XP — muda wote</p>

        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.studentId}
              className={`card flex items-center gap-4 ${
                profile?.id === e.studentId ? "border-amber" : ""
              }`}
            >
              <span className="font-mono font-bold w-8 text-center text-ivory-muted">#{e.rank}</span>
              {e.photoURL ? (
                <img src={e.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-night-raised flex items-center justify-center text-sm">
                  {e.displayName?.[0]}
                </div>
              )}
              <div className="flex-1">
                <p className="font-display font-bold">{e.displayName}</p>
                <p className="text-xs text-ivory-muted">Level {e.level}</p>
              </div>
              <span className="font-mono text-amber">{e.xp} XP</span>
            </div>
          ))}
          {entries.length === 0 && <p className="text-ivory-muted">Bado hakuna data.</p>}
        </div>

        {profile && (
          <p className="text-center text-sm text-ivory-muted mt-4">
            Nafasi yako: #{entries.find((e) => e.studentId === profile.id)?.rank || "—"}
          </p>
        )}
      </div>
    </div>
  );
}
