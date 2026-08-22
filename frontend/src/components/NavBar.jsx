import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function NavBar() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav className="border-b border-night-border">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-display font-bold text-amber">Campus Academy</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-teal">Dashibodi</Link>
          <Link to="/leaderboard" className="hover:text-teal">Ubao wa Ushindi</Link>
          <Link to="/profile" className="hover:text-teal">Wasifu</Link>
          {profile && (
            <div className="flex items-center gap-2">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-night-raised flex items-center justify-center text-xs">
                  {profile.displayName?.[0] || "?"}
                </div>
              )}
            </div>
          )}
          <button onClick={handleLogout} className="text-ivory-muted hover:text-danger">Toka</button>
        </div>
      </div>
    </nav>
  );
}
