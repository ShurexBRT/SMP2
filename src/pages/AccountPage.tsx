import React from "react";
import { supabase } from "@/lib/supabase";
import { useHousehold } from "@/app/HouseholdProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

async function createHousehold(name: string) {
  const householdName = name.trim();
  if (!householdName) throw new Error("Naziv household-a je obavezan");

  const { data, error } = await (supabase as any).rpc("create_household", {
    household_name: householdName,
  });

  if (error) throw error;
  return data as string;
}

async function inviteMember(householdId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Email je obavezan");

  const { error } = await supabase.from("household_members").insert({
    household_id: householdId,
    user_id: null,
    email: normalized,
    role: "member",
    status: "invited",
  });

  if (error) throw error;
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
      await createHousehold(householdName);
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
      await inviteMember(householdId, inviteEmail);
      await refetch();
      setMsg("Poziv upisan. Ako nalog već postoji, članstvo se povezuje odmah; u suprotnom se povezuje čim se korisnik registruje.");
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
              <div><span className="text-neutral-500">Email:</span> {memberEmail ?? "—"}</div>
              <div><span className="text-neutral-500">Uloga:</span> {memberRole ?? "—"}</div>
              <div><span className="text-neutral-500">Household:</span> {householdId ?? "nije podešen"}</div>
            </>
          )}
          <div className="pt-2">
            <Button variant="secondary" onClick={logout}>Odjavi se</Button>
          </div>
        </CardContent>
      </Card>

      {!householdId && (
        <Card>
          <CardHeader><CardTitle>Setup household</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-neutral-600">Da bi sync radio između vas, napravimo jedan household koji delite.</div>
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
          <CardHeader><CardTitle>Pozovi novog korisnika u household</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-neutral-600">
              Unesi email osobe koju želiš u household. Ako nalog već postoji, povezivanje se radi odmah; ako ne postoji, povezivanje se završava pri registraciji.
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

            {err && <div className="text-sm text-red-600">{err}</div>}
            {msg && <div className="text-sm text-emerald-700">{msg}</div>}

            <Button onClick={onInvite} disabled={busy || !inviteEmail.trim()}>
              {busy ? "Upisujem…" : "Dodaj člana"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
