import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import type {
  FulfillmentGoal,
  GarmentType,
  MerchantOrder,
  OrderItem,
  PrintMethod,
} from "@/types";
import type { Database, Json } from "@/types/database";

type MerchantOrderRow = Database["public"]["Tables"]["merchant_orders"]["Row"];
type MerchantOrderItemRow =
  Database["public"]["Tables"]["merchant_order_items"]["Row"];

export type SaveOrderInput = {
  fulfillmentZip: string;
  fulfillmentGoal: FulfillmentGoal;
  localPickupPreferred: boolean;
  garmentType: GarmentType;
  quantity: number;
  preferredBlankBrand: string;
  preferredBlankStyle: string;
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

  return adaptOrderRow(orderRow, itemRows);
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

function adaptOrderRow(
  row: MerchantOrderRow,
  items: MerchantOrderItemRow[],
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
    notes: row.notes ?? "",
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
