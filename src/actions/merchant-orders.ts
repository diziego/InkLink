"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import {
  assignTopProviders,
  saveMerchantOrder,
  saveCartOrder,
  selectProviderForOrder,
} from "@/lib/merchant/orders";
import type { SaveCartOrderInput } from "@/lib/merchant/orders";
import {
  hasSupabaseBrowserEnv,
  hasSupabaseServiceRoleEnv,
} from "@/lib/supabase";
import type { FulfillmentGoal, GarmentType } from "@/types";

const validFulfillmentGoals: FulfillmentGoal[] = [
  "local_first",
  "fastest_turnaround",
  "lowest_cost",
  "premium_blank",
];

const validGarmentTypes: GarmentType[] = [
  "t_shirt",
  "long_sleeve",
  "hoodie",
  "crewneck",
  "tank",
  "tote",
];

export async function submitMerchantOrderAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    // Supabase not configured — fall back to URL-driven routing preview
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        params.set(key, value);
      }
    }
    redirect(`/merchant?${params.toString()}`);
  }

  const user = await requireRole("merchant");

  const fulfillmentZip = String(formData.get("fulfillmentZip") ?? "").trim();
  const rawGoal = String(formData.get("fulfillmentGoal") ?? "");
  const rawGarment = String(formData.get("garmentType") ?? "");
  const rawQuantity = Number.parseInt(
    String(formData.get("quantity") ?? "1"),
    10,
  );
  const preferredBlankBrand = String(
    formData.get("preferredBlankBrand") ?? "",
  ).trim();
  const preferredBlankStyle = String(
    formData.get("preferredBlankStyle") ?? "",
  ).trim();
  // Checkbox posts "true" when checked; hidden field posts "false" as fallback
  const localPickupValues = formData.getAll("localPickupPreferred");
  const localPickupPreferred = localPickupValues.includes("true");

  const fulfillmentGoal = validFulfillmentGoals.includes(
    rawGoal as FulfillmentGoal,
  )
    ? (rawGoal as FulfillmentGoal)
    : "local_first";

  const garmentType = validGarmentTypes.includes(rawGarment as GarmentType)
    ? (rawGarment as GarmentType)
    : "t_shirt";

  const quantity = Number.isNaN(rawQuantity)
    ? 1
    : Math.max(1, Math.min(rawQuantity, 500));

  const orderInput = {
    fulfillmentZip: fulfillmentZip || "00000",
    fulfillmentGoal,
    localPickupPreferred,
    garmentType,
    quantity,
    preferredBlankBrand,
    preferredBlankStyle,
  };

  const orderId = await saveMerchantOrder(user.id, orderInput);

  // Auto-assign top 3 providers from routing. Fire-and-forget style:
  // if no providers are configured the function exits silently.
  await assignTopProviders(orderId, orderInput);

  redirect(`/merchant?orderId=${orderId}`);
}

export async function submitCartAction(formData: FormData) {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/merchant");
  }

  const user = await requireRole("merchant");

  const fulfillmentZip = String(formData.get("fulfillmentZip") ?? "").trim();
  const rawGoal = String(formData.get("fulfillmentGoal") ?? "");
  const localPickupValues = formData.getAll("localPickupPreferred");
  const localPickupPreferred = localPickupValues.includes("true");

  const fulfillmentGoal = validFulfillmentGoals.includes(rawGoal as FulfillmentGoal)
    ? (rawGoal as FulfillmentGoal)
    : "local_first";

  // Cart items are serialized as JSON in a hidden field
  let rawItems: Array<{
    garmentType: string;
    preferredBlankBrand: string;
    preferredBlankStyle: string;
  }> = [];
  try {
    rawItems = JSON.parse(String(formData.get("cartItemsJson") ?? "[]"));
  } catch {
    rawItems = [];
  }

  if (rawItems.length === 0) {
    redirect("/merchant");
  }

  // Quantities come from individual named inputs quantity_0, quantity_1, …
  const items: SaveCartOrderInput["items"] = rawItems.map((item, i) => {
    const rawQty = Number.parseInt(
      String(formData.get(`quantity_${i}`) ?? "24"),
      10,
    );
    const quantity = Number.isNaN(rawQty) ? 24 : Math.max(1, Math.min(rawQty, 500));
    const garmentType = validGarmentTypes.includes(item.garmentType as GarmentType)
      ? (item.garmentType as GarmentType)
      : "t_shirt";
    return {
      garmentType,
      quantity,
      preferredBlankBrand: item.preferredBlankBrand,
      preferredBlankStyle: item.preferredBlankStyle,
    };
  });

  const orderId = await saveCartOrder(user.id, {
    fulfillmentZip: fulfillmentZip || "00000",
    fulfillmentGoal,
    localPickupPreferred,
    items,
  });

  // Route using the first item for now
  const firstItem = items[0];
  if (firstItem) {
    await assignTopProviders(orderId, {
      fulfillmentZip: fulfillmentZip || "00000",
      fulfillmentGoal,
      localPickupPreferred,
      garmentType: firstItem.garmentType,
      quantity: firstItem.quantity,
      preferredBlankBrand: firstItem.preferredBlankBrand,
      preferredBlankStyle: firstItem.preferredBlankStyle,
    });
  }

  redirect(`/merchant?orderId=${orderId}`);
}

export async function selectProviderAction(formData: FormData): Promise<void> {
  if (!hasSupabaseBrowserEnv() || !hasSupabaseServiceRoleEnv()) {
    redirect("/merchant");
  }

  const user = await requireRole("merchant");

  const orderId = String(formData.get("orderId") ?? "").trim();
  const providerProfileId = String(
    formData.get("providerProfileId") ?? "",
  ).trim();
  const rawEstimate = parseInt(
    String(formData.get("estimatedPriceCents") ?? ""),
    10,
  );
  const estimatedPriceCents = isNaN(rawEstimate) ? null : rawEstimate;

  if (!orderId || !providerProfileId) {
    redirect("/merchant");
  }

  await selectProviderForOrder(orderId, user.id, providerProfileId, estimatedPriceCents);
  redirect(`/merchant?orderId=${orderId}&providerSelected=1`);
}
