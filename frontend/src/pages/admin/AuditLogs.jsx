import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(100)));
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Kumbukumbu za Mfumo</span>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="card text-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-teal">{log.action}</span>
              <span className="text-ivory-muted text-xs">
                {log.createdAt?.toDate?.().toLocaleString?.() || ""}
              </span>
            </div>
            <p className="text-ivory-muted text-xs mt-1">
              {log.actorRole} · {log.targetType} {log.targetId}
            </p>
          </div>
        ))}
        {logs.length === 0 && <p className="text-ivory-muted text-sm">Hakuna kumbukumbu bado.</p>}
      </div>
    </div>
  );
}
