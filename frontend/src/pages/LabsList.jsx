import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link, useParams } from "react-router-dom";
import { db } from "../firebase";
import { NavBar } from "../components/NavBar.jsx";

export default function LabsList() {
  const { courseId } = useParams();
  const [labs, setLabs] = useState([]);
  const [solvedIds, setSolvedIds] = useState(new Set());

  useEffect(() => {
    async function load() {
      const q = query(collection(db, "labs"), where("courseId", "==", courseId), where("published", "==", true));
      const snap = await getDocs(q);
      setLabs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    load();
  }, [courseId]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Mazoezi ya Vitendo (Labs)</h1>
        <p className="text-ivory-muted mb-6">Tafuta flag iliyofichwa kwenye kila mazingira ya mafunzo.</p>

        <div className="space-y-3">
          {labs.map((lab) => (
            <Link key={lab.id} to={`/course/${courseId}/lab/${lab.id}`} className="card flex items-center justify-between hover:border-teal transition-colors">
              <div>
                <p className="font-display font-bold">🚩 {lab.title}</p>
                <p className="text-sm text-ivory-muted mt-1">{lab.description}</p>
              </div>
              <span className="text-xs bg-night-raised px-2 py-1 rounded-full capitalize">{lab.difficulty}</span>
            </Link>
          ))}
          {labs.length === 0 && <p className="text-ivory-muted">Hakuna labs bado kwa kozi hii.</p>}
        </div>
      </div>
    </div>
  );
}
