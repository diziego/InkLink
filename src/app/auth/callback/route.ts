import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * GET /auth/callback
 *
 * Supabase redirects here after the user clicks a magic link.
 * We exchange the code for a session, then redirect the user:
 *   - to /choose-role if they have no role yet
 *   - to their dashboard if they already have a role
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

  // Check if the user already has a role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (roleRow?.role) {
      // They have a role — send them to their dashboard
      switch (roleRow.role) {
        case "provider":
          return NextResponse.redirect(`${origin}/provider`);
        case "merchant":
          return NextResponse.redirect(`${origin}/merchant`);
        case "admin":
          return NextResponse.redirect(`${origin}/admin`);
      }
    }
  }

  // No role yet — send to role picker
  return NextResponse.redirect(`${origin}/choose-role`);
}
