import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/app/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactElement }) {
  const { session, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="rounded-2xl border bg-white p-6 shadow-sm text-sm text-neutral-700">
          Učitavam…
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  return children;
}