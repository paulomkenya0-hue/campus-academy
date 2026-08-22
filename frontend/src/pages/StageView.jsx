import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { NavBar } from "../components/NavBar.jsx";

export default function StageView() {
  const { courseId, stageId } = useParams();
  const { profile } = useAuth();
  const [stage, setStage] = useState(null);
  const [topics, setTopics] = useState([]);
  const [completedTopics, setCompletedTopics] = useState({});

  useEffect(() => {
    async function load() {
      const stageSnap = await getDoc(doc(db, "courses", courseId, "stages", stageId));
      setStage(stageSnap.exists() ? { id: stageSnap.id, ...stageSnap.data() } : null);

      const q = query(
        collection(db, "courses", courseId, "stages", stageId, "topics"),
        where("published", "==", true),
        orderBy("order")
      );
      const topicsSnap = await getDocs(q);
      setTopics(topicsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      if (profile) {
        const progressSnap = await getDoc(doc(db, "progress", `${profile.id}_${courseId}_${stageId}`));
        setCompletedTopics(progressSnap.exists() ? progressSnap.data().completedTopics || {} : {});
      }
    }
    load();
  }, [courseId, stageId, profile]);

  if (!stage) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 py-8 text-ivory-muted">Inapakia...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">{stage.title}</h1>
        <p className="text-ivory-muted mb-6">{stage.description}</p>

        <div className="space-y-3">
          {topics.map((topic, i) => (
            <Link
              key={topic.id}
              to={`/course/${courseId}/stage/${stageId}/topic/${topic.id}`}
              className="card flex items-center justify-between hover:border-teal transition-colors"
            >
              <div>
                <p className="text-sm text-ivory-muted">Mada {i + 1}</p>
                <p className="font-display font-bold">{topic.title}</p>
              </div>
              <span className="text-xl">{completedTopics[topic.id] ? "✅" : "○"}</span>
            </Link>
          ))}
          {topics.length === 0 && <p className="text-ivory-muted">Hakuna mada bado.</p>}
        </div>
      </div>
    </div>
  );
}
