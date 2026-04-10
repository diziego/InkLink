"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { getProviderProfileId } from "@/lib/provider/orders";
import type { OrderStatus } from "@/lib/provider/orders";
import { createSupabaseServiceRoleClient } from "@/lib/supabase";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
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

  const updateResult = await (supabase.from("merchant_orders") as any)
    .update({ status: nextStatus })
    .eq("id", merchantOrderId);

  if (updateResult.error) throw new Error(updateResult.error.message);

  revalidatePath("/provider");
}
