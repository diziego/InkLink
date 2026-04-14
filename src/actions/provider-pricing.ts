"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";
import { getProviderProfileId } from "@/lib/provider/orders";
import {
  savePricingProfiles,
  type PricingMode,
  type ProviderPricingProfileInput,
} from "@/lib/provider/pricing";
import type { PrintMethod } from "@/types";

const VALID_PRINT_METHODS: PrintMethod[] = [
  "dtg",
  "dtf",
  "screen_print",
  "embroidery",
  "heat_transfer",
];
const VALID_PRICING_MODES: PricingMode[] = [
  "instant",
  "manual_quote",
  "hybrid",
];

export async function savePricingProfileAction(
  formData: FormData,
): Promise<void> {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/provider");
  }

  const user = await requireRole("provider");
  const providerProfileId = await getProviderProfileId(user.id);
  if (!providerProfileId) {
    redirect("/provider");
  }

  const inputs: ProviderPricingProfileInput[] = [];

  for (const method of VALID_PRINT_METHODS) {
    const rawMode = String(formData.get(`pricing_${method}_mode`) ?? "");
    if (!VALID_PRICING_MODES.includes(rawMode as PricingMode)) continue;

    const rawBasePrice = parseFloat(
      String(formData.get(`pricing_${method}_base_price`) ?? "0"),
    );
    const rawSetupFee = parseFloat(
      String(formData.get(`pricing_${method}_setup_fee`) ?? "0"),
    );
    const rawMinQty = parseInt(
      String(formData.get(`pricing_${method}_min_qty`) ?? "1"),
      10,
    );
    const rawTurnaround = parseInt(
      String(formData.get(`pricing_${method}_turnaround`) ?? "5"),
      10,
    );
    const supportsLocalPickup = formData
      .getAll(`pricing_${method}_local_pickup`)
      .includes("true");
    const supportsShipping = formData
      .getAll(`pricing_${method}_shipping`)
      .includes("true");
    const notes = String(
      formData.get(`pricing_${method}_notes`) ?? "",
    ).trim();

    inputs.push({
      printMethod: method,
      pricingMode: rawMode as PricingMode,
      minimumQuantity: isNaN(rawMinQty) ? 1 : Math.max(1, rawMinQty),
      basePriceCents: isNaN(rawBasePrice)
        ? 0
        : Math.max(0, Math.round(rawBasePrice * 100)),
      setupFeeCents: isNaN(rawSetupFee)
        ? 0
        : Math.max(0, Math.round(rawSetupFee * 100)),
      turnaroundDays: isNaN(rawTurnaround) ? 5 : Math.max(1, rawTurnaround),
      supportsLocalPickup,
      supportsShipping,
      notes,
    });
  }

  if (inputs.length > 0) {
    await savePricingProfiles(providerProfileId, inputs);
  }

  redirect("/provider?saved=pricing&source=supabase");
}
