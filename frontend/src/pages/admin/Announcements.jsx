import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";

export default function Announcements() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [past, setPast] = useState([]);

  async function load() {
    const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
    setPast(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  useEffect(() => { load(); }, []);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setError("");
    try {
      const fn = httpsCallable(functions, "createAnnouncement");
      await fn({ title, body });
      setTitle(""); setBody("");
      await load();
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Matangazo</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="card space-y-3">
          <h2 className="font-display font-bold">Tuma Tangazo Jipya</h2>
          <input className="input-field text-sm" placeholder="Kichwa cha habari" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input-field text-sm min-h-[100px]" placeholder="Ujumbe" value={body} onChange={(e) => setBody(e.target.value)} />
          <button onClick={handleSend} disabled={sending} className="btn-primary text-sm">
            {sending ? "Inatuma..." : "Tuma kwa Wanafunzi Wote"}
          </button>
          {error && <p className="text-danger text-sm">{error}</p>}
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-bold">Matangazo Yaliyopita</h2>
          {past.map((a) => (
            <div key={a.id} className="card">
              <p className="font-bold text-sm">{a.title}</p>
              <p className="text-ivory-muted text-sm">{a.body}</p>
            </div>
          ))}
          {past.length === 0 && <p className="text-ivory-muted text-sm">Hakuna matangazo bado.</p>}
        </div>
      </div>
    </div>
  );
}
