import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseBrowserEnv, getSupabaseServiceRoleKey } from "./env";

export function createSupabaseServiceRoleClient() {
  const { url } = getSupabaseBrowserEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
