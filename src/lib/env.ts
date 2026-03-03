export function requiredEnv(name: string): string {
  const v = import.meta.env[name];
  if (!v || typeof v !== "string") {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

export const ENV = {
  SUPABASE_URL: requiredEnv("VITE_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requiredEnv("VITE_SUPABASE_ANON_KEY"),
  INVITE_FUNCTION_URL: (import.meta.env.VITE_INVITE_FUNCTION_URL as string | undefined) ?? "",
};
