import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { ENV } from "@/lib/env";

export const supabase = createClient<Database>(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
  {
    auth: {
      // GH Pages + HashRouter friendly
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "smp2-auth",
    },
  }
);