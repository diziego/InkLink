"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assignRole, getCurrentUser, getRoleDashboard } from "@/lib/auth/helpers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["user_role"];

/**
 * Send a magic link email for sign-in.
 */
export async function sendMagicLinkAction(formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.includes("@")) {
    redirect("/login?error=invalid-email");
  }

  const supabase = await createSupabaseServerClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?sent=1");
}

/**
 * Sign in with email and password.
 */
export async function signInWithPasswordAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.includes("@")) {
    redirect("/login?mode=password&error=" + encodeURIComponent("Enter a valid email address."));
  }

  if (typeof password !== "string" || password.length < 1) {
    redirect("/login?mode=password&error=" + encodeURIComponent("Enter your password."));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    redirect("/login?mode=password&error=" + encodeURIComponent(error.message));
  }

  const user = await getCurrentUser();

  if (user?.needsPasswordSetup) {
    redirect("/set-password");
  }

  if (!user?.role) {
    redirect("/choose-role");
  }

  revalidatePath("/");
  redirect(getRoleDashboard(user.role));
}

/**
 * Create a new account with email and password.
 */
export async function signUpWithPasswordAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof email !== "string" || !email.includes("@")) {
    redirect("/signup?error=" + encodeURIComponent("Enter a valid email address."));
  }

  if (typeof password !== "string" || password.length < 8) {
    redirect("/signup?error=" + encodeURIComponent("Password must be at least 8 characters."));
  }

  if (password !== confirmPassword) {
    redirect("/signup?error=" + encodeURIComponent("Passwords do not match."));
  }

  const supabase = await createSupabaseServerClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  // Create profile with needs_password_setup = false immediately.
  // This runs even before email confirmation so the callback knows this
  // user chose password auth and should NOT be forced to /set-password.
  if (data.user) {
    const serviceClient = createSupabaseServiceRoleClient();
    await (serviceClient as any).from("profiles").upsert(
      {
        id: data.user.id,
        email: data.user.email ?? null,
        needs_password_setup: false,
      },
      { onConflict: "id" },
    );
  }

  // If session is null, Supabase sent a confirmation email.
  if (!data.session) {
    redirect("/signup?sent=1");
  }

  // Auto-confirmed (local dev) — go straight to role picker.
  revalidatePath("/");
  redirect("/choose-role");
}

/**
 * Assign a role to the current user after first sign-in.
 */
export async function chooseRoleAction(formData: FormData) {
  const role = formData.get("role") as string;

  if (role !== "provider" && role !== "merchant") {
    redirect("/choose-role?error=invalid-role");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await assignRole(user.id, user.email, role as UserRole);
  revalidatePath("/");
  redirect(getRoleDashboard(role as UserRole));
}

/**
 * Complete password setup for magic-link onboarding users.
 * Sets the password on the auth user and clears needs_password_setup.
 */
export async function setPasswordAction(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const next = formData.get("next");
  const nextUrl =
    typeof next === "string" && next.startsWith("/") ? next : null;

  if (typeof password !== "string" || password.length < 8) {
    const q = nextUrl ? `&next=${encodeURIComponent(nextUrl)}` : "";
    redirect(
      "/set-password?error=" +
        encodeURIComponent("Password must be at least 8 characters.") +
        q,
    );
  }

  if (password !== confirmPassword) {
    const q = nextUrl ? `&next=${encodeURIComponent(nextUrl)}` : "";
    redirect(
      "/set-password?error=" +
        encodeURIComponent("Passwords do not match.") +
        q,
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const q = nextUrl ? `&next=${encodeURIComponent(nextUrl)}` : "";
    redirect(
      "/set-password?error=" + encodeURIComponent(error.message) + q,
    );
  }

  // Mark password setup complete
  const serviceClient = createSupabaseServiceRoleClient();
  await (serviceClient as any)
    .from("profiles")
    .update({ needs_password_setup: false })
    .eq("id", user.id);

  // Redirect: if they have a role already, go to dashboard; otherwise choose-role
  const { data: roleRow } = (await (serviceClient as any)
    .from("user_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()) as { data: { role: string } | null };

  revalidatePath("/");

  if (roleRow?.role) {
    redirect(nextUrl ?? getRoleDashboard(roleRow.role as UserRole));
  }

  redirect(nextUrl ?? "/choose-role");
}

/**
 * Sign the user out and redirect to home.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
