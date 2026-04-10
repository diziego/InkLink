"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assignRole, getCurrentUser, getRoleDashboard } from "@/lib/auth/helpers";
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
 * Sign the user out and redirect to home.
 */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
