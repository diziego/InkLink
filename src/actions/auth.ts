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
