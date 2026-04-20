import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import {
  persistRecommendationSnapshotsForOrder,
  recommendLiveProvidersForOrder,
} from "@/lib/merchant/recommendations";
import { sendPaymentConfirmedNotifications } from "@/lib/notifications/orders";
import type {
  FulfillmentGoal,
  GarmentType,
  MerchantOrder,
  MerchantPaymentSummary,
  MerchantProviderAssignmentSummary,
  OrderItem,
  PaymentStatus,
  PrintMethod,
} from "@/types";
import type { Database, Json } from "@/types/database";

type MerchantOrderRow = Database["public"]["Tables"]["merchant_orders"]["Row"];
type MerchantOrderItemRow =
  Database["public"]["Tables"]["merchant_order_items"]["Row"];
type RecommendationSnapshotRow =
  Database["public"]["Tables"]["recommendation_snapshots"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type OrderAssignmentRow =
  Database["public"]["Tables"]["order_assignments"]["Row"];

export type SaveOrderInput = {
  fulfillmentZip: string;
  fulfillmentGoal: FulfillmentGoal;
  localPickupPreferred: boolean;
  garmentType: GarmentType;
  quantity: number;
  preferredBlankBrand: string;
  preferredBlankStyle: string;
};

export type CartItemInput = {
  garmentType: GarmentType;
  quantity: number;
  preferredBlankBrand: string;
  preferredBlankStyle: string;
};

export type SaveCartOrderInput = {
  fulfillmentZip: string;
  fulfillmentGoal: FulfillmentGoal;
  localPickupPreferred: boolean;
  items: CartItemInput[];
};

export type MerchantOrderSummary = {
  id: string;
  status: string;
  fulfillmentZip: string;
  fulfillmentGoal: FulfillmentGoal;
  garmentType: GarmentType;
  quantity: number;
  createdAt: string;
};

export type MerchantCheckoutPreparation =
  | {
      kind: "payable";
      orderId: string;
      amountCents: number;
      providerProfileId: string;
      providerName: string;
      recommendationSnapshotId: string;
      payment: MerchantPaymentSummary | null;
      customerEmail: string | null;
    }
  | {
      kind: "already_paid";
      orderId: string;
    }
  | {
      kind: "not_payable";
      orderId: string;
      reason: "manual_quote" | "missing_estimate" | "invalid_amount";
      providerName: string;
    };

export async function saveMerchantOrder(
  profileId: string,
  input: SaveOrderInput,
): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();

  const orderInsertResult = await (supabase.from("merchant_orders") as any)
    .insert({
      profile_id: profileId,
      status: "draft",
      fulfillment_zip: input.fulfillmentZip,
      fulfillment_goal: input.fulfillmentGoal,
      local_pickup_preferred: input.localPickupPreferred,
    })
    .select("id")
    .single();
  const orderRow = orderInsertResult.data as { id: string } | null;
  const orderError = orderInsertResult.error as { message: string } | null;

  if (orderError || !orderRow) {
    throw new Error(orderError?.message ?? "Failed to save order");
  }

  const sizes: Json = {
    M: Math.ceil(input.quantity / 2),
    L: Math.floor(input.quantity / 2),
  };

  const itemInsertResult = await (supabase.from("merchant_order_items") as any)
    .insert({
      merchant_order_id: orderRow.id,
      print_method: "dtg",
      garment_type: input.garmentType,
      quantity: input.quantity,
      preferred_blank_brand: input.preferredBlankBrand || null,
      preferred_blank_style: input.preferredBlankStyle || null,
      sizes,
      color: "",
    });
  const itemError = itemInsertResult.error as { message: string } | null;

  if (itemError) {
    throw new Error(itemError.message);
  }

  return orderRow.id;
}

