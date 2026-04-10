"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveProviderQualityMetrics } from "@/lib/admin/quality-metrics";
import { requireRole } from "@/lib/auth/helpers";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";

export async function saveProviderQualityMetricsAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/admin?source=unconfigured");
  }

  await requireRole("admin");
  await saveProviderQualityMetrics(formData);
  revalidatePath("/admin");
  revalidatePath("/merchant");
  redirect("/admin?saved=quality-metrics&source=supabase");
}
