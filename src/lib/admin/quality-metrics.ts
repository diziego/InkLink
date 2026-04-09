import {
  createSupabaseServiceRoleClient,
  ensureDevelopmentAuthIdentity,
} from "@/lib/supabase";
import type { Database } from "@/types";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type UserRoleInsert = Database["public"]["Tables"]["user_roles"]["Insert"];
type ProviderQualityMetricsInsert =
  Database["public"]["Tables"]["provider_quality_metrics"]["Insert"];

export async function saveProviderQualityMetrics(formData: FormData) {
  const providerProfileId = getRequiredString(formData, "providerProfileId");
  const identity = await ensureDevelopmentAuthIdentity({
    envKey: "DEV_ADMIN_EMAIL",
    fallbackEmail: "admin-demo@inklink.local",
  });
  const supabase = createSupabaseServiceRoleClient();

  const profileRecord: ProfileInsert = {
    id: identity.profileId,
    display_name: "InkLink Admin Reviewer",
    email: identity.email,
  };

  const profileUpsertResponse = await supabase
    .from("profiles")
    .upsert(profileRecord as never, { onConflict: "id" });

  if (profileUpsertResponse.error) {
    throw new Error(profileUpsertResponse.error.message);
  }

  const userRoleRecord: UserRoleInsert = {
    profile_id: identity.profileId,
    role: "admin",
  };

  const userRoleUpsertResponse = await supabase
    .from("user_roles")
    .upsert(userRoleRecord as never, { onConflict: "profile_id,role" });

  if (userRoleUpsertResponse.error) {
    throw new Error(userRoleUpsertResponse.error.message);
  }

  const qualityMetricsRecord: ProviderQualityMetricsInsert = {
    provider_profile_id: providerProfileId,
    quality_score: parseDecimal(getRequiredString(formData, "qualityScore")),
    reliability_score: parseDecimal(
      getRequiredString(formData, "reliabilityScore"),
    ),
    reprint_rate: parseRate(getRequiredString(formData, "reprintRatePercent")),
    on_time_delivery_rate: parseRate(
      getRequiredString(formData, "onTimeDeliveryRatePercent"),
    ),
    average_rating: parseDecimal(getRequiredString(formData, "averageRating")),
    completed_orders: parseInteger(getRequiredString(formData, "completedOrders")),
    last_reviewed_at: new Date().toISOString(),
  };

  const qualityMetricsUpsertResponse = await supabase
    .from("provider_quality_metrics")
    .upsert(qualityMetricsRecord as never, {
      onConflict: "provider_profile_id",
    });

  if (qualityMetricsUpsertResponse.error) {
    throw new Error(qualityMetricsUpsertResponse.error.message);
  }

  return { success: true };
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required form field: ${key}`);
  }

  return value.trim();
}

function parseInteger(value: string) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function parseDecimal(value: string) {
  const parsedValue = Number.parseFloat(value);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function parseRate(percentValue: string) {
  const parsedValue = Number.parseFloat(percentValue);

  if (Number.isNaN(parsedValue)) {
    return 0;
  }

  return Math.max(0, Math.min(parsedValue, 100)) / 100;
}
