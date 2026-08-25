import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const STUDENT_LINKS = [
  { to: "/", label: "Dashibodi", icon: "🏠" },
  { to: "/my-courses", label: "Kozi Zangu", icon: "📚" },
  { to: "/leaderboard", label: "Ubao wa Ushindi", icon: "🏆" },
  { to: "/chat", label: "Mazungumzo", icon: "💬" },
  { to: "/certificates", label: "Vyeti", icon: "📜" },
  { to: "/profile", label: "Wasifu", icon: "⚙️" },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Dashibodi", icon: "🏠" },
  { to: "/admin/courses", label: "Kozi & Mada", icon: "📚" },
  { to: "/admin/badges", label: "Beji", icon: "🎖️" },
  { to: "/admin/announcements", label: "Matangazo", icon: "📣" },
  { to: "/admin/analytics", label: "Uchambuzi", icon: "📊" },
  { to: "/admin/certificates", label: "Vyeti", icon: "📄" },
  { to: "/admin/audit-logs", label: "Kumbukumbu", icon: "🗂️" },
];

export function Layout({ children }) {
  const { role, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const links = role === "student" ? STUDENT_LINKS : ADMIN_LINKS;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-ink text-white px-4 py-6">
        <div className="mb-8 px-2">
          <p className="font-display font-bold text-lg text-amber leading-tight">CAMPUS</p>
          <p className="font-display font-bold text-sm tracking-widest text-white/70">ACADEMY</p>
        </div>

        <nav className="flex-1 space-y-1">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                <span>{l.icon}</span>{l.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-white/10">
          <p className="text-sm font-semibold">{profile?.displayName || (role !== "student" ? "Super Admin" : "")}</p>
          <p className="text-xs text-white/50">{profile?.regNumber || (role !== "student" ? "Full system control" : "")}</p>
          <button onClick={handleLogout} className="mt-2 text-xs text-white/60 hover:text-danger">Toka</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
    }
