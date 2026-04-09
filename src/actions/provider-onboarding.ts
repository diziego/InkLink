"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveProviderOnboardingData } from "@/lib/provider/onboarding";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";

export async function saveProviderOnboardingAction(formData: FormData) {
  const devProviderKey = formData.get("devProviderKey");
  const devProviderQuery =
    typeof devProviderKey === "string" ? `&devProvider=${devProviderKey}` : "";

  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect(`/provider?mode=mock${devProviderQuery}`);
  }

  await saveProviderOnboardingData(formData);
  revalidatePath("/provider");
  redirect(`/provider?saved=1&source=supabase${devProviderQuery}`);
}
