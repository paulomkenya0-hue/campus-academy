import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection, doc, addDoc, updateDoc, getDocs, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function CourseBuilder() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");

  async function loadCourses() {
    const snap = await getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc")));
    setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  useEffect(() => { loadCourses(); }, []);

  async function loadStages(courseId) {
    const snap = await getDocs(query(collection(db, "courses", courseId, "stages"), orderBy("order")));
    setStages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  async function loadTopics(courseId, stageId) {
    const snap = await getDocs(query(collection(db, "courses", courseId, "stages", stageId, "topics"), orderBy("order")));
    setTopics(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }
  async function loadQuestions(courseId, stageId, topicId) {
    const snap = await getDocs(collection(db, "courses", courseId, "stages", stageId, "topics", topicId, "questions"));
    setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  async function safe(fn) {
    setError("");
    try { await fn(); }
    catch (err) { setError(err.message || "Samahani, kuna tatizo."); }
  }

  async function handlePublish(path, published) {
    await safe(async () => {
      await updateDoc(doc(db, path), { published, status: published ? "published" : "draft", updatedAt: serverTimestamp() });
      if (selectedTopic) await loadQuestions(selectedCourse.id, selectedStage.id, selectedTopic.id);
      else if (selectedStage) await loadTopics(selectedCourse.id, selectedStage.id);
      else if (selectedCourse) await loadStages(selectedCourse.id);
      else await loadCourses();
    });
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-night-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/admin" className="font-display font-bold text-amber">← Admin</Link>
          <span className="text-sm text-ivory-muted">Usimamizi wa Kozi</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && <p className="text-danger text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <h2 className="font-display font-bold">Kozi</h2>
            <NewCourseForm onCreated={loadCourses} safe={safe} />
            {courses.map((c) => (
              <div key={c.id}
                onClick={() => { setSelectedCourse(c); setSelectedStage(null); setSelectedTopic(null); loadStages(c.id); }}
                className={`card cursor-pointer ${selectedCourse?.id === c.id ? "border-teal" : ""}`}>
                <p className="font-bold text-sm">{c.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${c.published ? "text-teal" : "text-amber"}`}>{c.published ? "Imechapishwa" : "Rasimu"}</span>
                  <button onClick={(e) => { e.stopPropagation(); handlePublish(`courses/${c.id}`, !c.published); }} className="text-xs text-ivory-muted hover:text-teal">
                    {c.published ? "Ficha" : "Chapisha"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-bold">Hatua (Stages)</h2>
            {selectedCourse ? (
              <>
                <NewStageForm courseId={selectedCourse.id} onCreated={() => loadStages(selectedCourse.id)} safe={safe} nextOrder={stages.length} />
                {stages.map((s) => (
                  <div key={s.id}
                    onClick={() => { setSelectedStage(s); setSelectedTopic(null); loadTopics(selectedCourse.id, s.id); }}
                    className={`card cursor-pointer ${selectedStage?.id === s.id ? "border-teal" : ""}`}>
                    <p className="font-bold text-sm">{s.order}. {s.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${s.published ? "text-teal" : "text-amber"}`}>{s.published ? "Imechapishwa" : "Rasimu"}</span>
                      <button onClick={(e) => { e.stopPropagation(); handlePublish(`courses/${selectedCourse.id}/stages/${s.id}`, !s.published); }} className="text-xs text-ivory-muted hover:text-teal">
                        {s.published ? "Ficha" : "Chapisha"}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : <p className="text-ivory-muted text-sm">Chagua kozi kwanza.</p>}
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-bold">Mada na Maswali</h2>
            {selectedStage ? (
              <>
                <NewTopicForm courseId={selectedCourse.id} stageId={selectedStage.id} onCreated={() => loadTopics(selectedCourse.id, selectedStage.id)} safe={safe} nextOrder={topics.length} />
                {topics.map((t) => (
                  <div key={t.id} className="card">
                    <div onClick={() => { setSelectedTopic(t); loadQuestions(selectedCourse.id, selectedStage.id, t.id); }} className="cursor-pointer">
                      <p className="font-bold text-sm">{t.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs ${t.published ? "text-teal" : "text-amber"}`}>{t.published ? "Imechapishwa" : "Rasimu"}</span>
                        <button onClick={(e) => { e.stopPropagation(); handlePublish(`courses/${selectedCourse.id}/stages/${selectedStage.id}/topics/${t.id}`, !t.published); }} className="text-xs text-ivory-muted hover:text-teal">
                          {t.published ? "Ficha" : "Chapisha"}
                        </button>
                      </div>
                    </div>
                    {selectedTopic?.id === t.id && (
                      <div className="mt-3 pt-3 border-t border-night-border space-y-2">
                        <AssessmentToggles courseId={selectedCourse.id} stageId={selectedStage.id} topic={t} safe={safe}
                          onUpdated={() => loadTopics(selectedCourse.id, selectedStage.id)} />
                        <NewQuestionForm courseId={selectedCourse.id} stageId={selectedStage.id} topicId={t.id}
                          onCreated={() => loadQuestions(selectedCourse.id, selectedStage.id, t.id)} safe={safe} />
                        {questions.map((q) => (
                          <div key={q.id} className="text-xs bg-night-raised rounded p-2">
                            <div className="flex items-center justify-between">
                              <p className="flex-1">{q.text}</p>
                              <button
                                onClick={() => handlePublish(`courses/${selectedCourse.id}/stages/${selectedStage.id}/topics/${t.id}/questions/${q.id}`, !q.published)}
                                className={`ml-2 shrink-0 ${q.published ? "text-teal" : "text-amber"}`}>
                                {q.published ? "✓ Chapishwa" : "Chapisha"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : <p className="text-ivory-muted text-sm">Chagua stage kwanza.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewCourseForm({ onCreated, safe }) {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  async function submit() {
    if (!title.trim()) return;
    await safe(async () => {
      await addDoc(collection(db, "courses"), {
        title: title.trim(), description: "", published: false, status: "draft", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setTitle(""); setOpen(false); onCreated();
    });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="btn-secondary w-full text-sm">+ Kozi Mpya</button>;
  return (
    <div className="card space-y-2">
      <input className="input-field text-sm" placeholder="Jina la kozi" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={submit} className="btn-primary text-sm w-full">Hifadhi</button>
    </div>
  );
}

function NewStageForm({ courseId, onCreated, safe, nextOrder }) {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  async function submit() {
    if (!title.trim()) return;
    await safe(async () => {
      await addDoc(collection(db, "courses", courseId, "stages"), {
        title: title.trim(), description: "", order: nextOrder + 1,
        unlockRule: { type: "previous_stage_completed" }, published: false, status: "draft",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setTitle(""); setOpen(false); onCreated();
    });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="btn-secondary w-full text-sm">+ Stage Mpya</button>;
  return (
    <div className="card space-y-2">
      <input className="input-field text-sm" placeholder="Jina la stage" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={submit} className="btn-primary text-sm w-full">Hifadhi</button>
    </div>
  );
}

function NewTopicForm({ courseId, stageId, onCreated, safe, nextOrder }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  async function submit() {
    if (!title.trim() || !content.trim()) return;
    await safe(async () => {
      await addDoc(collection(db, "courses", courseId, "stages", stageId, "topics"), {
        title: title.trim(), content, order: nextOrder + 1, published: false, status: "draft",
        assessmentMode: false, isFinalAssessment: false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setTitle(""); setContent(""); setOpen(false); onCreated();
    });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="btn-secondary w-full text-sm">+ Mada Mpya</button>;
  return (
    <div className="card space-y-2">
      <input className="input-field text-sm" placeholder="Jina la mada" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input-field text-sm min-h-[100px]" placeholder="Maudhui ya somo (Kiswahili)" value={content} onChange={(e) => setContent(e.target.value)} />
      <button onClick={submit} className="btn-primary text-sm w-full">Hifadhi</button>
    </div>
  );
}

function AssessmentToggles({ courseId, stageId, topic, safe, onUpdated }) {
  const [timeLimit, setTimeLimit] = useState(topic.timeLimitSeconds || 600);
  async function toggleFinal() {
    await safe(async () => {
      await updateDoc(doc(db, "courses", courseId, "stages", stageId, "topics", topic.id), {
        isFinalAssessment: !topic.isFinalAssessment, updatedAt: serverTimestamp(),
      });
      onUpdated();
    });
  }
  async function toggleAssessmentMode() {
    await safe(async () => {
      await updateDoc(doc(db, "courses", courseId, "stages", stageId, "topics", topic.id), {
        assessmentMode: !topic.assessmentMode, timeLimitSeconds: Number(timeLimit), updatedAt: serverTimestamp(),
      });
      onUpdated();
    });
  }
  return (
    <div className="bg-night-raised rounded p-2 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span>🏁 Mtihani wa Mwisho wa Kozi</span>
        <button onClick={toggleFinal} className={topic.isFinalAssessment ? "text-teal" : "text-ivory-muted"}>
          {topic.isFinalAssessment ? "✓ Umewekwa" : "Weka"}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>⏱️ Hali ya Mtihani</span>
        <div className="flex items-center gap-2">
          <input type="number" className="input-field text-xs py-1 w-16" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
          <button onClick={toggleAssessmentMode} className={topic.assessmentMode ? "text-teal" : "text-ivory-muted"}>
            {topic.assessmentMode ? "✓ Imewashwa" : "Washa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewQuestionForm({ courseId, stageId, topicId, onCreated, safe }) {
  const [form, setForm] = useState({ text: "", answerA: "", answerB: "", answerC: "", answerD: "", correctAnswer: "A", explanation: "" });
  const [open, setOpen] = useState(false);
  function set(k, v) { setForm({ ...form, [k]: v }); }
  async function submit() {
    if (!form.text || !form.answerA || !form.answerB || !form.answerC || !form.answerD) return;
    await safe(async () => {
      await addDoc(collection(db, "courses", courseId, "stages", stageId, "topics", topicId, "questions"), {
        ...form, difficulty: "medium", xpReward: null, status: "draft", published: false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setForm({ text: "", answerA: "", answerB: "", answerC: "", answerD: "", correctAnswer: "A", explanation: "" });
      setOpen(false); onCreated();
    });
  }
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-teal hover:underline">+ Ongeza Swali</button>;
  return (
    <div className="bg-night-raised rounded p-2 space-y-1.5 text-xs">
      <input className="input-field text-xs py-1.5" placeholder="Swali" value={form.text} onChange={(e) => set("text", e.target.value)} />
      {["A", "B", "C", "D"].map((k) => (
        <input key={k} className="input-field text-xs py-1.5" placeholder={`Jibu ${k}`} value={form[`answer${k}`]} onChange={(e) => set(`answer${k}`, e.target.value)} />
      ))}
      <select className="input-field text-xs py-1.5" value={form.correctAnswer} onChange={(e) => set("correctAnswer", e.target.value)}>
        {["A", "B", "C", "D"].map((k) => <option key={k} value={k}>Sahihi: {k}</option>)}
      </select>
      <input className="input-field text-xs py-1.5" placeholder="Maelezo (hiari)" value={form.explanation} onChange={(e) => set("explanation", e.target.value)} />
      <button onClick={submit} className="btn-primary text-xs w-full py-1.5">Hifadhi Swali</button>
    </div>
  );
}
