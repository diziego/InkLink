"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAdminProviderReview } from "@/lib/admin/reviews";
import { requireRole } from "@/lib/auth/helpers";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";

export async function saveAdminProviderReviewAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/admin?source=unconfigured");
  }

  const user = await requireRole("admin");
  await saveAdminProviderReview(formData, user.id);
  revalidatePath("/admin");
  redirect("/admin?saved=1&source=supabase");
}
