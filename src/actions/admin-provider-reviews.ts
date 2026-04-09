"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAdminProviderReview } from "@/lib/admin/reviews";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";

export async function saveAdminProviderReviewAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/admin?source=unconfigured");
  }

  await saveAdminProviderReview(formData);
  revalidatePath("/admin");
  redirect("/admin?saved=1&source=supabase");
}
