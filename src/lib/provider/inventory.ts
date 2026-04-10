import { mockBlankInventory } from "@/lib/mock-data";
import {
  createSupabaseServiceRoleClient,
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";
import type { Database } from "@/types";

const fallbackProviderId = "provider-echo-park-print-works";
const INVENTORY_EDITOR_ROW_COUNT = 3;

type GarmentType = Database["public"]["Enums"]["garment_type"];
type BlankStockStatus = Database["public"]["Enums"]["blank_stock_status"];
type ProviderProfileRow = Database["public"]["Tables"]["provider_profiles"]["Row"];
type ProviderInventoryRow = Database["public"]["Tables"]["provider_inventory"]["Row"];
type ProviderInventoryInsert =
  Database["public"]["Tables"]["provider_inventory"]["Insert"];

export const PROVIDER_INVENTORY_GARMENT_OPTIONS = [
  "t_shirt",
  "long_sleeve",
  "hoodie",
  "crewneck",
  "tank",
  "tote",
] as const;

export const PROVIDER_INVENTORY_STOCK_OPTIONS = [
  "in_stock",
  "limited",
  "out_of_stock",
] as const;

export type ProviderInventoryFormRow = {
  id: string;
  blankBrand: string;
  styleName: string;
  garmentType: GarmentType;
  colors: string;
  sizes: string;
  stockStatus: BlankStockStatus;
  quantityOnHand: string;
  isPremiumBlank: boolean;
};

export type ProviderInventoryData = {
  persistenceMode: "mock" | "supabase";
  hasProviderProfile: boolean;
  rows: ProviderInventoryFormRow[];
};

export async function loadProviderInventoryData(
  profileId: string,
): Promise<ProviderInventoryData> {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    return {
      persistenceMode: "mock",
      hasProviderProfile: false,
      rows: padInventoryRows(
        mockBlankInventory
          .filter((item) => item.providerId === fallbackProviderId)
          .map((item) => ({
            id: item.id,
            blankBrand: item.blankBrand,
            styleName: item.styleName,
            garmentType: item.garmentType,
            colors: item.colors.join(", "),
            sizes: item.sizes.join(", "),
            stockStatus: item.stockStatus,
            quantityOnHand: `${item.quantityOnHand}`,
            isPremiumBlank: item.isPremiumBlank,
          })),
      ),
    };
  }

  const supabase = createSupabaseServiceRoleClient();
  const providerProfileResponse = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (providerProfileResponse.error) {
    throw new Error(providerProfileResponse.error.message);
  }

  const providerProfile =
    providerProfileResponse.data as ProviderProfileRow | null;

  if (!providerProfile) {
    return {
      persistenceMode: "supabase",
      hasProviderProfile: false,
      rows: padInventoryRows([]),
    };
  }

  const inventoryResponse = await supabase
    .from("provider_inventory")
    .select("*")
    .eq("provider_profile_id", providerProfile.id)
    .order("updated_at", { ascending: false });

  if (inventoryResponse.error) {
    throw new Error(inventoryResponse.error.message);
  }

  const rows = (
    (inventoryResponse.data as ProviderInventoryRow[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    blankBrand: row.blank_brand,
    styleName: row.style_name,
    garmentType: row.garment_type,
    colors: row.colors.join(", "),
    sizes: row.sizes.join(", "),
    stockStatus: row.stock_status,
    quantityOnHand: `${row.quantity_on_hand}`,
    isPremiumBlank: row.is_premium_blank,
  }));

  return {
    persistenceMode: "supabase",
    hasProviderProfile: true,
    rows: padInventoryRows(rows),
  };
}

export async function saveProviderInventoryData(formData: FormData, profileId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const providerProfileResponse = await supabase
    .from("provider_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (providerProfileResponse.error) {
    throw new Error(providerProfileResponse.error.message);
  }

  const providerProfile =
    providerProfileResponse.data as ProviderProfileRow | null;

  if (!providerProfile) {
    throw new Error(
      "Save provider onboarding first before editing merchant-facing blank inventory.",
    );
  }

  const inventoryRecords = parseInventoryFormData(formData).map((row) => {
    const record: ProviderInventoryInsert = {
      provider_profile_id: providerProfile.id,
      blank_brand: row.blankBrand,
      style_name: row.styleName,
      garment_type: row.garmentType,
      colors: splitCommaSeparatedValues(row.colors),
      sizes: splitCommaSeparatedValues(row.sizes),
      stock_status: row.stockStatus,
      quantity_on_hand: parseInteger(row.quantityOnHand),
      is_premium_blank: row.isPremiumBlank,
    };

    return record;
  });

  const deleteResponse = await supabase
    .from("provider_inventory")
    .delete()
    .eq("provider_profile_id", providerProfile.id);

  if (deleteResponse.error) {
    throw new Error(deleteResponse.error.message);
  }

  if (inventoryRecords.length === 0) {
    return { success: true };
  }

  const insertResponse = await supabase
    .from("provider_inventory")
    .insert(inventoryRecords as never);

  if (insertResponse.error) {
    throw new Error(insertResponse.error.message);
  }

  return { success: true };
}

function parseInventoryFormData(formData: FormData): ProviderInventoryFormRow[] {
  return Array.from({ length: INVENTORY_EDITOR_ROW_COUNT }, (_, index) => {
    const row = {
      id: getString(formData, `inventoryRows.${index}.id`),
      blankBrand: getString(formData, `inventoryRows.${index}.blankBrand`),
      styleName: getString(formData, `inventoryRows.${index}.styleName`),
      garmentType: getGarmentType(
        formData,
        `inventoryRows.${index}.garmentType`,
        "t_shirt",
      ),
      colors: getString(formData, `inventoryRows.${index}.colors`),
      sizes: getString(formData, `inventoryRows.${index}.sizes`),
      stockStatus: getStockStatus(
        formData,
        `inventoryRows.${index}.stockStatus`,
        "in_stock",
      ),
      quantityOnHand: getString(formData, `inventoryRows.${index}.quantityOnHand`),
      isPremiumBlank: getBoolean(formData, `inventoryRows.${index}.isPremiumBlank`),
    };

    return row;
  }).filter((row) => row.blankBrand || row.styleName);
}

function padInventoryRows(rows: ProviderInventoryFormRow[]) {
  const paddedRows = [...rows];

  while (paddedRows.length < INVENTORY_EDITOR_ROW_COUNT) {
    paddedRows.push(createEmptyInventoryRow());
  }

  return paddedRows.slice(0, INVENTORY_EDITOR_ROW_COUNT);
}

function createEmptyInventoryRow(): ProviderInventoryFormRow {
  return {
    id: "",
    blankBrand: "",
    styleName: "",
    garmentType: "t_shirt",
    colors: "",
    sizes: "",
    stockStatus: "in_stock",
    quantityOnHand: "0",
    isPremiumBlank: false,
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.getAll(key).some((value) => value === "true");
}

function getGarmentType(
  formData: FormData,
  key: string,
  fallback: GarmentType,
): GarmentType {
  const value = getString(formData, key);

  return PROVIDER_INVENTORY_GARMENT_OPTIONS.includes(value as GarmentType)
    ? (value as GarmentType)
    : fallback;
}

function getStockStatus(
  formData: FormData,
  key: string,
  fallback: BlankStockStatus,
): BlankStockStatus {
  const value = getString(formData, key);

  return PROVIDER_INVENTORY_STOCK_OPTIONS.includes(value as BlankStockStatus)
    ? (value as BlankStockStatus)
    : fallback;
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

