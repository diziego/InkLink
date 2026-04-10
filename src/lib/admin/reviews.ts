import {
  createSupabaseServiceRoleClient,
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";
import type { Database } from "@/types";

type ProviderProfileRow = Database["public"]["Tables"]["provider_profiles"]["Row"];
type ProviderProfileUpdate =
  Database["public"]["Tables"]["provider_profiles"]["Update"];
type ProviderCapabilityRow =
  Database["public"]["Tables"]["provider_capabilities"]["Row"];
type ProviderWholesaleReadinessRow =
  Database["public"]["Tables"]["provider_wholesale_readiness"]["Row"];
type ProviderQualityMetricsRow =
  Database["public"]["Tables"]["provider_quality_metrics"]["Row"];
type AdminProviderReviewRow =
  Database["public"]["Tables"]["admin_provider_reviews"]["Row"];
type AdminProviderReviewInsert =
  Database["public"]["Tables"]["admin_provider_reviews"]["Insert"];
type ReviewDecision = Database["public"]["Enums"]["review_decision"];
type ProviderTier = Database["public"]["Enums"]["provider_tier"];
type VerificationStatus = Database["public"]["Enums"]["verification_status"];

export type AdminProviderReviewItem = {
  providerProfile: ProviderProfileRow;
  capability: ProviderCapabilityRow | null;
  wholesaleReadiness: ProviderWholesaleReadinessRow | null;
  qualityMetrics: ProviderQualityMetricsRow | null;
  latestReview: AdminProviderReviewRow | null;
};

export type AdminReviewData = {
  persistenceMode: "unconfigured" | "supabase";
  providerItems: AdminProviderReviewItem[];
  queueItems: AdminProviderReviewItem[];
  verifiedItems: AdminProviderReviewItem[];
  totalProviders: number;
  reviewQueueCount: number;
  verifiedCount: number;
  openCapacityUnits: number;
};

export async function loadAdminReviewData(): Promise<AdminReviewData> {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    return getEmptyAdminReviewData("unconfigured");
  }

  const supabase = createSupabaseServiceRoleClient();
  const providerProfilesResponse = await supabase
    .from("provider_profiles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (providerProfilesResponse.error) {
    throw new Error(providerProfilesResponse.error.message);
  }

  const providerProfiles =
    (providerProfilesResponse.data as ProviderProfileRow[] | null) ?? [];

  if (providerProfiles.length === 0) {
    return getEmptyAdminReviewData("supabase");
  }

  const providerProfileIds = providerProfiles.map((provider) => provider.id);

  const [
    providerCapabilitiesResponse,
    wholesaleReadinessResponse,
    qualityMetricsResponse,
    providerReviewsResponse,
  ] = await Promise.all([
    supabase
      .from("provider_capabilities")
      .select("*")
      .in("provider_profile_id", providerProfileIds),
    supabase
      .from("provider_wholesale_readiness")
      .select("*")
      .in("provider_profile_id", providerProfileIds),
    supabase
      .from("provider_quality_metrics")
      .select("*")
      .in("provider_profile_id", providerProfileIds),
    supabase
      .from("admin_provider_reviews")
      .select("*")
      .in("provider_profile_id", providerProfileIds)
      .order("created_at", { ascending: false }),
  ]);

  if (providerCapabilitiesResponse.error) {
    throw new Error(providerCapabilitiesResponse.error.message);
  }

  if (wholesaleReadinessResponse.error) {
    throw new Error(wholesaleReadinessResponse.error.message);
  }

  if (qualityMetricsResponse.error) {
    throw new Error(qualityMetricsResponse.error.message);
  }

  if (providerReviewsResponse.error) {
    throw new Error(providerReviewsResponse.error.message);
  }

  const capabilityMap = new Map(
    (
      (providerCapabilitiesResponse.data as ProviderCapabilityRow[] | null) ?? []
    ).map((record) => [record.provider_profile_id, record]),
  );
  const wholesaleReadinessMap = new Map(
    (
      (wholesaleReadinessResponse.data as ProviderWholesaleReadinessRow[] | null) ??
      []
    ).map((record) => [record.provider_profile_id, record]),
  );
  const qualityMetricsMap = new Map(
    (
      (qualityMetricsResponse.data as ProviderQualityMetricsRow[] | null) ?? []
    ).map((record) => [record.provider_profile_id, record]),
  );

  const latestReviewMap = new Map<string, AdminProviderReviewRow>();
  for (const review of (providerReviewsResponse.data as AdminProviderReviewRow[] | null) ?? []) {
    if (!latestReviewMap.has(review.provider_profile_id)) {
      latestReviewMap.set(review.provider_profile_id, review);
    }
  }

  const providerItems = providerProfiles.map((providerProfile) => ({
    providerProfile,
    capability: capabilityMap.get(providerProfile.id) ?? null,
    wholesaleReadiness: wholesaleReadinessMap.get(providerProfile.id) ?? null,
    qualityMetrics: qualityMetricsMap.get(providerProfile.id) ?? null,
    latestReview: latestReviewMap.get(providerProfile.id) ?? null,
  }));

  const queueItems = providerItems.filter(
    ({ providerProfile }) => providerProfile.verification_status === "pending",
  );
  const verifiedItems = providerItems.filter(
    ({ providerProfile }) => providerProfile.verification_status === "verified",
  );
  const openCapacityUnits = providerItems.reduce((total, item) => {
    return (
      total +
      Math.max(
        item.providerProfile.daily_capacity_units -
          item.providerProfile.current_capacity_used,
        0,
      )
    );
  }, 0);

  return {
    persistenceMode: "supabase",
    providerItems,
    queueItems,
    verifiedItems,
    totalProviders: providerItems.length,
    reviewQueueCount: queueItems.length,
    verifiedCount: verifiedItems.length,
    openCapacityUnits,
  };
}

