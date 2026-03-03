// Supabase Edge Function: invite-member
// - Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set as secrets
// - Called from frontend with Authorization: Bearer <user access_token>
// - Only household owner can invite
//
// Payload: { household_id: string, email: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!jwt) return new Response("Missing Authorization Bearer token", { status: 401 });

  const { household_id, email } = await req.json().catch(() => ({}));

  if (!household_id || !email) return new Response("Missing household_id or email", { status: 400 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
  }

  // Client with service role (DB writes + auth admin)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Verify caller with user client (RLS)
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr) return new Response(userErr.message, { status: 401 });

  const callerEmail = userData.user?.email;
  if (!callerEmail) return new Response("Caller has no email", { status: 400 });

  // Check caller is owner in this household via RLS safe query
  const { data: ownerRow, error: ownerErr } = await userClient
    .from("household_members")
    .select("id, role, status")
    .eq("household_id", household_id)
    .eq("email", callerEmail)
    .maybeSingle();

  if (ownerErr) return new Response(ownerErr.message, { status: 403 });
  if (!ownerRow || ownerRow.role !== "owner" || ownerRow.status !== "active") {
    return new Response("Not household owner", { status: 403 });
  }

  // 1) Create/update membership record as invited
  const { error: memErr } = await admin.from("household_members").upsert(
    {
      household_id,
      email,
      role: "member",
      status: "invited",
    },
    { onConflict: "household_id,email" }
  );
  if (memErr) return new Response(memErr.message, { status: 400 });

  // 2) Send Supabase auth invite (magic link)
  // Note: This creates a user if they don't exist and emails them.
  const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: req.headers.get("Origin") ?? undefined,
  });
  if (invErr) return new Response(invErr.message, { status: 400 });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
