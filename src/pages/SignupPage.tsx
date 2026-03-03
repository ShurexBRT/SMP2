import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function SignupPage() {
  const nav = useNavigate();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const eTrim = email.trim();

    if (password.length < 8) {
      setError("Lozinka mora imati bar 8 karaktera.");
      return;
    }
    if (password !== confirm) {
      setError("Lozinke se ne poklapaju.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: eTrim,
        password,
        options: {
          // za GH Pages + HashRouter, nek stoji i ovo (koristi se ako je Confirm email ON)
          emailRedirectTo: `${window.location.origin}${window.location.pathname}#/login`,
        },
      });

      if (error) throw error;

      // Ako je email confirmation ON, user obično nema session odmah.
      // Ako je OFF, session postoji i možemo da ga pošaljemo na account/onboarding.
      if (!data.session) {
        setInfo("Nalog je napravljen. Proveri email i potvrdi nalog, pa se uloguj.");
        return;
      }

      nav("/account", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Nešto je puklo pri registraciji.");
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
            Napravi nalog mailom i lozinkom.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Napravi nalog</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-neutral-600">Email</label>
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="npr. sandra@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-600">Lozinka</label>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="min 8 karaktera"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-neutral-600">Potvrdi lozinku</label>
                <Input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="ponovi lozinku"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}
              {info && <div className="text-sm text-green-700">{info}</div>}

              <Button type="submit" disabled={loading || !email || !password || !confirm}>
                {loading ? "Pravim nalog…" : "Napravi nalog"}
              </Button>

              <div className="text-xs text-neutral-500">
                Već imaš nalog?{" "}
                <Link className="underline" to="/login">
                  Uloguj se
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}