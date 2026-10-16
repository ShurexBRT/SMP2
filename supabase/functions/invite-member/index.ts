import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { createInviteHandler } from './handler.ts';

// Membership access uses the caller's JWT and RLS, never service-role.
Deno.serve(
  createInviteHandler({
    appUrl: Deno.env.get('APP_URL') ?? '',
    mailKey: Deno.env.get('RESEND_API_KEY') ?? '',
    mailFrom: Deno.env.get('INVITE_FROM_EMAIL') ?? '',
    gateway(token) {
      const client = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      );
      return {
        async user() {
          const { data, error } = await client.auth.getUser(token);
          return error ? null : data.user;
        },
        async owner(householdId, userId) {
          const { data, error } = await client
            .from('household_members')
            .select('id')
            .eq('household_id', householdId)
            .eq('user_id', userId)
            .eq('role', 'owner')
            .eq('status', 'active')
            .maybeSingle();
          if (error) throw error;
          return !!data;
        },
        async invitation(householdId, email) {
          const { data, error } = await client
            .from('household_members')
            .select('id, role, status, user_id')
            .eq('household_id', householdId)
            .eq('email', email)
            .maybeSingle();
          if (error) throw error;
          return data;
        },
        async insert(householdId, email) {
          const { error } = await client.from('household_members').insert({
            household_id: householdId,
            email,
            role: 'member',
            status: 'invited',
            user_id: null,
          });
          if (error && error.code !== '23505') throw error;
          // Re-read even on a racing duplicate; never overwrite an active member.
        },
      };
    },
  })
);
