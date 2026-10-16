import React from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

type AuthState = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = React.createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    let authEvent = false;
    let previousUser: string | undefined;
    const applySession = (s: Session | null) => {
      if (!mounted) return;
      if (previousUser !== s?.user.id) qc.clear();
      previousUser = s?.user.id;
      setSession(s);
      setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!authEvent) applySession(data.session ?? null);
      })
      .catch(() => {
        if (!authEvent) applySession(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      authEvent = true;
      applySession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return React.useContext(AuthContext);
}
