import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function AuthCallbackPage() {
  const nav = useNavigate();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function finishAuth() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const session = data.session;
        if (!session) {
          nav("/login", { replace: true });
          return;
        }

        const { data: membership, error: membershipError } = await supabase
          .from("household_members")
          .select("household_id,status")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!alive) return;

        nav(membership?.household_id ? "/plan" : "/account", { replace: true });
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Nešto je puklo pri potvrdi naloga.");
      }
    }

    finishAuth();
    return () => {
      alive = false;
    };
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Potvrđujem nalog…</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Hvatamo sesiju i prosleđujemo te na pravi ekran.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
