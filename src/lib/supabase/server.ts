import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabaseBrowserEnv } from "./env";

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseBrowserEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies but may not always be able to
          // write them directly. Middleware or route handlers can persist them.
        }
      },
    },
  });
}
