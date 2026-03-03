import React from "react";
import { supabase } from "@/lib/supabase";
import { useHousehold } from "@/app/HouseholdProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ENV } from "@/lib/env";

async function createHousehold(name: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id || !u.user?.email) throw new Error("No user session");

  // Create household
  const { data: hh, error: herr } = await supabase
    .from("households")
    .insert({ name, created_by: u.user.id })
    .select()
    .single();
  if (herr) throw herr;

  // Create owner membership
  const { error: merr } = await supabase.from("household_members").insert({
    household_id: hh.id,
    user_id: u.user.id,
    email: u.user.email,
    role: "owner",
    status: "active",
  });
  if (merr) throw merr;

  return hh.id as string;
}

async function inviteMember(householdId: string, email: string) {
  if (!ENV.INVITE_FUNCTION_URL) {
    throw new Error("Missing VITE_INVITE_FUNCTION_URL (Edge Function URL).");
  }

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("No auth token");

  const res = await fetch(ENV.INVITE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ household_id: householdId, email }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Invite failed");
  }
}

export function AccountPage() {
  const { householdId, memberRole, memberEmail, loading, refetch } = useHousehold();
  const [householdName, setHouseholdName] = React.useState("...");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function onCreate() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await createHousehold(householdName.trim());
      await refetch();
      setMsg("Household kreiran. Sad možeš da pozoveš novog korisnika.");
    } catch (e: any) {
      setErr(e?.message ?? "Greška.");
    } finally {
      setBusy(false);
    }
  }

  async function onInvite() {
    if (!householdId) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await inviteMember(householdId, inviteEmail.trim());
      setMsg("Poziv poslat. Kad klikne magic link, biće spojena na household.");
      setInviteEmail("");
    } catch (e: any) {
      setErr(e?.message ?? "Greška.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.hash = "#/login";
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Nalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {loading ? (
            <div className="text-neutral-500">Učitavanje…</div>
          ) : (
            <>
              <div>
                <span className="text-neutral-500">Email:</span> {memberEmail ?? "—"}
              </div>
              <div>
                <span className="text-neutral-500">Uloga:</span> {memberRole ?? "—"}
              </div>
              <div>
                <span className="text-neutral-500">Household:</span> {householdId ?? "nije podešen"}
              </div>
            </>
          )}
          <div className="pt-2">
            <Button variant="secondary" onClick={logout}>
              Odjavi se
            </Button>
          </div>
        </CardContent>
      </Card>

      {!householdId && (
        <Card>
          <CardHeader>
            <CardTitle>Setup household</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-neutral-600">
              Da bi sync radio između vas , napravimo jedan household koji delite.
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Naziv</label>
              <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            {msg && <div className="text-sm text-emerald-700">{msg}</div>}
            <Button onClick={onCreate} disabled={busy || !householdName.trim()}>
              {busy ? "Radim…" : "Kreiraj household"}
            </Button>
          </CardContent>
        </Card>
      )}

      {householdId && memberRole === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle>Pozovi novog korisnika u tvoj household</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-neutral-600">
              Unesi email. Poslaćemo invite + magic link.
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-600">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="sandra@gmail.com"
              />
            </div>
            <div className="text-xs text-neutral-500">
              Napomena: da bi ovo radilo, moraš da deployuješ Edge Function i upišeš
              <span className="font-mono"> VITE_INVITE_FUNCTION_URL</span>.
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}
            {msg && <div className="text-sm text-emerald-700">{msg}</div>}

            <Button onClick={onInvite} disabled={busy || !inviteEmail.trim()}>
              {busy ? "Šaljem…" : "Pošalji poziv"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
