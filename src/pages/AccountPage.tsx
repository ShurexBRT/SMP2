import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UsersRound, Plus, Mail, LogOut, Sun, Moon, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/app/HouseholdProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorNotice, Loading } from '@/components/ui/Feedback';
import { getTheme, setTheme } from '@/lib/theme';
import { PwaInstallCard } from '@/components/ui/PwaInstallCard';

export function AccountPage() {
  const { householdId, memberRole, memberEmail, refetch } = useHousehold();
  const nav = useNavigate(),
    qc = useQueryClient();
  const [householdName, setHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [theme, changeTheme] = useState(getTheme);
  const info = useQuery({
    queryKey: ['householdInfo', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const [household, members] = await Promise.all([
        supabase.from('households').select('name').eq('id', householdId!).single(),
        supabase
          .from('household_members')
          .select('id, email, role, status')
          .eq('household_id', householdId!),
      ]);
      if (household.error) throw household.error;
      if (members.error) throw members.error;
      return { name: household.data.name, members: members.data ?? [] };
    },
  });
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.rpc('create_household', {
        household_name: householdName.trim(),
      });
      if (error) throw error;
      await refetch();
      setMessage('Domaćinstvo je kreirano. Sada možete da počnete sa planiranjem.');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage('');
    try {
      const normalized = inviteEmail.trim().toLowerCase();
      if (normalized === memberEmail?.toLowerCase())
        throw new Error('Već ste član ovog domaćinstva.');
      if (info.data?.members.some((x) => x.email.toLowerCase() === normalized))
        throw new Error('Ova osoba već ima članstvo ili pozivnicu.');
      const { error } = await supabase.from('household_members').insert({
        household_id: householdId!,
        email: normalized,
        role: 'member',
        status: 'invited',
        user_id: null,
      });
      if (error) throw error;
      setMessage(
        'Pozivnica je upisana. Osoba treba da se prijavi ili registruje ovom email adresom. Aplikacija ne šalje email pozivnicu.'
      );
      setInviteEmail('');
      await info.refetch();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      qc.clear();
      nav('/login', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Nalog i domaćinstvo</h1>
          <p>Vaša zajednička kuhinja, vaša podešavanja.</p>
        </div>
      </div>
      <ErrorNotice error={error} />
      {message && (
        <div className="notice my-5" role="status">
          {message}
        </div>
      )}
      <div className="account-grid">
        <div className="page-stack">
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <UserRound size={19} />
                Vaš nalog
              </h2>
            </div>
            <div className="account-row">
              <span className="muted">Email</span>
              <span>{memberEmail}</span>
            </div>
            <div className="account-row">
              <span className="muted">Uloga</span>
              <span className="badge">
                {memberRole === 'owner'
                  ? 'Vlasnik'
                  : memberRole === 'member'
                    ? 'Član'
                    : 'Bez domaćinstva'}
              </span>
            </div>
            <Button
              variant="secondary"
              className="mt-5"
              onClick={() => void logout()}
              disabled={busy}
            >
              <LogOut size={16} />
              Odjavi se
            </Button>
          </section>
          <section className="panel form-stack">
            <h2 className="text-base">Izgled aplikacije</h2>
            <div className="theme-options">
              {(
                [
                  { key: 'light', label: 'Svetlo', icon: Sun },
                  { key: 'dark', label: 'Tamno', icon: Moon },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className="flex items-center gap-2"
                  aria-pressed={theme === key}
                  onClick={() => {
                    setTheme(key);
                    changeTheme(key);
                  }}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>
          </section>
          <PwaInstallCard />
        </div>
        <section className="panel form-stack">
          <div className="panel-heading">
            <h2>
              <UsersRound size={20} />
              {info.data?.name ?? 'Vaše domaćinstvo'}
            </h2>
          </div>
          {!householdId ? (
            <form className="form-stack" onSubmit={create}>
              <p className="muted">
                Napravite jedno domaćinstvo za zajednički plan, recepte i zalihe. Ako imate
                pozivnicu, koristite email adresu na koju je upisana.
              </p>
              <label>
                Naziv domaćinstva
                <Input
                  required
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="npr. Naša kuhinja"
                  maxLength={80}
                />
              </label>
              <Button type="submit" disabled={busy || !householdName.trim()}>
                <Plus size={16} />
                {busy ? 'Pravim…' : 'Napravi domaćinstvo'}
              </Button>
              <Button variant="ghost" type="button" disabled={busy} onClick={() => void refetch()}>
                Proveri pozivnicu
              </Button>
            </form>
          ) : (
            <>
              <ErrorNotice error={info.error} retry={() => void info.refetch()} />
              {info.isLoading && <Loading />}
              {info.data?.members.map((member) => (
                <div className="account-row" key={member.id}>
                  <div className="min-w-0">
                    <p className="break-all">{member.email}</p>
                    <small className="muted">{member.role === 'owner' ? 'Vlasnik' : 'Član'}</small>
                  </div>
                  <span className="badge">{member.status === 'active' ? 'Aktivan' : 'Pozvan'}</span>
                </div>
              ))}
              {memberRole === 'owner' && (
                <form className="form-stack pt-3" onSubmit={invite}>
                  <label>
                    Email novog člana
                    <Input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="ime@primer.rs"
                    />
                  </label>
                  <Button
                    type="submit"
                    disabled={busy || !inviteEmail.trim() || info.isLoading || !!info.error}
                  >
                    <Mail size={16} />
                    {busy ? 'Upisujem…' : 'Dodaj člana'}
                  </Button>
                  <p className="muted text-xs">
                    Posle registracije i potvrde ove email adrese, članstvo se povezuje pri prijavi.
                    Aplikacija ne šalje email pozivnicu.
                  </p>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
