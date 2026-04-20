"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { sendMerchantStatusUpdateNotification } from "@/lib/notifications/orders";
import { getProviderProfileId } from "@/lib/provider/orders";
import type { OrderStatus } from "@/lib/provider/orders";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: "in_production",
  accepted: "in_production",
  in_production: "ready",
  ready: "shipped",
  shipped: "completed",
};

export async function advanceOrderStatusAction(formData: FormData) {
  const user = await requireRole("provider");
  const merchantOrderId = String(formData.get("merchantOrderId") ?? "").trim();
  if (!merchantOrderId) throw new Error("Missing merchantOrderId");

  const providerProfileId = await getProviderProfileId(user.id);
  if (!providerProfileId) throw new Error("Provider profile not found");

  const supabase = createSupabaseServiceRoleClient();

  // Verify this provider has an accepted assignment for this order
  const assignmentResult = await (supabase.from("order_assignments") as any)
    .select("id")
    .eq("merchant_order_id", merchantOrderId)
    .eq("provider_profile_id", providerProfileId)
    .eq("status", "accepted")
    .maybeSingle();

  if (assignmentResult.error) throw new Error(assignmentResult.error.message);
  if (!assignmentResult.data) throw new Error("No accepted assignment found for this order");

  // Fetch current order status
  const orderResult = await (supabase.from("merchant_orders") as any)
    .select("status")
    .eq("id", merchantOrderId)
    .maybeSingle();

  if (orderResult.error) throw new Error(orderResult.error.message);
  if (!orderResult.data) throw new Error("Order not found");

  const currentStatus = orderResult.data.status as OrderStatus;
  const nextStatus = NEXT_STATUS[currentStatus];

  if (!nextStatus) {
    throw new Error(`No valid next status from '${currentStatus}'`);
  }

  await updateFulfillmentDetailsForProvider(
    merchantOrderId,
    providerProfileId,
    formData,
  );

  const updateResult = await (supabase.from("merchant_orders") as any)
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", merchantOrderId);

  if (updateResult.error) throw new Error(updateResult.error.message);

  await sendMerchantStatusUpdateNotification(merchantOrderId, nextStatus);

  revalidatePath("/provider");
  revalidatePath("/merchant");
}

export async function updateFulfillmentDetailsAction(formData: FormData) {
  const user = await requireRole("provider");
  const merchantOrderId = String(formData.get("merchantOrderId") ?? "").trim();
  if (!merchantOrderId) throw new Error("Missing merchantOrderId");

  const providerProfileId = await getProviderProfileId(user.id);
  if (!providerProfileId) throw new Error("Provider profile not found");

  await updateFulfillmentDetailsForProvider(
    merchantOrderId,
    providerProfileId,
    formData,
  );

  revalidatePath("/provider");
  revalidatePath("/merchant");
}

async function updateFulfillmentDetailsForProvider(
  merchantOrderId: string,
  providerProfileId: string,
  formData: FormData,
) {
  const supabase = createSupabaseServiceRoleClient();

  const details = {
    provider_notes: normalizeOptionalText(formData.get("providerNotes")),
    pickup_instructions: normalizeOptionalText(
      formData.get("pickupInstructions"),
    ),
    ready_for_pickup_note: normalizeOptionalText(
      formData.get("readyForPickupNote"),
    ),
    carrier_name: normalizeOptionalText(formData.get("carrierName")),
    tracking_number: normalizeOptionalText(formData.get("trackingNumber")),
    estimated_ready_date: normalizeOptionalDate(
      formData.get("estimatedReadyDate"),
    ),
    shipping_note: normalizeOptionalText(formData.get("shippingNote")),
    fulfillment_details_updated_at: new Date().toISOString(),
  };

  const result = await supabase
    .from("order_assignments")
    .update(details as never)
    .eq("merchant_order_id", merchantOrderId)
    .eq("provider_profile_id", providerProfileId)
    .eq("status", "accepted");

  if (result.error) throw new Error(result.error.message);
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}
