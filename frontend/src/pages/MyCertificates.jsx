import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { NavBar } from "../components/NavBar.jsx";

export default function MyCertificates() {
  const { profile } = useAuth();
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const snap = await getDocs(query(collection(db, "certificates"), where("studentUid", "==", profile.id)));
      setCerts(snap.docs.map((d) => d.data()));
    }
    load();
  }, [profile]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Vyeti Vyangu</h1>

        <div className="space-y-3">
          {certs.map((c) => (
            <div key={c.certId} className="card flex items-center justify-between">
              <div>
                <p className="font-display font-bold">{c.courseName}</p>
                <p className="text-xs text-ivory-muted font-mono">{c.certId}</p>
              </div>
              <Link to={`/certificate/${c.certId}`} target="_blank" className="btn-secondary text-sm">
                Ona / Thibitisha
              </Link>
            </div>
          ))}
          {certs.length === 0 && <p className="text-ivory-muted">Bado hujapata cheti chochote. Kamilisha kozi kupata cheti chako cha kwanza!</p>}
        </div>
      </div>
    </div>
  );
}
