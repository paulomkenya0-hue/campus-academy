import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { NavBar } from "../components/NavBar.jsx";

export default function CompetitionView() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const [competition, setCompetition] = useState(null);
  const [participant, setParticipant] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    async function load() {
      const compSnap = await getDocs(query(collection(db, "competitions"), where("courseId", "==", courseId)));
      if (compSnap.empty) return;
      const comp = { id: compSnap.docs[0].id, ...compSnap.docs[0].data() };
      setCompetition(comp);

      if (profile) {
        const partSnap = await getDoc(doc(db, "competitionParticipants", `${comp.id}_${profile.id}`));
        setParticipant(partSnap.exists() ? partSnap.data() : null);
      }

      if (comp.status === "completed") {
        const resultsSnap = await getDocs(query(collection(db, "competitionResults"), where("competitionId", "==", comp.id)));
        const list = resultsSnap.docs.map((d) => d.data()).sort((a, b) => a.place - b.place);
        setResults(list);
      }
    }
    load();
  }, [courseId, profile]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <h1 className="text-2xl font-bold">🏅 Mashindano</h1>

        {!competition && <p className="text-ivory-muted">Hakuna mashindano yaliyowekwa kwa kozi hii bado.</p>}

        {competition && (
          <>
            <div className="card">
              <p className="font-display font-bold">{competition.title}</p>
              <p className="text-sm text-ivory-muted mt-1">
                Hali: {{
                  open: "Bado wazi — wanafunzi wanaendelea kujifunza",
                  qualified: "Wanaostahili wamechaguliwa",
                  completed: "Imekamilika",
                }[competition.status] || competition.status}
              </p>
            </div>

            {participant ? (
              <div className="card border-amber">
                <p className="text-teal font-bold">🎉 Umefuzu kwa mashindano ya mwisho!</p>
                <p className="text-sm text-ivory-muted mt-1">Nafasi ya kufuzu: #{participant.qualifyingRank}</p>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                  <div><p className="text-ivory-muted">Quiz</p><p className="font-bold">{participant.breakdown?.quizPct}%</p></div>
                  <div><p className="text-ivory-muted">Labs</p><p className="font-bold">{participant.breakdown?.labsPct}%</p></div>
                  <div><p className="text-ivory-muted">Mtihani wa Mwisho</p><p className="font-bold">{participant.breakdown?.finalPct}%</p></div>
                </div>
              </div>
            ) : (
              competition.status !== "open" && (
                <p className="text-ivory-muted text-sm">Hukufuzu kwa mashindano ya mwisho ya kozi hii.</p>
              )
            )}

            {results.length > 0 && (
              <div>
                <h2 className="font-display font-bold mb-3">Matokeo ya Mwisho</h2>
                <div className="space-y-2">
                  {results.map((r) => (
                    <div key={r.studentId} className={`card flex items-center gap-3 ${profile?.id === r.studentId ? "border-amber" : ""}`}>
                      <span className="text-2xl">{r.medal || `#${r.place}`}</span>
                      <span className="font-bold flex-1">{r.displayName}</span>
                      <span className="font-mono text-teal">{r.totalScore} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
