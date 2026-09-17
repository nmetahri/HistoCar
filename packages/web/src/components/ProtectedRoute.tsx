import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { username, chargement } = useAuth();

  if (chargement) {
    return <p className="chargement">Chargement...</p>;
  }
  if (!username) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
