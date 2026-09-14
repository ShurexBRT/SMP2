import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { ENV } from "@/lib/env";

export const supabase = createClient<Database>(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "smp2-auth",
    },
  }
);
