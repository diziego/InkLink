import {
  mockProviderCapabilities,
  mockProviderQualityMetrics,
  mockProviders,
} from "@/lib/mock-data";
import {
  createSupabaseServiceRoleClient,
  ensureDevelopmentAuthIdentity,
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";
import { formatValue } from "@/lib/format";
import type { Database } from "@/types";

const fallbackProvider = mockProviders[0];
const fallbackCapability = mockProviderCapabilities.find(
  (capability) => capability.providerId === fallbackProvider.id,
);
const fallbackQuality = mockProviderQualityMetrics.find(
  (metrics) => metrics.providerId === fallbackProvider.id,
);

export const PROVIDER_PRINT_METHOD_OPTIONS = [
  "dtg",
  "dtf",
  "screen_print",
  "embroidery",
  "heat_transfer",
] as const;

export const PROVIDER_GARMENT_TYPE_OPTIONS = [
  "t_shirt",
  "long_sleeve",
  "hoodie",
  "crewneck",
  "tank",
  "tote",
] as const;

type PrintMethod = Database["public"]["Enums"]["print_method"];
type GarmentType = Database["public"]["Enums"]["garment_type"];
type ProviderProfileRow = Database["public"]["Tables"]["provider_profiles"]["Row"];
type ProviderCapabilityRow =
  Database["public"]["Tables"]["provider_capabilities"]["Row"];
type ProviderWholesaleReadinessRow =
  Database["public"]["Tables"]["provider_wholesale_readiness"]["Row"];
type ProviderQualityMetricsRow =
  Database["public"]["Tables"]["provider_quality_metrics"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type UserRoleInsert = Database["public"]["Tables"]["user_roles"]["Insert"];
type ProviderProfileInsert =
  Database["public"]["Tables"]["provider_profiles"]["Insert"];
type ProviderCapabilityInsert =
  Database["public"]["Tables"]["provider_capabilities"]["Insert"];
type ProviderWholesaleReadinessInsert =
  Database["public"]["Tables"]["provider_wholesale_readiness"]["Insert"];

export type ProviderOnboardingFormValues = {
  businessName: string;
  legalBusinessName: string;
  dbaName: string;
  contactName: string;
  businessEmail: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  sellersPermitNumber: string;
  einPlaceholder: string;
  businessType: string;
  yearsInOperation: string;
  serviceRadiusMiles: string;
  supportsLocalPickup: boolean;
  turnaroundSlaDays: string;
  dailyCapacityUnits: string;
  currentCapacityUsed: string;
  fulfillmentCutoffTime: string;
  reorderLeadTimeDays: string;
  printMethods: PrintMethod[];
  garmentTypes: GarmentType[];
  maxOrderQuantity: string;
  acceptsPremiumBlanks: boolean;
  specialties: string;
  supplierAccountReadiness: string;
  preferredBlankDistributors: string;
  blankSourcingNotes: string;
};

export type ProviderOnboardingData = {
  values: ProviderOnboardingFormValues;
  qualityScoreLabel: string;
  persistenceMode: "mock" | "supabase";
  hasPersistedRecord: boolean;
  developmentProviderEmail?: string;
  lastSavedAt?: string;
};

type DevelopmentProviderIdentity = {
  profileId: string;
  email: string;
};

export async function loadProviderOnboardingData(): Promise<ProviderOnboardingData> {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    return {
      values: getMockFormValues(),
      qualityScoreLabel: `${fallbackQuality?.qualityScore ?? 0}/100`,
      persistenceMode: "mock",
      hasPersistedRecord: false,
    };
  }

  const identity = await ensureDevelopmentProviderIdentity();
  const supabase = createSupabaseServiceRoleClient();

  const providerProfileResponse = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("profile_id", identity.profileId)
    .maybeSingle();
  const providerProfile = providerProfileResponse.data as ProviderProfileRow | null;

  if (!providerProfile) {
    return {
      values: getMockFormValues(identity.email),
      qualityScoreLabel: `${fallbackQuality?.qualityScore ?? 0}/100`,
      persistenceMode: "supabase",
      hasPersistedRecord: false,
      developmentProviderEmail: identity.email,
    };
  }

  const providerProfileId = providerProfile.id;
  const providerCapabilityResponse = await supabase
    .from("provider_capabilities")
    .select("*")
    .eq("provider_profile_id", providerProfileId)
    .maybeSingle();
  const providerCapability =
    providerCapabilityResponse.data as ProviderCapabilityRow | null;
  const wholesaleReadinessResponse = await supabase
    .from("provider_wholesale_readiness")
    .select("*")
    .eq("provider_profile_id", providerProfileId)
    .maybeSingle();
  const wholesaleReadiness =
    wholesaleReadinessResponse.data as ProviderWholesaleReadinessRow | null;
  const qualityMetricsResponse = await supabase
    .from("provider_quality_metrics")
    .select("*")
    .eq("provider_profile_id", providerProfileId)
    .maybeSingle();
  const qualityMetrics =
    qualityMetricsResponse.data as ProviderQualityMetricsRow | null;

  if (!providerCapability || !wholesaleReadiness) {
    return {
      values: getMockFormValues(identity.email),
      qualityScoreLabel: `${fallbackQuality?.qualityScore ?? 0}/100`,
      persistenceMode: "supabase",
      hasPersistedRecord: false,
      developmentProviderEmail: identity.email,
    };
  }

  return {
    values: {
      businessName: providerProfile.business_name,
      legalBusinessName: wholesaleReadiness.legal_business_name,
      dbaName: wholesaleReadiness.dba_name ?? "",
      contactName: providerProfile.contact_name,
      businessEmail: wholesaleReadiness.business_email,
      phone: wholesaleReadiness.phone,
      streetAddress: wholesaleReadiness.street_address,
      city: providerProfile.city,
      state: providerProfile.state,
      zip: providerProfile.zip,
      sellersPermitNumber: wholesaleReadiness.sellers_permit_number ?? "",
      einPlaceholder: wholesaleReadiness.ein_placeholder ?? "",
      businessType: wholesaleReadiness.business_type ?? "",
      yearsInOperation: `${wholesaleReadiness.years_in_operation ?? 0}`,
      serviceRadiusMiles: `${providerProfile.service_radius_miles}`,
      supportsLocalPickup: providerProfile.supports_local_pickup,
      turnaroundSlaDays: `${providerProfile.turnaround_sla_days}`,
      dailyCapacityUnits: `${providerProfile.daily_capacity_units}`,
      currentCapacityUsed: `${providerProfile.current_capacity_used}`,
      fulfillmentCutoffTime: wholesaleReadiness.fulfillment_cutoff_time ?? "",
      reorderLeadTimeDays: `${wholesaleReadiness.reorder_lead_time_days ?? 0}`,
      printMethods: providerCapability.print_methods,
      garmentTypes: providerCapability.garment_types,
      maxOrderQuantity: `${providerCapability.max_order_quantity}`,
      acceptsPremiumBlanks: providerCapability.accepts_premium_blanks,
      specialties: providerProfile.specialties.join(", "),
      supplierAccountReadiness:
        wholesaleReadiness.supplier_account_readiness.join(", "),
      preferredBlankDistributors:
        wholesaleReadiness.preferred_blank_distributors.join(", "),
      blankSourcingNotes: wholesaleReadiness.blank_sourcing_notes ?? "",
    },
    qualityScoreLabel: `${qualityMetrics?.quality_score ?? fallbackQuality?.qualityScore ?? 0}/100`,
    persistenceMode: "supabase",
    hasPersistedRecord: true,
    developmentProviderEmail: identity.email,
    lastSavedAt:
      wholesaleReadiness.updated_at ?? providerCapability.updated_at ?? providerProfile.updated_at,
  };
}

export async function saveProviderOnboardingData(
  formData: FormData,
): Promise<{ success: true }> {
  const identity = await ensureDevelopmentProviderIdentity();
  const values = parseProviderOnboardingFormData(formData, identity.email);
  const supabase = createSupabaseServiceRoleClient();
  const profileRecord: ProfileInsert = {
    id: identity.profileId,
    display_name: values.contactName,
    email: identity.email,
  };

  await supabase
    .from("profiles")
    .upsert(profileRecord as never, { onConflict: "id" });

  const userRoleRecord: UserRoleInsert = {
    profile_id: identity.profileId,
    role: "provider",
  };

  await supabase
    .from("user_roles")
    .upsert(userRoleRecord as never, { onConflict: "profile_id,role" });

  const providerProfileRecord: ProviderProfileInsert = {
    profile_id: identity.profileId,
    business_name: values.businessName,
    contact_name: values.contactName,
    city: values.city,
    state: values.state,
    zip: values.zip,
    service_radius_miles: parseInteger(values.serviceRadiusMiles),
    supports_local_pickup: values.supportsLocalPickup,
    turnaround_sla_days: parseInteger(values.turnaroundSlaDays),
    daily_capacity_units: parseInteger(values.dailyCapacityUnits),
    current_capacity_used: parseInteger(values.currentCapacityUsed),
    specialties: splitCommaSeparatedValues(values.specialties),
  };

  const providerProfileResponse = await supabase
    .from("provider_profiles")
    .upsert(providerProfileRecord as never, { onConflict: "profile_id" })
    .select("id")
    .single();
  const providerProfile = providerProfileResponse.data as Pick<
    ProviderProfileRow,
    "id"
  > | null;
  const providerProfileError = providerProfileResponse.error;

  if (providerProfileError || !providerProfile) {
    throw new Error(
      providerProfileError?.message ?? "Failed to save provider profile.",
    );
  }

  const providerCapabilitiesRecord: ProviderCapabilityInsert = {
    provider_profile_id: providerProfile.id,
    print_methods: values.printMethods,
    garment_types: values.garmentTypes,
    max_order_quantity: parseInteger(values.maxOrderQuantity),
    accepts_premium_blanks: values.acceptsPremiumBlanks,
    notes: "Saved from provider onboarding development form.",
  };

  await supabase
    .from("provider_capabilities")
    .upsert(providerCapabilitiesRecord as never, {
      onConflict: "provider_profile_id",
    });

  const wholesaleReadinessRecord: ProviderWholesaleReadinessInsert = {
    provider_profile_id: providerProfile.id,
    legal_business_name: values.legalBusinessName,
    dba_name: values.dbaName || null,
    business_email: values.businessEmail,
    phone: values.phone,
    street_address: values.streetAddress,
    sellers_permit_number: values.sellersPermitNumber || null,
    ein_placeholder: values.einPlaceholder || null,
    business_type: values.businessType || null,
    years_in_operation: parseNullableInteger(values.yearsInOperation),
    supplier_account_readiness: splitCommaSeparatedValues(
      values.supplierAccountReadiness,
    ),
    preferred_blank_distributors: splitCommaSeparatedValues(
      values.preferredBlankDistributors,
    ),
    fulfillment_cutoff_time: values.fulfillmentCutoffTime || null,
    reorder_lead_time_days: parseNullableInteger(values.reorderLeadTimeDays),
    blank_sourcing_notes: values.blankSourcingNotes || null,
  };

  await supabase
    .from("provider_wholesale_readiness")
    .upsert(wholesaleReadinessRecord as never, {
      onConflict: "provider_profile_id",
    });

  return { success: true };
}

export function getPrintMethodOptionLabel(value: PrintMethod) {
  return formatValue(value);
}

export function getGarmentTypeOptionLabel(value: GarmentType) {
  return formatValue(value);
}

async function ensureDevelopmentProviderIdentity(): Promise<DevelopmentProviderIdentity> {
  return ensureDevelopmentAuthIdentity({
    envKey: "DEV_PROVIDER_EMAIL",
    fallbackEmail: "provider-demo@inklink.local",
  });
}

function getMockFormValues(
  developmentProviderEmail = fallbackProvider.businessEmail,
): ProviderOnboardingFormValues {
  return {
    businessName: fallbackProvider.businessName,
    legalBusinessName: fallbackProvider.legalBusinessName,
    dbaName: fallbackProvider.dbaName ?? "",
    contactName: fallbackProvider.contactName,
    businessEmail: developmentProviderEmail,
    phone: fallbackProvider.phone,
    streetAddress: fallbackProvider.streetAddress,
    city: fallbackProvider.city,
    state: fallbackProvider.state,
    zip: fallbackProvider.zip,
    sellersPermitNumber: fallbackProvider.sellersPermitNumber,
    einPlaceholder: fallbackProvider.einPlaceholder,
    businessType: fallbackProvider.businessType,
    yearsInOperation: `${fallbackProvider.yearsInOperation}`,
    serviceRadiusMiles: `${fallbackProvider.serviceRadiusMiles}`,
    supportsLocalPickup: fallbackProvider.supportsLocalPickup,
    turnaroundSlaDays: `${fallbackProvider.turnaroundSlaDays}`,
    dailyCapacityUnits: `${fallbackProvider.dailyCapacityUnits}`,
    currentCapacityUsed: `${fallbackProvider.currentCapacityUsed}`,
    fulfillmentCutoffTime: fallbackProvider.fulfillmentCutoffTime,
    reorderLeadTimeDays: `${fallbackProvider.reorderLeadTimeDays}`,
    printMethods: fallbackCapability?.printMethods ?? ["dtg"],
    garmentTypes: fallbackCapability?.garmentTypes ?? ["t_shirt"],
    maxOrderQuantity: `${fallbackCapability?.maxOrderQuantity ?? 0}`,
    acceptsPremiumBlanks: fallbackCapability?.acceptsPremiumBlanks ?? false,
    specialties: fallbackProvider.specialties.join(", "),
    supplierAccountReadiness:
      fallbackProvider.supplierAccountReadiness.join(", "),
    preferredBlankDistributors:
      fallbackProvider.preferredBlankDistributors.join(", "),
    blankSourcingNotes: fallbackProvider.blankSourcingNotes,
  };
}

function parseProviderOnboardingFormData(
  formData: FormData,
  developmentProviderEmail: string,
): ProviderOnboardingFormValues {
  return {
    businessName: getString(formData, "businessName", fallbackProvider.businessName),
    legalBusinessName: getString(
      formData,
      "legalBusinessName",
      fallbackProvider.legalBusinessName,
    ),
    dbaName: getString(formData, "dbaName", fallbackProvider.dbaName ?? ""),
    contactName: getString(formData, "contactName", fallbackProvider.contactName),
    businessEmail: getString(
      formData,
      "businessEmail",
      developmentProviderEmail,
    ),
    phone: getString(formData, "phone", fallbackProvider.phone),
    streetAddress: getString(
      formData,
      "streetAddress",
      fallbackProvider.streetAddress,
    ),
    city: getString(formData, "city", fallbackProvider.city),
    state: getString(formData, "state", fallbackProvider.state),
    zip: getString(formData, "zip", fallbackProvider.zip),
    sellersPermitNumber: getString(
      formData,
      "sellersPermitNumber",
      fallbackProvider.sellersPermitNumber,
    ),
    einPlaceholder: getString(
      formData,
      "einPlaceholder",
      fallbackProvider.einPlaceholder,
    ),
    businessType: getString(
      formData,
      "businessType",
      fallbackProvider.businessType,
    ),
    yearsInOperation: getString(
      formData,
      "yearsInOperation",
      `${fallbackProvider.yearsInOperation}`,
    ),
    serviceRadiusMiles: getString(
      formData,
      "serviceRadiusMiles",
      `${fallbackProvider.serviceRadiusMiles}`,
    ),
    supportsLocalPickup: getBoolean(formData, "supportsLocalPickup"),
    turnaroundSlaDays: getString(
      formData,
      "turnaroundSlaDays",
      `${fallbackProvider.turnaroundSlaDays}`,
    ),
    dailyCapacityUnits: getString(
      formData,
      "dailyCapacityUnits",
      `${fallbackProvider.dailyCapacityUnits}`,
    ),
    currentCapacityUsed: getString(
      formData,
      "currentCapacityUsed",
      `${fallbackProvider.currentCapacityUsed}`,
    ),
    fulfillmentCutoffTime: getString(
      formData,
      "fulfillmentCutoffTime",
      fallbackProvider.fulfillmentCutoffTime,
    ),
    reorderLeadTimeDays: getString(
      formData,
      "reorderLeadTimeDays",
      `${fallbackProvider.reorderLeadTimeDays}`,
    ),
    printMethods: getArray<PrintMethod>(formData, "printMethods"),
    garmentTypes: getArray<GarmentType>(formData, "garmentTypes"),
    maxOrderQuantity: getString(
      formData,
      "maxOrderQuantity",
      `${fallbackCapability?.maxOrderQuantity ?? 0}`,
    ),
    acceptsPremiumBlanks: getBoolean(formData, "acceptsPremiumBlanks"),
    specialties: getString(
      formData,
      "specialties",
      fallbackProvider.specialties.join(", "),
    ),
    supplierAccountReadiness: getString(
      formData,
      "supplierAccountReadiness",
      fallbackProvider.supplierAccountReadiness.join(", "),
    ),
    preferredBlankDistributors: getString(
      formData,
      "preferredBlankDistributors",
      fallbackProvider.preferredBlankDistributors.join(", "),
    ),
    blankSourcingNotes: getString(
      formData,
      "blankSourcingNotes",
      fallbackProvider.blankSourcingNotes,
    ),
  };
}

function getString(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "true";
}

function getArray<T extends string>(formData: FormData, key: string): T[] {
  return formData.getAll(key).filter((value): value is T => typeof value === "string");
}

function splitCommaSeparatedValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInteger(value: string) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function parseNullableInteger(value: string) {
  const parsedValue = Number.parseInt(value, 10);

  return Number.isNaN(parsedValue) ? null : parsedValue;
}
