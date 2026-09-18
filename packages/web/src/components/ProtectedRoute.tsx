import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { username, loading } = useAuth();

  if (loading) {
    return <p className="loading">Chargement...</p>;
  }
  if (!username) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
