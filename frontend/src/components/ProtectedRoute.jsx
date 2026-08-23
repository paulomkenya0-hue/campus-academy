import { Navigate, useLocation } from "react-router-dom";
import { useAuth, homeForRole } from "../context/AuthContext.jsx";

export function ProtectedRoute({ children, requireRole }) {
  const { user, role, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ivory-muted">
        Inapakia...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
  if (requireRole && !allowedRoles.includes(role)) {
    // Role isiyolingana — mpeleke kwenye ukurasa wake sahihi (siyo "/" kila wakati,
    // hilo ndilo lililokuwa linamfanya Admin apate mzunguko usio na mwisho).
    return <Navigate to={homeForRole(role)} replace />;
  }

  if (role === "student" && profile?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}
