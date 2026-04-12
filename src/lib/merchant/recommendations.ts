import {
  createSupabaseServiceRoleClient,
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";
import { recommendProvidersForOrder } from "@/lib/routing";
import { precomputeDistances } from "@/lib/geo/distance";
import type {
  BlankInventoryItem,
  MerchantOrder,
  ProviderCapability,
  ProviderProfile,
  ProviderQualityMetrics,
} from "@/types";
import type { Database } from "@/types/database";

type ProviderProfileRow = Database["public"]["Tables"]["provider_profiles"]["Row"];
type ProviderCapabilityRow =
  Database["public"]["Tables"]["provider_capabilities"]["Row"];
type ProviderQualityMetricsRow =
  Database["public"]["Tables"]["provider_quality_metrics"]["Row"];
type ProviderInventoryRow = Database["public"]["Tables"]["provider_inventory"]["Row"];

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

export async function recommendLiveProvidersForOrder(order: MerchantOrder) {
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

  return {
    providerData,
    recommendations: recommendProvidersForOrder({
      order,
      providers: providerData.providers,
      capabilities: providerData.capabilities,
      blankInventory: providerData.inventory,
      qualityMetrics: providerData.qualityMetrics,
    }),
  };
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
