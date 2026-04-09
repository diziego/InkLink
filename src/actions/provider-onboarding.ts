"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveProviderOnboardingData } from "@/lib/provider/onboarding";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";

export async function saveProviderOnboardingAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/provider?mode=mock");
  }

  await saveProviderOnboardingData(formData);
  revalidatePath("/provider");
  redirect("/provider?saved=1&source=supabase");
}