export async function saveCartOrder(
  profileId: string,
  input: SaveCartOrderInput,
): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();

  const orderInsertResult = await (supabase.from("merchant_orders") as any)
    .insert({
      profile_id: profileId,
      status: "draft",
      fulfillment_zip: input.fulfillmentZip || "00000",
      fulfillment_goal: input.fulfillmentGoal,
      local_pickup_preferred: input.localPickupPreferred,
    })
    .select("id")
    .single();
  const orderRow = orderInsertResult.data as { id: string } | null;
  const orderError = orderInsertResult.error as { message: string } | null;
  if (orderError || !orderRow) {
    throw new Error(orderError?.message ?? "Failed to save cart order");
  }

  const itemRows = input.items.map((item) => ({
    merchant_order_id: orderRow.id,
    print_method: "dtg",
    garment_type: item.garmentType,
    quantity: Math.max(1, Math.min(item.quantity, 500)),
    preferred_blank_brand: item.preferredBlankBrand || null,
    preferred_blank_style: item.preferredBlankStyle || null,
    sizes: {
      M: Math.ceil(item.quantity / 2),
      L: Math.floor(item.quantity / 2),
    } as Json,
    color: "",
  }));

  const itemInsertResult = await (supabase.from("merchant_order_items") as any)
    .insert(itemRows);
  const itemError = itemInsertResult.error as { message: string } | null;
  if (itemError) throw new Error(itemError.message);

  return orderRow.id;
}

/**
 * Run routing for the saved order and persist the top 3 recommendation
 * snapshots. Silently skips if no verified providers exist.
 * MOCKED: routing uses mock scoring weights and proximity calculations.
 */
