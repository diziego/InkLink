"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveProviderInventoryData } from "@/lib/provider/inventory";
import { requireRole } from "@/lib/auth/helpers";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";

export async function saveProviderInventoryAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/provider?mode=mock");
  }

  const user = await requireRole("provider");
  await saveProviderInventoryData(formData, user.id);
  revalidatePath("/provider");
  revalidatePath("/merchant");
  redirect("/provider?saved=inventory&source=supabase");
}
