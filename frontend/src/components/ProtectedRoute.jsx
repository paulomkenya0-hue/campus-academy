import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function ProtectedRoute({ children, requireRole }) {
  const { user, role, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ivory-muted">Inapakia...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
  if (requireRole && !allowedRoles.includes(role)) {
    // Role haijulikani/haifanani — usimzunguke, mrudishe login moja kwa moja
    // ili aone ukurasa halisi badala ya loop isiyoisha.
    if (role === "super_admin" || role === "developer") return <Navigate to="/admin" replace />;
    if (role === "student") return <Navigate to="/" replace />;
    return <Navigate to="/login" replace />;
  }

  if (role === "student" && profile?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}
