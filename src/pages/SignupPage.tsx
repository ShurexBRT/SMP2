import React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

function getAuthCallbackRedirectTo(): string {
  return `${window.location.origin}${window.location.pathname}#/auth/callback`;
}

export function SignupPage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: getAuthCallbackRedirectTo() },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Greška pri slanju linka.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="text-sm text-neutral-500">Smart Meal Planner</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Registracija</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Unesi email i dobićeš magic link. Posle toga te vodimo na podešavanje.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{sent ? "Link poslat" : "Napravi nalog"}</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-3 text-sm text-neutral-700">
                <div>Proveri email i klikni na link. Posle toga te vodimo dalje.</div>
                <div className="text-xs text-neutral-500">
                  Ako ne stigne odmah — sačekaj malo. Nemoj spam (rate limit).
                </div>
              </div>
            ) : (
              <form onSubmit={sendLink} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-neutral-600">Email</label>
                  <Input
                    type="email"
                    required
                    placeholder="npr. sandra@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && <div className="text-sm text-red-600">{error}</div>}

                <Button type="submit" disabled={loading || !email}>
                  {loading ? "Šaljem…" : "Pošalji magic link"}
                </Button>

                <div className="text-xs text-neutral-500">
                  Već imaš nalog?{" "}
                  <Link className="underline" to="/login">
                    Uloguj se
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}