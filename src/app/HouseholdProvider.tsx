import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

type HouseholdState = {
  householdId: string | null;
  memberRole: "owner" | "member" | null;
  memberEmail: string | null;
  loading: boolean;
  refetch: () => Promise<any>;
};

const HouseholdContext = React.createContext<HouseholdState>({
  householdId: null,
  memberRole: null,
  memberEmail: null,
  loading: true,
  refetch: async () => null,
});

async function fetchMyMembership() {
  const { data: userRes, error: uerr } = await supabase.auth.getUser();
  if (uerr) throw uerr;
  const user = userRes.user;
  if (!user?.email) return { householdId: null, memberRole: null, memberEmail: null };

  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, role, status, email")
    .eq("email", user.email)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== "active") return { householdId: null, memberRole: null, memberEmail: user.email };

  return { householdId: data.household_id as string, memberRole: data.role as any, memberEmail: user.email };
}

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const q = useQuery({
    queryKey: ["my-membership", session?.user?.id],
    queryFn: fetchMyMembership,
    enabled: !!session?.user?.id,
  });

  return (
    <HouseholdContext.Provider
      value={{
        householdId: q.data?.householdId ?? null,
        memberRole: q.data?.memberRole ?? null,
        memberEmail: q.data?.memberEmail ?? null,
        loading: q.isLoading,
        refetch: q.refetch,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  return React.useContext(HouseholdContext);
}
