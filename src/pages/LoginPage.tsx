import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // vrati na stranicu koju je korisnik pokušao da otvori
      const from = (loc.state as any)?.from?.pathname ?? "/account";
      nav(from, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Nešto je puklo pri prijavi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="text-sm text-neutral-500">Smart Meal Planner</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Prijava</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Uloguj se mailom i lozinkom. Ako nemaš nalog, napravi ga klikom na link ispod.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Uloguj se</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-neutral-600">Email</label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="npr. peki@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-600">Lozinka</label>
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <Button type="submit" disabled={loading || !email || !password}>
                {loading ? "Ulogavam…" : "Uloguj se"}
              </Button>

              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>
                  Nemaš nalog?{" "}
                  <Link className="underline" to="/signup">
                    Napravi nalog
                  </Link>
                </span>

                {/* Stub za sad */}
                <span className="opacity-70">Zaboravljena lozinka (uskoro)</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}