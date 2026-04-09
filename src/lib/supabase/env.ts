function readEnv(key: string) {
  const value = process.env[key];

  return value && value.length > 0 ? value : undefined;
}

export function getSupabaseBrowserEnv() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase browser environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. This is only needed for privileged server-only operations.",
    );
  }

  return serviceRoleKey;
}

export function hasSupabaseBrowserEnv() {
  return Boolean(
    readEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export function hasSupabaseServiceRoleEnv() {
  return Boolean(readEnv("SUPABASE_SERVICE_ROLE_KEY"));
}