export async function assignTopProviders(
  orderId: string,
  input: SaveOrderInput,
): Promise<void> {
  // Build a minimal MerchantOrder to feed into the routing engine
  const order: MerchantOrder = {
    id: orderId,
    merchantId: "",
    status: "draft",
    fulfillmentZip: input.fulfillmentZip,
    fulfillmentGoal: input.fulfillmentGoal,
    localPickupPreferred: input.localPickupPreferred,
    neededByDate: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: "",
    items: [
      {
        id: "",
        printMethod: "dtg",
        garmentType: input.garmentType,
        quantity: input.quantity,
        preferredBlankBrand: input.preferredBlankBrand || undefined,
        preferredBlankStyle: input.preferredBlankStyle || undefined,
        sizes: {},
        color: "",
      },
    ],
  };

  const { recommendations } = await recommendLiveProvidersForOrder(order);
  const top3 = recommendations.slice(0, 3);
  await persistRecommendationSnapshotsForOrder(orderId, top3);

  if (top3.length > 0) {
    const supabase = createSupabaseServiceRoleClient();
    const result = await (supabase.from("merchant_orders") as any)
      .update({
        status: "routed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}

export async function loadMerchantOrderById(
  orderId: string,
  profileId: string,
): Promise<MerchantOrder | null> {
  const supabase = createSupabaseServiceRoleClient();

  const orderResult = await (supabase.from("merchant_orders") as any)
    .select("*")
    .eq("id", orderId)
    .eq("profile_id", profileId)
    .maybeSingle();
  const orderRow = orderResult.data as MerchantOrderRow | null;
  if (orderResult.error) throw new Error(orderResult.error.message);
  if (!orderRow) return null;

  const itemsResult = await (supabase.from("merchant_order_items") as any)
    .select("*")
    .eq("merchant_order_id", orderId);
  if (itemsResult.error) throw new Error(itemsResult.error.message);
  const itemRows = (itemsResult.data ?? []) as MerchantOrderItemRow[];

  const paymentResult = await (supabase.from("payments") as any)
    .select("*")
    .eq("merchant_order_id", orderId)
    .maybeSingle();
  const paymentRow = paymentResult.data as PaymentRow | null;
  if (paymentResult.error) throw new Error(paymentResult.error.message);

  const assignmentResult = orderRow.selected_provider_profile_id
    ? await supabase
        .from("order_assignments")
        .select("*")
        .eq("merchant_order_id", orderId)
        .eq("provider_profile_id", orderRow.selected_provider_profile_id)
        .maybeSingle()
    : { data: null, error: null };
  const assignmentRow = assignmentResult.data as OrderAssignmentRow | null;
  if (assignmentResult.error) throw new Error(assignmentResult.error.message);

  return adaptOrderRow(orderRow, itemRows, paymentRow, assignmentRow);
}

export async function loadMerchantOrderHistory(
  profileId: string,
): Promise<MerchantOrderSummary[]> {
  const supabase = createSupabaseServiceRoleClient();

  type OrderHistoryRow = {
    id: string;
    status: string;
    fulfillment_zip: string;
    fulfillment_goal: string;
    created_at: string;
  };
  type ItemSummaryRow = {
    merchant_order_id: string;
    garment_type: string;
    quantity: number;
  };

  const ordersResult = await (supabase.from("merchant_orders") as any)
    .select("id, status, fulfillment_zip, fulfillment_goal, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (ordersResult.error) throw new Error(ordersResult.error.message);
  const orderRows = (ordersResult.data ?? []) as OrderHistoryRow[];
  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((row) => row.id);

  const itemsResult = await (supabase.from("merchant_order_items") as any)
    .select("merchant_order_id, garment_type, quantity")
    .in("merchant_order_id", orderIds);

  if (itemsResult.error) throw new Error(itemsResult.error.message);
  const itemRows = (itemsResult.data ?? []) as ItemSummaryRow[];

  const itemsByOrder = new Map<
    string,
    { garmentType: GarmentType; quantity: number }
  >();
  for (const item of itemRows) {
    if (!itemsByOrder.has(item.merchant_order_id)) {
      itemsByOrder.set(item.merchant_order_id, {
        garmentType: item.garment_type as GarmentType,
        quantity: item.quantity,
      });
    }
  }

  return orderRows.map((row) => {
    const item = itemsByOrder.get(row.id);
    return {
      id: row.id,
      status: row.status,
      fulfillmentZip: row.fulfillment_zip,
      fulfillmentGoal: row.fulfillment_goal as FulfillmentGoal,
      garmentType: (item?.garmentType ?? "t_shirt") as GarmentType,
      quantity: item?.quantity ?? 0,
      createdAt: row.created_at,
    };
  });
}

export async function selectProviderForOrder(
  orderId: string,
  profileId: string,
  recommendationSnapshotId: string,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  const orderResult = await (supabase.from("merchant_orders") as any)
    .select("id")
    .eq("id", orderId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (orderResult.error) {
    throw new Error(orderResult.error.message);
  }

  if (!orderResult.data) {
    throw new Error("Order not found");
  }

  const snapshotResult = await (supabase.from("recommendation_snapshots") as any)
    .select("*")
    .eq("id", recommendationSnapshotId)
    .eq("merchant_order_id", orderId)
    .maybeSingle();
  const snapshotRow = snapshotResult.data as RecommendationSnapshotRow | null;

  if (snapshotResult.error) {
    throw new Error(snapshotResult.error.message);
  }

  if (!snapshotRow) {
    throw new Error("Recommendation snapshot not found");
  }

  const result = await (supabase.from("merchant_orders") as any)
    .update({
      status: "provider_selected",
      selected_provider_profile_id: snapshotRow.provider_profile_id,
      selected_recommendation_snapshot_id: snapshotRow.id,
      selected_estimated_price_cents: snapshotRow.estimated_total_cents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("profile_id", profileId);

  if (result.error) throw new Error(result.error.message);
}

function adaptOrderRow(
  row: MerchantOrderRow,
  items: MerchantOrderItemRow[],
  payment: PaymentRow | null,
  assignment: OrderAssignmentRow | null,
): MerchantOrder {
  return {
    id: row.id,
    merchantId: row.profile_id,
    status: row.status,
    fulfillmentZip: row.fulfillment_zip,
    fulfillmentGoal: row.fulfillment_goal as FulfillmentGoal,
    localPickupPreferred: row.local_pickup_preferred,
    neededByDate: row.needed_by_date ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes ?? "",
    selectedProviderProfileId: row.selected_provider_profile_id ?? null,
    selectedRecommendationSnapshotId:
      row.selected_recommendation_snapshot_id ?? null,
    selectedEstimatedPriceCents: row.selected_estimated_price_cents ?? null,
    paymentSummary: adaptPaymentRow(payment),
    providerAssignmentSummary: adaptAssignmentRow(assignment),
    items: items.map(adaptItemRow),
  };
}

function adaptItemRow(row: MerchantOrderItemRow): OrderItem {
  return {
    id: row.id,
    printMethod: row.print_method as PrintMethod,
    garmentType: row.garment_type as GarmentType,
    quantity: row.quantity,
    preferredBlankBrand: row.preferred_blank_brand ?? undefined,
    preferredBlankStyle: row.preferred_blank_style ?? undefined,
    sizes: (row.sizes as Partial<
      Record<"XS" | "S" | "M" | "L" | "XL" | "2XL", number>
    >) ?? {},
    color: row.color,
  };
}

function adaptPaymentRow(payment: PaymentRow | null): MerchantPaymentSummary | null {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    status: payment.status as PaymentStatus,
    amountCents: payment.amount_cents,
    checkoutSessionId: payment.stripe_checkout_session_id,
    paidAt: payment.paid_at,
  };
}

function adaptAssignmentRow(
  assignment: OrderAssignmentRow | null,
): MerchantProviderAssignmentSummary | null {
  if (!assignment) {
    return null;
  }

  return {
    id: assignment.id,
    status: assignment.status,
    assignedAt: assignment.assigned_at,
    respondedAt: assignment.responded_at,
    fulfillmentDetails: {
      providerNotes: assignment.provider_notes,
      pickupInstructions: assignment.pickup_instructions,
      readyForPickupNote: assignment.ready_for_pickup_note,
      carrierName: assignment.carrier_name,
      trackingNumber: assignment.tracking_number,
      estimatedReadyDate: assignment.estimated_ready_date,
      shippingNote: assignment.shipping_note,
      updatedAt: assignment.fulfillment_details_updated_at,
    },
  };
}

export async function prepareMerchantOrderForCheckout(
  orderId: string,
  profileId: string,
): Promise<MerchantCheckoutPreparation> {
  const supabase = createSupabaseServiceRoleClient();

  const orderResult = await (supabase.from("merchant_orders") as any)
    .select("id, status, profile_id, selected_provider_profile_id, selected_recommendation_snapshot_id")
    .eq("id", orderId)
    .eq("profile_id", profileId)
    .maybeSingle();
  const orderRow = orderResult.data as Pick<
    MerchantOrderRow,
    | "id"
    | "status"
    | "profile_id"
    | "selected_provider_profile_id"
    | "selected_recommendation_snapshot_id"
  > | null;

  if (orderResult.error) {
    throw new Error(orderResult.error.message);
  }

  if (!orderRow) {
    throw new Error("Order not found");
  }

  if (orderRow.status === "paid") {
    return {
      kind: "already_paid",
      orderId,
    };
  }

  if (
    orderRow.status !== "provider_selected" ||
    !orderRow.selected_provider_profile_id ||
    !orderRow.selected_recommendation_snapshot_id
  ) {
    throw new Error("Order is not ready for payment");
  }

  const [snapshotResult, paymentResult, providerResult, profileResult] =
    await Promise.all([
      (supabase.from("recommendation_snapshots") as any)
        .select("id, provider_profile_id, pricing_mode, estimated_total_cents")
        .eq("id", orderRow.selected_recommendation_snapshot_id)
        .eq("merchant_order_id", orderId)
        .maybeSingle(),
      (supabase.from("payments") as any)
        .select("*")
        .eq("merchant_order_id", orderId)
        .maybeSingle(),
      (supabase.from("provider_profiles") as any)
        .select("business_name")
        .eq("id", orderRow.selected_provider_profile_id)
        .maybeSingle(),
      (supabase.from("profiles") as any)
        .select("email")
        .eq("id", profileId)
        .maybeSingle(),
    ]);

  const snapshotRow = snapshotResult.data as Pick<
    RecommendationSnapshotRow,
    "id" | "provider_profile_id" | "pricing_mode" | "estimated_total_cents"
  > | null;
  const paymentRow = paymentResult.data as PaymentRow | null;
  const providerRow = providerResult.data as { business_name: string } | null;
  const profileRow = profileResult.data as { email: string | null } | null;

  if (snapshotResult.error) throw new Error(snapshotResult.error.message);
  if (paymentResult.error) throw new Error(paymentResult.error.message);
  if (providerResult.error) throw new Error(providerResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);

  if (!snapshotRow) {
    throw new Error("Selected recommendation snapshot not found");
  }

  if (
    snapshotRow.pricing_mode === "manual_quote" ||
    snapshotRow.estimated_total_cents === null
  ) {
    return {
      kind: "not_payable",
      orderId,
      reason:
        snapshotRow.pricing_mode === "manual_quote"
          ? "manual_quote"
          : "missing_estimate",
      providerName: providerRow?.business_name ?? "Selected provider",
    };
  }

  if (snapshotRow.estimated_total_cents <= 0) {
    return {
      kind: "not_payable",
      orderId,
      reason: "invalid_amount",
      providerName: providerRow?.business_name ?? "Selected provider",
    };
  }

  return {
    kind: "payable",
    orderId,
    amountCents: snapshotRow.estimated_total_cents,
    providerProfileId: snapshotRow.provider_profile_id,
    providerName: providerRow?.business_name ?? "Selected provider",
    recommendationSnapshotId: snapshotRow.id,
    payment: adaptPaymentRow(paymentRow),
    customerEmail: profileRow?.email ?? null,
  };
}

export async function upsertCheckoutPendingPayment(
  input: {
    orderId: string;
    recommendationSnapshotId: string;
    providerProfileId: string;
    amountCents: number;
    stripeCheckoutSessionId: string;
    customerEmail?: string | null;
  },
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();

  const result = await (supabase.from("payments") as any).upsert(
    {
      merchant_order_id: input.orderId,
      recommendation_snapshot_id: input.recommendationSnapshotId,
      selected_provider_profile_id: input.providerProfileId,
      status: "checkout_pending",
      amount_cents: input.amountCents,
      currency: "usd",
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_customer_email: input.customerEmail ?? null,
      checkout_created_at: now,
      updated_at: now,
    },
    { onConflict: "merchant_order_id" },
  );

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function markPaymentExpiredByCheckoutSession(
  stripeCheckoutSessionId: string,
): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const result = await (supabase.from("payments") as any)
    .update({
      status: "expired",
      expired_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
    .neq("status", "paid");

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function finalizeSuccessfulPayment(input: {
  orderId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  customerEmail?: string | null;
}): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();

  const paymentResult = await (supabase.from("payments") as any)
    .select("*")
    .eq("merchant_order_id", input.orderId)
    .maybeSingle();
  const paymentRow = paymentResult.data as PaymentRow | null;

  if (paymentResult.error) {
    throw new Error(paymentResult.error.message);
  }

  if (!paymentRow) {
    throw new Error("Payment row not found for order");
  }

  if (paymentRow.status === "paid") {
    return;
  }

  const now = new Date().toISOString();

  const updatePaymentResult = await (supabase.from("payments") as any)
    .update({
      status: "paid",
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
      stripe_customer_email: input.customerEmail ?? paymentRow.stripe_customer_email,
      paid_at: now,
      updated_at: now,
    })
    .eq("id", paymentRow.id);

  if (updatePaymentResult.error) {
    throw new Error(updatePaymentResult.error.message);
  }

  const updateOrderResult = await (supabase.from("merchant_orders") as any)
    .update({
      status: "paid",
      updated_at: now,
    })
    .eq("id", input.orderId);

  if (updateOrderResult.error) {
    throw new Error(updateOrderResult.error.message);
  }

  const assignmentResult = await (supabase.from("order_assignments") as any).upsert(
    {
      merchant_order_id: input.orderId,
      provider_profile_id: paymentRow.selected_provider_profile_id,
      status: "accepted",
      responded_at: now,
    },
    { onConflict: "merchant_order_id,provider_profile_id" },
  );

  if (assignmentResult.error) {
    throw new Error(assignmentResult.error.message);
  }

  await sendPaymentConfirmedNotifications(input.orderId);
}
