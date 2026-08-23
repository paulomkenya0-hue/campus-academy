import { useEffect, useState } from "react";
import {
  collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("studentId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(n) {
    if (n.read) return;
    await updateDoc(doc(db, "notifications", n.id), { read: true, readAt: new Date() });
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative text-ivory-muted hover:text-teal">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card z-20 shadow-xl">
          {announcements.length > 0 && (
            <div className="mb-3 pb-3 border-b border-night-border">
              <p className="text-xs text-amber font-bold mb-2">MATANGAZO</p>
              {announcements.map((a) => (
                <div key={a.id} className="mb-2 text-sm">
                  <p className="font-bold">{a.title}</p>
                  <p className="text-ivory-muted text-xs">{a.body}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-teal font-bold mb-2">TAARIFA ZAKO</p>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n)}
              className={`mb-2 text-sm cursor-pointer p-2 rounded-lg ${n.read ? "" : "bg-night-raised"}`}
            >
              <p className="font-bold">{n.title}</p>
              <p className="text-ivory-muted text-xs">{n.body}</p>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className="text-ivory-muted text-sm">Hakuna taarifa bado.</p>
          )}
        </div>
      )}
    </div>
  );
}
