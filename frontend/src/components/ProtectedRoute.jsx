import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, mongoUser } = useAuthContext();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && mongoUser?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
