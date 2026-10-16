import { supabase } from '@/lib/supabase';

export async function sendInvitation(householdId: string, email: string) {
  const { data, error } = await supabase.functions.invoke('invite-member', {
    body: { household_id: householdId, email: email.trim().toLowerCase() },
  });
  if (error) {
    let message = 'Slanje pozivnice nije potvrđeno. Pokušajte ponovo.';
    if (error.context instanceof Response) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === 'string') message = body.error;
    }
    throw new Error(message);
  }
  if (data?.ok !== true || data.email_status !== 'accepted')
    throw new Error('Slanje pozivnice nije potvrđeno. Pokušajte ponovo.');
}
