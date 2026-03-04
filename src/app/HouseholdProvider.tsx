import React from "react";
import { supabase } from "@/lib/supabase";

type HouseholdState = {
  householdId: string | null;
  memberRole: "owner" | "member" | null;
  memberEmail: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

const HouseholdContext = React.createContext<HouseholdState>({
  householdId: null,
  memberRole: null,
  memberEmail: null,
  loading: true,
  refetch: async () => {},
});

async function fetchMyMembership() {
  const { data: userRes, error: uerr } = await supabase.auth.getUser();
  if (uerr) throw uerr;

  const user = userRes.user;
  if (!user?.id || !user?.email) return { householdId: null, memberRole: null, memberEmail: null };

  // 1) Prefer lookup by user_id (already linked)
  const byUser = await supabase
    .from("household_members")
    .select("id, household_id, role, status, email, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (byUser.error) throw byUser.error;

  if (byUser.data) {
    // keep email in sync (best-effort)
    if (byUser.data.email !== user.email) {
      await supabase.from("household_members").update({ email: user.email }).eq("id", byUser.data.id);
    }

    if (byUser.data.status !== "active") {
      return { householdId: null, memberRole: null, memberEmail: user.email };
    }

    return {
      householdId: byUser.data.household_id as string,
      memberRole: byUser.data.role as any,
      memberEmail: user.email,
    };
  }

  // 2) Fallback lookup by email (invite flow: status=invited, user_id is NULL)
  const byEmail = await supabase
    .from("household_members")
    .select("id, household_id, role, status, email, user_id")
    .eq("email", user.email)
    .maybeSingle();

  if (byEmail.error) throw byEmail.error;
  if (!byEmail.data) return { householdId: null, memberRole: null, memberEmail: user.email };

  // If invited (or missing user_id), auto-activate & link to current auth user.
  if (byEmail.data.status === "invited" || !byEmail.data.user_id) {
    const { data: updated, error: updErr } = await supabase
      .from("household_members")
      .update({ status: "active", user_id: user.id })
      .eq("id", byEmail.data.id)
      .select("household_id, role, status")
      .single();

    if (updErr) throw updErr;

    if (updated.status !== "active") return { householdId: null, memberRole: null, memberEmail: user.email };

    return {
      householdId: updated.household_id as string,
      memberRole: updated.role as any,
      memberEmail: user.email,
    };
  }

  // Active already
  if (byEmail.data.status !== "active") return { householdId: null, memberRole: null, memberEmail: user.email };

  return {
    householdId: byEmail.data.household_id as string,
    memberRole: byEmail.data.role as any,
    memberEmail: user.email,
  };
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [householdId, setHouseholdId] = React.useState<string | null>(null);
  const [memberRole, setMemberRole] = React.useState<"owner" | "member" | null>(null);
  const [memberEmail, setMemberEmail] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMyMembership();
      setHouseholdId(res.householdId);
      setMemberRole(res.memberRole);
      setMemberEmail(res.memberEmail);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refetch();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refetch();
    });

    return () => sub.subscription.unsubscribe();
  }, [refetch]);

  return (
    <HouseholdContext.Provider value={{ householdId, memberRole, memberEmail, loading, refetch }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  return React.useContext(HouseholdContext);
}