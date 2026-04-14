import {
  createSupabaseServiceRoleClient,
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";
import { recommendProvidersForOrder } from "@/lib/routing";
import { precomputeDistances } from "@/lib/geo/distance";
import {
  estimateOrderPrice,
  loadPricingProfilesForProviders,
  type PriceEstimate,
  type PricingMode,
  type ProviderPricingProfile,
} from "@/lib/provider/pricing";
import type {
  BlankInventoryItem,
  MerchantOrder,
  ProviderCapability,
  ProviderProfile,
  ProviderQualityMetrics,
} from "@/types";
import type { Database } from "@/types/database";
import type {
  ProviderRecommendation,
  RoutingFactorBreakdown,
} from "@/lib/routing";

export type ProviderRecommendationWithPricing = ProviderRecommendation & {
  pricingProfile: ProviderPricingProfile | null;
  priceEstimate: PriceEstimate | null;
};

export type PersistedProviderRecommendation = ProviderRecommendationWithPricing & {
  snapshotId: string;
};

type ProviderProfileRow = Database["public"]["Tables"]["provider_profiles"]["Row"];
type ProviderCapabilityRow =
  Database["public"]["Tables"]["provider_capabilities"]["Row"];
type ProviderQualityMetricsRow =
  Database["public"]["Tables"]["provider_quality_metrics"]["Row"];
type ProviderInventoryRow = Database["public"]["Tables"]["provider_inventory"]["Row"];
type RecommendationSnapshotRow =
  Database["public"]["Tables"]["recommendation_snapshots"]["Row"];
type RecommendationSnapshotWithProviderRow = RecommendationSnapshotRow & {
  provider_profiles?:
    | {
        business_name: string;
      }
    | Array<{
        business_name: string;
      }>
    | null;
};

export type MerchantProviderData = {
  persistenceMode: "unconfigured" | "supabase";
  providers: ProviderProfile[];
  capabilities: ProviderCapability[];
  qualityMetrics: ProviderQualityMetrics[];
  inventory: BlankInventoryItem[];
};

export async function loadMerchantProviderData(): Promise<MerchantProviderData> {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    return {
      persistenceMode: "unconfigured",
      providers: [],
      capabilities: [],
      qualityMetrics: [],
      inventory: [],
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const providerProfilesResponse = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("verification_status", "verified")
    .order("updated_at", { ascending: false });

  if (providerProfilesResponse.error) {
    throw new Error(providerProfilesResponse.error.message);
  }

  const providerProfileRows =
    (providerProfilesResponse.data as ProviderProfileRow[] | null) ?? [];

  if (providerProfileRows.length === 0) {
    return {
      persistenceMode: "supabase",
      providers: [],
      capabilities: [],
      qualityMetrics: [],
      inventory: [],
    };
  }

  const providerProfileIds = providerProfileRows.map((provider) => provider.id);

  const [
    providerCapabilitiesResponse,
    qualityMetricsResponse,
    inventoryResponse,
  ] = await Promise.all([
    supabase
      .from("provider_capabilities")
      .select("*")
      .in("provider_profile_id", providerProfileIds),
    supabase
      .from("provider_quality_metrics")
      .select("*")
      .in("provider_profile_id", providerProfileIds),
    supabase
      .from("provider_inventory")
      .select("*")
      .in("provider_profile_id", providerProfileIds),
  ]);

  if (providerCapabilitiesResponse.error) {
    throw new Error(providerCapabilitiesResponse.error.message);
  }

  if (qualityMetricsResponse.error) {
    throw new Error(qualityMetricsResponse.error.message);
  }

  if (inventoryResponse.error) {
    throw new Error(inventoryResponse.error.message);
  }

  const providers = providerProfileRows.map(adaptProviderProfileRow);
  const capabilities = (
    (providerCapabilitiesResponse.data as ProviderCapabilityRow[] | null) ?? []
  ).map(adaptProviderCapabilityRow);
  const qualityMetrics = (
    (qualityMetricsResponse.data as ProviderQualityMetricsRow[] | null) ?? []
  ).map(adaptProviderQualityMetricsRow);
  const inventory = (
    (inventoryResponse.data as ProviderInventoryRow[] | null) ?? []
  ).map(adaptProviderInventoryRow);

  return {
    persistenceMode: "supabase",
    providers,
    capabilities,
    qualityMetrics,
    inventory,
  };
}

export async function recommendLiveProvidersForOrder(order: MerchantOrder): Promise<{
  providerData: MerchantProviderData;
  recommendations: ProviderRecommendationWithPricing[];
}> {
  const providerData = await loadMerchantProviderData();

  if (providerData.providers.length === 0) {
    return {
      providerData,
      recommendations: [],
    };
  }

  // Pre-compute real ZIP distances before the routing engine runs.
  // Distances are stored in a module-level cache and read synchronously
  // by estimateMockDistanceMiles in mock-calculations.ts.
  const providerZips = providerData.providers
    .map((p) => p.zip)
    .filter(Boolean);
  if (order.fulfillmentZip && providerZips.length > 0) {
    await precomputeDistances(order.fulfillmentZip, providerZips);
  }

  const baseRecommendations = recommendProvidersForOrder({
    order,
    providers: providerData.providers,
    capabilities: providerData.capabilities,
    blankInventory: providerData.inventory,
    qualityMetrics: providerData.qualityMetrics,
  });

  // Load pricing profiles for the top matched providers only
  const matchedProviderIds = baseRecommendations.map((r) => r.providerId);
  const pricingMap = await loadPricingProfilesForProviders(matchedProviderIds);

  // Determine the primary print method from the order (default dtg)
  const primaryPrintMethod =
    order.items[0]?.printMethod ?? "dtg";

  // Determine quantity for estimate
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const recommendations: ProviderRecommendationWithPricing[] =
    baseRecommendations.map((rec) => {
      const profiles = pricingMap.get(rec.providerId) ?? [];
      const pricingProfile =
        profiles.find((p) => p.printMethod === primaryPrintMethod) ??
        profiles[0] ??
        null;
      const priceEstimate = pricingProfile
        ? estimateOrderPrice(pricingProfile, quantity)
        : null;

      return { ...rec, pricingProfile, priceEstimate };
    });

  return { providerData, recommendations };
}

export async function persistRecommendationSnapshotsForOrder(
  orderId: string,
  recommendations: ProviderRecommendationWithPricing[],
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  const deleteResult = await (supabase.from("recommendation_snapshots") as any)
    .delete()
    .eq("merchant_order_id", orderId);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  if (recommendations.length === 0) {
    return;
  }

  const rows = recommendations.map((recommendation, index) => ({
    merchant_order_id: orderId,
    provider_profile_id: recommendation.providerId,
    rank: index + 1,
    score: Number(recommendation.totalScore.toFixed(2)),
    factor_breakdown: recommendation.factorBreakdown,
    explanation: recommendation.explanation,
    pricing_profile_id: recommendation.pricingProfile?.id ?? null,
    pricing_mode: recommendation.priceEstimate?.pricingMode ?? null,
    estimated_total_cents: recommendation.priceEstimate?.estimatedTotalCents ?? null,
    base_price_cents: recommendation.priceEstimate?.basePriceCents ?? null,
    setup_fee_cents: recommendation.priceEstimate?.setupFeeCents ?? null,
    quantity:
      recommendation.priceEstimate?.quantity ??
      recommendation.operationalNotes.requestedUnits ??
      1,
    turnaround_days:
      recommendation.pricingProfile?.turnaroundDays ??
      recommendation.operationalNotes.estimatedTurnaroundDays,
    supports_local_pickup:
      recommendation.pricingProfile?.supportsLocalPickup ??
      recommendation.operationalNotes.localPickupSupported,
    supports_shipping: recommendation.pricingProfile?.supportsShipping ?? true,
    estimated_shipping_cost_usd:
      recommendation.operationalNotes.estimatedShippingCostUsd,
    estimated_distance_miles:
      recommendation.operationalNotes.estimatedDistanceMiles,
    available_capacity_units:
      recommendation.operationalNotes.availableCapacityUnits,
    requested_units: recommendation.operationalNotes.requestedUnits,
  }));

  const insertResult = await (supabase.from("recommendation_snapshots") as any).insert(
    rows,
  );

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }
}

export async function loadRecommendationSnapshotsForOrder(
  orderId: string,
): Promise<PersistedProviderRecommendation[]> {
  const supabase = createSupabaseServiceRoleClient();

  const result = await (supabase.from("recommendation_snapshots") as any)
    .select("*, provider_profiles!inner(business_name)")
    .eq("merchant_order_id", orderId)
    .order("rank", { ascending: true });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows =
    (result.data as RecommendationSnapshotWithProviderRow[] | null) ?? [];

  return rows.map(adaptRecommendationSnapshotRow);
}

function adaptProviderProfileRow(row: ProviderProfileRow): ProviderProfile {
  return {
    id: row.id,
    profileId: row.profile_id,
    businessName: row.business_name,
    legalBusinessName: row.business_name,
    contactName: row.contact_name,
    businessEmail: "",
    phone: "",
    streetAddress: "",
    city: row.city,
    state: row.state as "CA",
    zip: row.zip,
    sellersPermitNumber: "",
    einPlaceholder: "",
    businessType: "",
    yearsInOperation: 0,
    supplierAccountReadiness: [],
    preferredBlankDistributors: [],
    blankSourcingNotes: "",
    fulfillmentCutoffTime: "",
    reorderLeadTimeDays: 0,
    serviceRadiusMiles: row.service_radius_miles,
    supportsLocalPickup: row.supports_local_pickup,
    tier: row.tier,
    verificationStatus: row.verification_status,
    turnaroundSlaDays: row.turnaround_sla_days,
    dailyCapacityUnits: row.daily_capacity_units,
    currentCapacityUsed: row.current_capacity_used,
    specialties: row.specialties,
  };
}

function adaptProviderCapabilityRow(
  row: ProviderCapabilityRow,
): ProviderCapability {
  return {
    id: row.id,
    providerId: row.provider_profile_id,
    printMethods: row.print_methods,
    garmentTypes: row.garment_types,
    maxOrderQuantity: row.max_order_quantity,
    acceptsPremiumBlanks: row.accepts_premium_blanks,
    notes: row.notes ?? "",
  };
}

function adaptProviderQualityMetricsRow(
  row: ProviderQualityMetricsRow,
): ProviderQualityMetrics {
  return {
    providerId: row.provider_profile_id,
    qualityScore: Number(row.quality_score),
    reliabilityScore: Number(row.reliability_score),
    reprintRate: Number(row.reprint_rate),
    onTimeDeliveryRate: Number(row.on_time_delivery_rate),
    averageRating: Number(row.average_rating),
    completedOrders: row.completed_orders,
    lastReviewedAt: row.last_reviewed_at ?? row.updated_at,
  };
}

function adaptProviderInventoryRow(row: ProviderInventoryRow): BlankInventoryItem {
  return {
    id: row.id,
    providerId: row.provider_profile_id,
    blankBrand: row.blank_brand,
    styleName: row.style_name,
    garmentType: row.garment_type,
    colors: row.colors,
    sizes: row.sizes,
    stockStatus: row.stock_status,
    quantityOnHand: row.quantity_on_hand,
    isPremiumBlank: row.is_premium_blank,
  };
}

function adaptRecommendationSnapshotRow(
  row: RecommendationSnapshotWithProviderRow,
): PersistedProviderRecommendation {
  return {
    snapshotId: row.id,
    providerId: row.provider_profile_id,
    providerName: Array.isArray(row.provider_profiles)
      ? (row.provider_profiles[0]?.business_name ?? "Provider")
      : (row.provider_profiles?.business_name ?? "Provider"),
    totalScore: Number(row.score),
    factorBreakdown: row.factor_breakdown as RoutingFactorBreakdown,
    explanation: row.explanation,
    operationalNotes: {
      estimatedDistanceMiles: row.estimated_distance_miles ?? 0,
      estimatedShippingCostUsd: row.estimated_shipping_cost_usd ?? 0,
      estimatedTurnaroundDays: row.turnaround_days ?? 0,
      availableCapacityUnits: row.available_capacity_units ?? 0,
      requestedUnits: row.requested_units ?? row.quantity,
      localPickupSupported: row.supports_local_pickup,
    },
    pricingProfile: row.pricing_profile_id
      ? {
          id: row.pricing_profile_id,
          providerProfileId: row.provider_profile_id,
          printMethod: "dtg",
          pricingMode: (row.pricing_mode ?? "instant") as PricingMode,
          minimumQuantity: 1,
          basePriceCents: row.base_price_cents ?? 0,
          setupFeeCents: row.setup_fee_cents ?? 0,
          turnaroundDays: row.turnaround_days ?? 0,
          supportsLocalPickup: row.supports_local_pickup,
          supportsShipping: row.supports_shipping,
          notes: "",
        }
      : null,
    priceEstimate:
      row.pricing_mode !== null ||
      row.estimated_total_cents !== null ||
      row.base_price_cents !== null ||
      row.setup_fee_cents !== null
        ? {
            pricingMode: (row.pricing_mode ?? "instant") as PricingMode,
            estimatedTotalCents: row.estimated_total_cents,
            basePriceCents: row.base_price_cents ?? 0,
            setupFeeCents: row.setup_fee_cents ?? 0,
            quantity: row.quantity,
          }
        : null,
  };
}
