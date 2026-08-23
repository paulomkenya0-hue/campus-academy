import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase";

export default function LabManager() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [labs, setLabs] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", instructions: "", flag: "", xpReward: "", difficulty: "medium" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "courses"));
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, []);

  async function loadLabs(cid) {
    const snap = await getDocs(query(collection(db, "labs"), where("courseId", "==", cid)));
    setLabs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => { if (courseId) loadLabs(courseId); }, [courseId]);

  async function handleCreate() {
    if (!courseId || !form.title || !form.instructions || !form.flag) return;
    setSaving(true);
    setError("");
    try {
      const fn = httpsCallable(functions, "createLab");
      await fn({
        courseId,
        title: form.title,
        description: form.description,
        instructions: form.instructions,
        flag: form.flag,
        xpReward: form.xpReward ? Number(form.xpReward) : null,
        difficulty: form.difficulty,
      });
      setForm({ title: "", description: "", instructions: "", flag: "", xpReward: "", difficulty: "medium" });
      await loadLabs(courseId);
    } catch (err) {
      setError(err.message?.replace(/^.*?:\s*/, "") || "Samahani, kuna tatizo.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(lab) {
    const fn = httpsCallable(functions, "setLabPublished");
    await fn({ labId: lab.id, published: !lab.published });
    await loadLabs(courseId);
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Mazoezi ya Vitendo (Labs)</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <select className="input-field text-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">-- Chagua Kozi --</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        {courseId && (
          <>
            <div className="card space-y-2">
              <h2 className="font-display font-bold">Ongeza Lab Mpya</h2>
              <input className="input-field text-sm" placeholder="Jina la Lab" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input className="input-field text-sm" placeholder="Maelezo mafupi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <textarea className="input-field text-sm min-h-[100px]" placeholder="Maelekezo kamili" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
              <input className="input-field text-sm font-mono" placeholder="Flag sahihi (mfano: FLAG{example})" value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className="input-field text-sm" placeholder="XP (hiari, default kwenye config)" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: e.target.value })} />
                <select className="input-field text-sm" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  <option value="easy">Rahisi</option>
                  <option value="medium">Wastani</option>
                  <option value="hard">Ngumu</option>
                </select>
              </div>
              <button onClick={handleCreate} disabled={saving} className="btn-primary text-sm w-full">
                {saving ? "Inahifadhi..." : "Hifadhi Lab"}
              </button>
              {error && <p className="text-danger text-sm">{error}</p>}
              <p className="text-xs text-ivory-muted">Flag inahifadhiwa kama hash (SHA-256 + salt) — haionekani tena baada ya kuhifadhi.</p>
            </div>

            <div className="space-y-2">
              {labs.map((lab) => (
                <div key={lab.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">🚩 {lab.title}</p>
                    <p className="text-xs text-ivory-muted">{lab.difficulty}</p>
                  </div>
                  <button onClick={() => togglePublish(lab)} className={`text-xs ${lab.published ? "text-teal" : "text-amber"}`}>
                    {lab.published ? "✓ Chapishwa" : "Chapisha"}
                  </button>
                </div>
              ))}
              {labs.length === 0 && <p className="text-ivory-muted text-sm">Hakuna labs bado kwa kozi hii.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
