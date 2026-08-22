import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { NavBar } from "../components/NavBar.jsx";
import { Trail } from "../components/Trail.jsx";

export default function CourseView() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [stages, setStages] = useState([]);

  useEffect(() => {
    async function load() {
      const courseSnap = await getDoc(doc(db, "courses", courseId));
      setCourse(courseSnap.exists() ? { id: courseSnap.id, ...courseSnap.data() } : null);

      const q = query(
        collection(db, "courses", courseId, "stages"),
        where("published", "==", true),
        orderBy("order")
      );
      const stagesSnap = await getDocs(q);
      setStages(stagesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, [courseId]);

  if (!course || !profile) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 py-8 text-ivory-muted">Inapakia...</div>
      </div>
    );
  }

  // Stage 1 is always unlocked; others unlock via student.unlockedStages written
  // server-side by submitQuizAttempt.
  const unlockedStageIds = new Set(
    stages
      .filter((s, i) => i === 0 || profile.unlockedStages?.[`${courseId}_${s.id}`])
      .map((s) => s.id)
  );
  const completedStageIds = new Set(
    stages.filter((s) => profile.unlockedStages?.[`${courseId}_${s.id}_completed`]).map((s) => s.id)
  );

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">{course.title}</h1>
        <p className="text-ivory-muted mb-6">{course.description}</p>

        <div className="card">
          <Trail
            stages={stages}
            unlockedStageIds={unlockedStageIds}
            completedStageIds={completedStageIds}
            onSelect={(stage) => navigate(`/course/${courseId}/stage/${stage.id}`)}
          />
        </div>
      </div>
    </div>
  );
}
