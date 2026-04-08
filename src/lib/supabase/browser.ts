import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseBrowserEnv } from "./env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseBrowserEnv();

  return createBrowserClient<Database>(url, anonKey);
}
