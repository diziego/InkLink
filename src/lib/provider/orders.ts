import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type { FulfillmentGoal, GarmentType } from "@/types";

export type OrderStatus =
  | "draft"
  | "ready_for_routing"
  | "routed"
  | "accepted"
  | "in_production"
  | "ready"
  | "shipped"
  | "completed"
  | "cancelled";

export type ProviderAssignment = {
  id: string;
  merchantOrderId: string;
  status: "pending" | "accepted" | "declined";
  assignedAt: string;
  respondedAt: string | null;
  // Order details joined in
  garmentType: GarmentType;
  quantity: number;
  fulfillmentZip: string;
  fulfillmentGoal: FulfillmentGoal;
  orderStatus: OrderStatus;
};

export type ProviderAssignments = {
  pending: ProviderAssignment[];
  accepted: ProviderAssignment[];
};

/**
 * Load pending and accepted assignments for the given provider profile ID.
 * Declined assignments are excluded — they have no inbox value.
 */
export async function loadProviderAssignments(
  providerProfileId: string,
): Promise<ProviderAssignments> {
  const supabase = createSupabaseServiceRoleClient();

  // Load assignments for this provider (pending + accepted only)
  const assignmentsResult = await (supabase.from("order_assignments") as any)
    .select("id, merchant_order_id, status, assigned_at, responded_at")
    .eq("provider_profile_id", providerProfileId)
    .in("status", ["pending", "accepted"])
    .order("assigned_at", { ascending: false });

  if (assignmentsResult.error) {
    throw new Error(assignmentsResult.error.message);
  }

  const assignments = (assignmentsResult.data ?? []) as Array<{
    id: string;
    merchant_order_id: string;
    status: "pending" | "accepted" | "declined";
    assigned_at: string;
    responded_at: string | null;
  }>;

  if (assignments.length === 0) return { pending: [], accepted: [] };

  const orderIds = assignments.map((a) => a.merchant_order_id);

  // Load merchant orders
  const ordersResult = await (supabase.from("merchant_orders") as any)
    .select("id, fulfillment_zip, fulfillment_goal, status")
    .in("id", orderIds);

  if (ordersResult.error) throw new Error(ordersResult.error.message);

  const ordersById = new Map<
    string,
    { fulfillment_zip: string; fulfillment_goal: string; status: string }
  >();
  for (const row of ordersResult.data ?? []) {
    ordersById.set(row.id, row);
  }

  // Load first item per order for garment/quantity
  const itemsResult = await (supabase.from("merchant_order_items") as any)
    .select("merchant_order_id, garment_type, quantity")
    .in("merchant_order_id", orderIds);

  if (itemsResult.error) throw new Error(itemsResult.error.message);

  const itemsByOrder = new Map<
    string,
    { garment_type: string; quantity: number }
  >();
  for (const row of itemsResult.data ?? []) {
    if (!itemsByOrder.has(row.merchant_order_id)) {
      itemsByOrder.set(row.merchant_order_id, row);
    }
  }

  const adapted = assignments.map((a) => {
    const order = ordersById.get(a.merchant_order_id);
    const item = itemsByOrder.get(a.merchant_order_id);
    return {
      id: a.id,
      merchantOrderId: a.merchant_order_id,
      status: a.status,
      assignedAt: a.assigned_at,
      respondedAt: a.responded_at,
      garmentType: (item?.garment_type ?? "t_shirt") as GarmentType,
      quantity: item?.quantity ?? 0,
      fulfillmentZip: order?.fulfillment_zip ?? "",
      fulfillmentGoal: (order?.fulfillment_goal ?? "local_first") as FulfillmentGoal,
      orderStatus: (order?.status ?? "accepted") as OrderStatus,
    };
  });

  return {
    pending: adapted.filter((a) => a.status === "pending"),
    accepted: adapted.filter((a) => a.status === "accepted"),
  };
}

/**
 * Resolve the provider_profiles.id for the given auth user ID.
 * Returns null if no provider profile exists.
 */
export async function getProviderProfileId(
  profileId: string,
): Promise<string | null> {
  const supabase = createSupabaseServiceRoleClient();

  const result = await (supabase.from("provider_profiles") as any)
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (result.error) throw new Error(result.error.message);
  return (result.data as { id: string } | null)?.id ?? null;
}
