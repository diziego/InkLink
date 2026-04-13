import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * GET /auth/callback
 *
 * Supabase redirects here after the user clicks a magic link or confirms
 * an email (for password signup). We exchange the code for a session, then:
 *
 * - If this is a first-time magic-link user (no profile row yet):
 *     create profile with needs_password_setup = true → redirect to /set-password
 * - If profile exists with needs_password_setup = true:
 *     redirect to /set-password (they haven't finished onboarding)
 * - If profile exists and setup is complete:
 *     redirect to dashboard (if they have a role) or /choose-role
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no-session`);
  }

  // Use service-role client for profile reads/writes (RLS only grants SELECT to owner)
  const serviceClient = createSupabaseServiceRoleClient();

  const { data: existingProfile } = (await (serviceClient as any)
    .from("profiles")
    .select("needs_password_setup")
    .eq("id", user.id)
    .maybeSingle()) as {
    data: { needs_password_setup: boolean } | null;
  };

  if (!existingProfile) {
    // No profile row — this is a first-time magic-link user.
    // Create profile and require password setup before continuing.
    await (serviceClient as any).from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      needs_password_setup: true,
    });

    return NextResponse.redirect(`${origin}/set-password`);
  }

  if (existingProfile.needs_password_setup) {
    // Profile exists but they haven't completed password setup yet.
    return NextResponse.redirect(`${origin}/set-password`);
  }

  // Profile complete — check role and send to the right place.
  const { data: roleRow } = (await (serviceClient as any)
    .from("user_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()) as { data: { role: string } | null };

  if (roleRow?.role) {
    switch (roleRow.role) {
      case "provider":
        return NextResponse.redirect(`${origin}/provider`);
      case "merchant":
        return NextResponse.redirect(`${origin}/merchant`);
      case "admin":
        return NextResponse.redirect(`${origin}/admin`);
    }
  }

  return NextResponse.redirect(`${origin}/choose-role`);
}
