import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/AuthProvider';
import { Loading } from '@/components/ui/Feedback';
export function RequireAuth({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading label="Proveravam prijavu…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}
