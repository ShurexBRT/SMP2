import React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import type { HouseholdRole } from '@/lib/types';
import { mayClaimInvitation } from '@/features/household/invitation';

type Membership = {
  householdId: string | null;
  memberRole: HouseholdRole | null;
  memberEmail: string | null;
};
type HouseholdState = Membership & {
  loading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
};
const empty: Membership = { householdId: null, memberRole: null, memberEmail: null };
const HouseholdContext = React.createContext<HouseholdState>({
  ...empty,
  loading: true,
  error: null,
  refetch: async () => {},
});

async function fetchMembership(userId: string, email: string | undefined): Promise<Membership> {
  // Prefer linked membership; never infer authorization from email alone.
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(2);
  if (error) throw error;
  if ((data?.length ?? 0) > 1)
    throw new Error(
      'Nalog pripada više domaćinstava. Potrebno je proveriti članstvo pre nastavka.'
    );
  const member = data?.[0];
  if (member)
    return {
      householdId: member.household_id,
      memberRole: member.role,
      memberEmail: email ?? null,
    };
  // Compatibility for the existing email-invite flow. Verify identity on the server,
  // then claim only an unlinked invitation for that confirmed email, subject to RLS.
  const verified = await supabase.auth.getUser();
  if (verified.error) throw verified.error;
  const user = verified.data.user;
  if (!user || user.id !== userId) throw new Error('Prijava je promenjena. Osveži stranicu.');
  if (!user.email || !user.email_confirmed_at) return { ...empty, memberEmail: user.email ?? null };
  const invitations = await supabase
    .from('household_members')
    .select('id, household_id, email, role, status, user_id')
    .eq('email', user.email.toLowerCase())
    .eq('status', 'invited')
    .is('user_id', null)
    .limit(2);
  if (invitations.error) throw invitations.error;
  if ((invitations.data?.length ?? 0) > 1)
    throw new Error('Postoji više pozivnica. Potrebno je proveriti članstvo pre nastavka.');
  const invite = invitations.data?.[0];
  if (!invite || !mayClaimInvitation(invite, user)) return { ...empty, memberEmail: user.email };
  const linked = await supabase
    .from('household_members')
    .update({ user_id: user.id, status: 'active' })
    .eq('id', invite.id)
    .eq('household_id', invite.household_id)
    .eq('email', invite.email)
    .eq('status', 'invited')
    .is('user_id', null)
    .select('household_id, role')
    .single();
  if (linked.error) {
    // Another tab or StrictMode replay may already have claimed this invitation.
    // Re-read the verified user's membership rather than treating zero updates as failure.
    const active = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(2);
    if (
      !active.error &&
      active.data?.length === 1 &&
      active.data[0].household_id === invite.household_id
    ) {
      return {
        householdId: active.data[0].household_id,
        memberRole: active.data[0].role,
        memberEmail: user.email,
      };
    }
    throw new Error(
      'Pozivnica postoji, ali povezivanje naloga nije uspelo. Potrebno je proveriti dozvole članstva u bazi.'
    );
  }
  return {
    householdId: linked.data.household_id,
    memberRole: linked.data.role,
    memberEmail: user.email,
  };
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [membership, setMembership] = React.useState<Membership>(empty);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<unknown>(null);
  const request = React.useRef(0);
  const userId = session?.user.id;
  const email = session?.user.email;
  const refetch = React.useCallback(async () => {
    const sequence = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = userId ? await fetchMembership(userId, email) : empty;
      if (sequence === request.current) setMembership(result);
    } catch (err) {
      if (sequence === request.current) {
        setMembership(empty);
        setError(err);
      }
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, [userId, email]);
  React.useEffect(() => {
    void refetch();
    return () => {
      request.current++;
    };
  }, [refetch]);
  return (
    <HouseholdContext.Provider value={{ ...membership, loading, error, refetch }}>
      {children}
    </HouseholdContext.Provider>
  );
}
export function useHousehold() {
  return React.useContext(HouseholdContext);
}
