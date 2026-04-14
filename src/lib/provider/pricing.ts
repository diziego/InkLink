import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { PrintMethod } from "@/types";
import type { Database } from "@/types/database";

type PricingProfileRow =
  Database["public"]["Tables"]["provider_pricing_profiles"]["Row"];

export type PricingMode = "instant" | "manual_quote" | "hybrid";

export type ProviderPricingProfile = {
  id: string;
  providerProfileId: string;
  printMethod: PrintMethod;
  pricingMode: PricingMode;
  minimumQuantity: number;
  basePriceCents: number;
  setupFeeCents: number;
  turnaroundDays: number;
  supportsLocalPickup: boolean;
  supportsShipping: boolean;
  notes: string;
};

export type PriceEstimate = {
  pricingMode: PricingMode;
  /** null when pricingMode is manual_quote */
  estimatedTotalCents: number | null;
  basePriceCents: number;
  setupFeeCents: number;
  quantity: number;
};

export type ProviderPricingProfileInput = {
  printMethod: PrintMethod;
  pricingMode: PricingMode;
  minimumQuantity: number;
  basePriceCents: number;
  setupFeeCents: number;
  turnaroundDays: number;
  supportsLocalPickup: boolean;
  supportsShipping: boolean;
  notes: string;
};

// ─── Pricing estimate ─────────────────────────────────────────────────────────

/**
 * Compute an instant price estimate from a pricing profile and quantity.
 * Returns null for estimatedTotalCents when mode is manual_quote.
 * Formula: setup_fee + (base_price × quantity)
 */
export function estimateOrderPrice(
  profile: ProviderPricingProfile,
  quantity: number,
): PriceEstimate {
  if (profile.pricingMode === "manual_quote") {
    return {
      pricingMode: "manual_quote",
      estimatedTotalCents: null,
      basePriceCents: profile.basePriceCents,
      setupFeeCents: profile.setupFeeCents,
      quantity,
    };
  }

  const estimatedTotalCents =
    profile.setupFeeCents + profile.basePriceCents * quantity;

  return {
    pricingMode: profile.pricingMode,
    estimatedTotalCents,
    basePriceCents: profile.basePriceCents,
    setupFeeCents: profile.setupFeeCents,
    quantity,
  };
}

// ─── DB access ────────────────────────────────────────────────────────────────

export async function loadProviderPricingProfiles(
  providerProfileId: string,
): Promise<ProviderPricingProfile[]> {
  const supabase = createSupabaseServiceRoleClient();
  const result = await (supabase.from("provider_pricing_profiles") as any)
    .select("*")
    .eq("provider_profile_id", providerProfileId)
    .order("print_method");
  if (result.error) throw new Error(result.error.message);
  return ((result.data ?? []) as PricingProfileRow[]).map(adaptRow);
}

export async function savePricingProfiles(
  providerProfileId: string,
  inputs: ProviderPricingProfileInput[],
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  const rows = inputs.map((input) => ({
    provider_profile_id: providerProfileId,
    print_method: input.printMethod,
    pricing_mode: input.pricingMode,
    minimum_quantity: input.minimumQuantity,
    base_price_cents: input.basePriceCents,
    setup_fee_cents: input.setupFeeCents,
    turnaround_days: input.turnaroundDays,
    supports_local_pickup: input.supportsLocalPickup,
    supports_shipping: input.supportsShipping,
    notes: input.notes || null,
    updated_at: new Date().toISOString(),
  }));

  const result = await (supabase.from("provider_pricing_profiles") as any).upsert(
    rows,
    { onConflict: "provider_profile_id,print_method" },
  );

  if (result.error) throw new Error(result.error.message);
}

/**
 * Load pricing profiles for multiple providers at once.
 * Returns a map keyed by provider_profile_id.
 */
export async function loadPricingProfilesForProviders(
  providerProfileIds: string[],
): Promise<Map<string, ProviderPricingProfile[]>> {
  if (providerProfileIds.length === 0) return new Map();

  const supabase = createSupabaseServiceRoleClient();
  const result = await (supabase.from("provider_pricing_profiles") as any)
    .select("*")
    .in("provider_profile_id", providerProfileIds);

  if (result.error) throw new Error(result.error.message);

  const map = new Map<string, ProviderPricingProfile[]>();
  for (const row of (result.data ?? []) as PricingProfileRow[]) {
    const profile = adaptRow(row);
    const existing = map.get(profile.providerProfileId) ?? [];
    existing.push(profile);
    map.set(profile.providerProfileId, existing);
  }
  return map;
}

function adaptRow(row: PricingProfileRow): ProviderPricingProfile {
  return {
    id: row.id,
    providerProfileId: row.provider_profile_id,
    printMethod: row.print_method as PrintMethod,
    pricingMode: row.pricing_mode as PricingMode,
    minimumQuantity: row.minimum_quantity,
    basePriceCents: row.base_price_cents,
    setupFeeCents: row.setup_fee_cents,
    turnaroundDays: row.turnaround_days,
    supportsLocalPickup: row.supports_local_pickup,
    supportsShipping: row.supports_shipping,
    notes: row.notes ?? "",
  };
}
