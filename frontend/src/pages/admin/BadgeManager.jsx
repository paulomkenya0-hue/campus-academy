import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";

const DEFAULT_BADGES = [
  { key: "streak-7", name: "7 Day Warrior", icon: "🔥", description: "Fikia mfululizo wa siku 7", criteria: { type: "streak_days", days: 7 } },
  { key: "perfect-score", name: "Perfect Score", icon: "🏆", description: "Pata 100% kwenye quiz", criteria: { type: "perfect_score" } },
  { key: "security-rookie", name: "Security Rookie", icon: "🛡️", description: "Kamilisha stage ya kwanza", criteria: { type: "first_stage_complete" } },
  { key: "fast-learner", name: "Fast Learner", icon: "⚡", description: "Maliza quiz ndani ya sekunde 60", criteria: { type: "fast_quiz", underSeconds: 60 } },
];

export default function BadgeManager() {
  const [badges, setBadges] = useState([]);
  const [form, setForm] = useState({ key: "", name: "", icon: "🏅", description: "", criteriaType: "streak_days", days: 7, underSeconds: 60, courseId: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const snap = await getDocs(collection(db, "badges"));
    setBadges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  useEffect(() => { load(); }, []);

  async function createDefaults() {
    setSaving(true);
    setError("");
    try {
      const fn = httpsCallable(functions, "createBadge");
      for (const b of DEFAULT_BADGES) {
        await fn(b);
      }
      await load();
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo.");
    } finally {
      setSaving(false);
    }
  }

  function criteriaFromForm() {
    if (form.criteriaType === "streak_days") return { type: "streak_days", days: Number(form.days) };
    if (form.criteriaType === "fast_quiz") return { type: "fast_quiz", underSeconds: Number(form.underSeconds) };
    if (form.criteriaType === "course_complete") return { type: "course_complete", courseId: form.courseId };
    return { type: form.criteriaType };
  }

  async function handleCreate() {
    if (!form.key || !form.name) return;
    setSaving(true);
    setError("");
    try {
      const fn = httpsCallable(functions, "createBadge");
      await fn({ key: form.key, name: form.name, icon: form.icon, description: form.description, criteria: criteriaFromForm() });
      setForm({ ...form, key: "", name: "", description: "" });
      await load();
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Beji (Badges)</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {badges.length === 0 && (
          <div className="card">
            <p className="text-sm text-ivory-muted mb-3">Hakuna beji bado. Unaweza kuanza na mfano wa msingi:</p>
            <button onClick={createDefaults} disabled={saving} className="btn-secondary text-sm">
              {saving ? "Inaunda..." : "Unda Beji za Mfano (4)"}
            </button>
          </div>
        )}

        <div className="card space-y-3">
          <h2 className="font-display font-bold">Ongeza Beji Mpya</h2>
          <div className="grid grid-cols-2 gap-2">
            <input className="input-field text-sm" placeholder="key (mfano: night-owl)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            <input className="input-field text-sm" placeholder="Emoji" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </div>
          <input className="input-field text-sm" placeholder="Jina la Beji" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-field text-sm" placeholder="Maelezo" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input-field text-sm" value={form.criteriaType} onChange={(e) => setForm({ ...form, criteriaType: e.target.value })}>
            <option value="streak_days">Mfululizo wa siku (streak_days)</option>
            <option value="perfect_score">Alama kamili (perfect_score)</option>
            <option value="first_stage_complete">Stage ya kwanza kukamilika</option>
            <option value="fast_quiz">Quiz ya haraka (fast_quiz)</option>
            <option value="course_complete">Kozi nzima kukamilika</option>
          </select>
          {form.criteriaType === "streak_days" && (
            <input type="number" className="input-field text-sm" placeholder="Siku ngapi" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          )}
          {form.criteriaType === "fast_quiz" && (
            <input type="number" className="input-field text-sm" placeholder="Sekunde ngapi" value={form.underSeconds} onChange={(e) => setForm({ ...form, underSeconds: e.target.value })} />
          )}
          {form.criteriaType === "course_complete" && (
            <input className="input-field text-sm" placeholder="Course ID" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} />
          )}
          <button onClick={handleCreate} disabled={saving} className="btn-primary text-sm">Hifadhi Beji</button>
          {error && <p className="text-danger text-sm">{error}</p>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badges.map((b) => (
            <div key={b.id} className="card text-center">
              <p className="text-3xl mb-1">{b.icon}</p>
              <p className="font-bold text-sm">{b.name}</p>
              <p className="text-xs text-ivory-muted mt-1">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
