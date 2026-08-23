import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function load() {
      const [totalStudents, activeStudents, totalCourses, certificatesIssued] = await Promise.all([
        getCountFromServer(collection(db, "students")),
        getCountFromServer(query(collection(db, "students"), where("status", "==", "active"))),
        getCountFromServer(query(collection(db, "courses"), where("published", "==", true))),
        getCountFromServer(collection(db, "certificates")),
      ]);
      setStats({
        totalStudents: totalStudents.data().count,
        activeStudents: activeStudents.data().count,
        totalCourses: totalCourses.data().count,
        certificatesIssued: certificatesIssued.data().count,
      });
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display font-bold text-amber">Campus Academy — Admin</span>
          <button onClick={logout} className="text-ivory-muted hover:text-danger text-sm">Toka</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Jumla ya Wanafunzi" value={stats?.totalStudents} />
          <StatCard label="Wanafunzi Hai" value={stats?.activeStudents} />
          <StatCard label="Kozi Zilizochapishwa" value={stats?.totalCourses} />
          <StatCard label="Vyeti Vilivyotolewa" value={stats?.certificatesIssued} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/admin/courses" className="card hover:border-teal transition-colors">
            <p className="font-display font-bold mb-1">Kozi</p>
            <p className="text-sm text-ivory-muted">Unda kozi, hatua (stages), mada, na maswali</p>
          </Link>
          <Link to="/admin/badges" className="card hover:border-teal transition-colors">
            <p className="font-display font-bold mb-1">Beji</p>
            <p className="text-sm text-ivory-muted">Unda na simamia beji za mafanikio</p>
          </Link>
          <Link to="/admin/announcements" className="card hover:border-teal transition-colors">
            <p className="font-display font-bold mb-1">Matangazo</p>
            <p className="text-sm text-ivory-muted">Tuma tangazo kwa wanafunzi wote</p>
          </Link>
          <Link to="/admin/analytics" className="card hover:border-teal transition-colors">
            <p className="font-display font-bold mb-1">Uchambuzi</p>
            <p className="text-sm text-ivory-muted">Utendaji wa kozi na maswali kwa undani</p>
          </Link>
          <Link to="/admin/labs" className="card hover:border-teal transition-colors">
            <p className="font-display font-bold mb-1">Mazoezi ya Vitendo</p>
            <p className="text-sm text-ivory-muted">Unda labs za CTF na flag zilizofichwa</p>
          </Link>
          <Link to="/admin/competitions" className="card hover:border-teal transition-colors">
            <p className="font-display font-bold mb-1">Mashindano</p>
            <p className="text-sm text-ivory-muted">Endesha kufuzu, ingiza alama za raundi, chapisha matokeo</p>
          </Link>
          <Link to="/admin/certificates" className="card hover:border-teal transition-colors">
            <p className="font-display font-bold mb-1">Vyeti</p>
            <p className="text-sm text-ivory-muted">Toa vyeti kwa wanafunzi waliokamilisha kozi</p>
          </Link>
          <Link to="/admin/audit-logs" className="card hover:border-teal transition-colors">
            <p className="font-display font-bold mb-1">Kumbukumbu za Mfumo</p>
            <p className="text-sm text-ivory-muted">Angalia matukio muhimu ya usalama na usimamizi</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <p className="text-sm text-ivory-muted mb-1">{label}</p>
      <p className="font-display font-bold text-2xl">{value ?? "…"}</p>
    </div>
  );
}
