"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveProviderInventoryData } from "@/lib/provider/inventory";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";

export async function saveProviderInventoryAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/provider?mode=mock");
  }

  await saveProviderInventoryData(formData);
  revalidatePath("/provider");
  revalidatePath("/merchant");
  redirect("/provider?saved=inventory&source=supabase");
}
