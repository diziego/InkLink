"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveProviderOnboardingData } from "@/lib/provider/onboarding";
import { requireRole } from "@/lib/auth/helpers";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";

export async function saveProviderOnboardingAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/provider?mode=mock");
  }

  const user = await requireRole("provider");
  await saveProviderOnboardingData(formData, user.id);
  revalidatePath("/provider");
  redirect("/provider?saved=1&source=supabase");
}
