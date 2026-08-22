import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function ProtectedRoute({ children, requireRole }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ivory-muted">
        Inapakia...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
  if (requireRole && !allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return children;
}
