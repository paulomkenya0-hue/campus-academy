import { useEffect, useRef, useState } from "react";
import {
  collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";
import { NavBar } from "../components/NavBar.jsx";

const ROOMS = [
  { id: "general", label: "Majadiliano ya Jumla" },
  { id: "questions", label: "Maswali na Majibu" },
];

export default function Chat() {
  const { user, profile, role } = useAuth();
  const [roomId, setRoomId] = useState("general");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "chatRooms", roomId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        senderId: user.uid,
        senderName: profile?.displayName || "Mwanafunzi",
        senderPhotoURL: profile?.photoURL || null,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId) {
    await deleteDoc(doc(db, "chatRooms", roomId, "messages", messageId));
  }

  const isAdmin = role === "super_admin" || role === "developer";

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex-1 flex flex-col">
        <div className="flex gap-2 mb-4">
          {ROOMS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoomId(r.id)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                roomId === r.id ? "bg-amber text-night font-bold" : "bg-night-raised text-ivory-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex-1 card overflow-y-auto space-y-3 mb-4 min-h-[400px] max-h-[500px]">
          {messages.map((m) => (
            <div key={m.id} className="flex items-start gap-2 group">
              {m.senderPhotoURL ? (
                <img src={m.senderPhotoURL} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-night-raised flex items-center justify-center text-xs shrink-0">
                  {m.senderName?.[0] || "?"}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-bold">{m.senderName}</span>{" "}
                  <span className="text-ivory-muted">{m.text}</span>
                </p>
              </div>
              {(isAdmin || m.senderId === user.uid) && (
                <button
                  onClick={() => handleDelete(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-danger"
                >
                  Futa
                </button>
              )}
            </div>
          ))}
          {messages.length === 0 && <p className="text-ivory-muted text-sm">Hakuna ujumbe bado. Anza mazungumzo!</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="Andika ujumbe..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
          />
          <button type="submit" disabled={sending || !text.trim()} className="btn-primary">
            Tuma
          </button>
        </form>
      </div>
    </div>
  );
}