export async function saveAdminProviderReview(
  formData: FormData,
  reviewerProfileId: string,
) {
  const providerProfileId = getRequiredString(formData, "providerProfileId");
  const decision = getReviewDecision(formData, "decision");
  const reviewNotes = getOptionalString(formData, "reviewNotes");
  const tierAfterReview = getProviderTier(formData, "tierAfterReview");
  const verificationStatusAfterReview =
    mapDecisionToVerificationStatus(decision);

  const supabase = createSupabaseServiceRoleClient();

  const reviewRecord: AdminProviderReviewInsert = {
    provider_profile_id: providerProfileId,
    reviewer_profile_id: reviewerProfileId,
    decision,
    tier_after_review: tierAfterReview,
    verification_status_after_review: verificationStatusAfterReview,
    review_notes: reviewNotes,
  };

  const { error: reviewError } = await supabase
    .from("admin_provider_reviews")
    .insert(reviewRecord as never);

  if (reviewError) {
    throw new Error(reviewError.message);
  }

  const providerProfileUpdate: ProviderProfileUpdate = {
    verification_status: verificationStatusAfterReview,
    tier: tierAfterReview,
  };

  const { error: providerUpdateError } = await supabase
    .from("provider_profiles")
    .update(providerProfileUpdate as never)
    .eq("id", providerProfileId);

  if (providerUpdateError) {
    throw new Error(providerUpdateError.message);
  }

  return { success: true };
}

export function getReviewDecisionOptions(): ReviewDecision[] {
  return ["pending", "approved", "rejected", "needs_changes"];
}

export function getProviderTierOptions(): ProviderTier[] {
  return ["emerging", "verified", "preferred"];
}

function getEmptyAdminReviewData(
  persistenceMode: "unconfigured" | "supabase",
): AdminReviewData {
  return {
    persistenceMode,
    providerItems: [],
    queueItems: [],
    verifiedItems: [],
    totalProviders: 0,
    reviewQueueCount: 0,
    verifiedCount: 0,
    openCapacityUnits: 0,
  };
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required form field: ${key}`);
  }

  return value;
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  return value.trim().length > 0 ? value.trim() : null;
}

function getReviewDecision(formData: FormData, key: string): ReviewDecision {
  const value = getRequiredString(formData, key);

  if (
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "needs_changes"
  ) {
    return value;
  }

  throw new Error(`Invalid review decision: ${value}`);
}

function getProviderTier(formData: FormData, key: string): ProviderTier {
  const value = getRequiredString(formData, key);

  if (value === "emerging" || value === "verified" || value === "preferred") {
    return value;
  }

  throw new Error(`Invalid provider tier: ${value}`);
}

function mapDecisionToVerificationStatus(
  decision: ReviewDecision,
): VerificationStatus {
  switch (decision) {
    case "approved":
      return "verified";
    case "rejected":
      return "rejected";
    case "pending":
    case "needs_changes":
      return "pending";
  }
}
