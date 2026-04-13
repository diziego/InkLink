import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["user_role"];

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole | null;
  displayName: string | null;
  needsPasswordSetup: boolean;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const { data: roleRow } = (await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()) as { data: { role: string } | null };

  const { data: profileRow } = (await supabase
    .from("profiles")
    .select("display_name, needs_password_setup")
    .eq("id", user.id)
    .maybeSingle()) as {
    data: { display_name: string | null; needs_password_setup: boolean } | null;
  };

  return {
    id: user.id,
    email: user.email,
    role: (roleRow?.role as UserRole) ?? null,
    displayName: profileRow?.display_name ?? null,
    needsPasswordSetup: profileRow?.needs_password_setup ?? false,
  };
}

export async function requireRole(requiredRole: UserRole): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.needsPasswordSetup) {
    redirect("/set-password");
  }

  if (!user.role) {
    redirect("/choose-role");
  }

  if (user.role !== requiredRole) {
    redirect(getRoleDashboard(user.role));
  }

  return user;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.needsPasswordSetup) {
    redirect("/set-password");
  }

  return user;
}

export function getRoleDashboard(role: UserRole): string {
  switch (role) {
    case "provider":
      return "/provider";
    case "merchant":
      return "/merchant";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}

export async function assignRole(
  userId: string,
  email: string,
  role: UserRole,
  displayName?: string,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  const { error: profileError } = await (supabase.from("profiles") as any).upsert(
    {
      id: userId,
      email,
      display_name: displayName ?? null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  await (supabase.from("user_roles") as any).delete().eq("profile_id", userId);

  const { error: roleError } = await (supabase.from("user_roles") as any).insert({
    profile_id: userId,
    role,
  });

  if (roleError) {
    throw new Error(`Failed to assign role: ${roleError.message}`);
  }
}
