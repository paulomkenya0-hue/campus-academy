import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";

export default function StudentImport() {
  const [csvText, setCsvText] = useState("Registration Number,First Name,Last Name\nRUCU/2026/001,John,Michael\nRUCU/2026/002,Asha,Joseph");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");
  const [students, setStudents] = useState([]);

  async function loadStudents() {
    const snap = await getDocs(query(collection(db, "approvedStudents"), orderBy("importedAt", "desc")));
    setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => {
    loadStudents();
  }, []);

  function parseCsv(text) {
    const lines = text.trim().split("\n").filter(Boolean);
    const [, ...rows] = lines; // skip header
    return rows.map((row) => {
      const [regNumber, firstName, lastName] = row.split(",").map((s) => s.trim());
      return { regNumber, firstName, lastName };
    });
  }

  async function handleImport() {
    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const students = parseCsv(csvText);
      const importFn = httpsCallable(functions, "importStudents");
      const { data } = await importFn({ students });
      setImportResult(data);
      if (data.committed) await loadStudents();
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo. Jaribu tena.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Usimamizi wa Wanafunzi</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="card">
          <h2 className="font-display font-bold mb-2">Ingiza Wanafunzi (CSV)</h2>
          <p className="text-sm text-ivory-muted mb-3">
            Muundo: Registration Number,First Name,Last Name — mstari mmoja kwa kila mwanafunzi.
          </p>
          <textarea
            className="input-field font-mono text-sm min-h-[160px]"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <button onClick={handleImport} disabled={importing} className="btn-primary mt-3">
            {importing ? "Inaingiza..." : "Ingiza Wanafunzi"}
          </button>
          {error && <p className="text-danger text-sm mt-2">{error}</p>}

          {importResult && !importResult.committed && (
            <div className="mt-4 text-sm text-danger">
              <p className="font-bold mb-1">Kuna makosa — hakuna kilichoingizwa:</p>
              {importResult.errors.map((e, i) => (
                <p key={i}>Mstari {e.row + 1}: {e.error}</p>
              ))}
            </div>
          )}

          {importResult?.committed && (
            <div className="mt-4">
              <p className="text-teal text-sm mb-2">
                ✅ Wanafunzi {importResult.count} wameingizwa. Msimbo wa uanzishaji kwa kila mmoja (wape offline):
              </p>
              <div className="font-mono text-xs bg-night-raised rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                {importResult.students.map((s) => (
                  <p key={s.regNumber}>{s.regNumber} → {s.activationCode}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-display font-bold mb-3">Wanafunzi Walioidhinishwa ({students.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-night-border pb-2">
                <div>
                  <p className="font-mono">{s.regNumber}</p>
                  <p className="text-ivory-muted">{s.firstName} {s.lastName}</p>
                </div>
                <span className={s.activated ? "text-teal" : "text-amber"}>
                  {s.activated ? "Ameanzisha akaunti" : "Bado hajaanzisha"}
                </span>
              </div>
            ))}
            {students.length === 0 && <p className="text-ivory-muted text-sm">Hakuna wanafunzi bado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
