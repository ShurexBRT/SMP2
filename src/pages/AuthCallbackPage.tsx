import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthProvider';
import { AuthFrame } from '@/components/layout/AuthFrame';
import { Loading } from '@/components/ui/Feedback';

export function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && session) nav('/plan', { replace: true });
  }, [session, loading, nav]);
  return (
    <AuthFrame title="Potvrda naloga" subtitle="Još jedan korak do vaše zajedničke kuhinje.">
      {loading ? (
        <Loading label="Proveravam potvrdu…" />
      ) : (
        <div className="form-stack">
          <p className="muted">
            Ako ste potvrdili email, prijavite se da nastavite. Link koji je istekao ili otvoren u
            drugom browseru možda neće automatski otvoriti sesiju.
          </p>
          <Link className="button button-primary" to="/login">
            Idi na prijavu
          </Link>
        </div>
      )}
    </AuthFrame>
  );
}
