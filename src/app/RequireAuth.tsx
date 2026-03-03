import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="text-sm text-neutral-500">Učitavanje…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
