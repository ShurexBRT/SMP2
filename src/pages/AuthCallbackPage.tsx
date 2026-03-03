import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/AuthProvider";
import { useHousehold } from "@/app/HouseholdProvider";

export function AuthCallbackPage() {
  const nav = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { householdId, loading: hhLoading } = useHousehold();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function ensureSession() {
      try {
        // forces hydration from storage/url if needed
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Nešto je puklo pri prijavi.");
      }
    }

    ensureSession();
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (error) return;
    if (authLoading || hhLoading) return;

    if (!session) {
      nav("/login", { replace: true });
      return;
    }

    // Ako nema household => onboarding (ti možeš već imati AccountPage)
    nav(householdId ? "/plan" : "/account", { replace: true });
  }, [authLoading, hhLoading, session, householdId, nav, error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Prijavljujem te…</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Samo sekund da uhvatimo sesiju i prosledimo te dalje.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}