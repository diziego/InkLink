import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import { getSiteUrl, sendTransactionalEmail } from "@/lib/notifications/email";
import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type MerchantOrderRow = Database["public"]["Tables"]["merchant_orders"]["Row"];
type MerchantOrderItemRow =
  Database["public"]["Tables"]["merchant_order_items"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type ProviderProfileRow = Database["public"]["Tables"]["provider_profiles"]["Row"];

type NotificationOrderContext = {
  order: MerchantOrderRow;
  item: Pick<MerchantOrderItemRow, "garment_type" | "quantity"> | null;
  payment: PaymentRow | null;
  merchantEmail: string | null;
  providerName: string;
  providerEmail: string | null;
};

const merchantStatusCopy: Partial<
  Record<OrderStatus, { label: string; message: string }>
> = {
  in_production: {
    label: "In production",
    message: "Your provider has started production on your PrintPair order.",
  },
  ready: {
    label: "Ready",
    message:
      "Your PrintPair order is marked ready. Watch your provider notes or pickup/shipping details for the next step.",
  },
  shipped: {
    label: "Shipped",
    message: "Your PrintPair order has been marked shipped by your provider.",
  },
  completed: {
    label: "Completed",
    message: "Your PrintPair order is complete.",
  },
};

export async function sendPaymentConfirmedNotifications(orderId: string) {
  try {
    const context = await loadNotificationOrderContext(orderId);
    if (!context) return;

    const orderUrl = `${getSiteUrl()}/merchant?orderId=${context.order.id}`;
    const providerUrl = `${getSiteUrl()}/provider`;
    const orderSummary = formatOrderSummary(context);
    const amount = formatAmount(context.payment?.amount_cents ?? null);

    await Promise.all([
      sendTransactionalEmail({
        to: context.merchantEmail,
        subject: "Payment confirmed for your PrintPair order",
        text: [
          "Payment confirmed.",
          "",
          `PrintPair confirmed ${amount} for your order with ${context.providerName}.`,
          "The order has been released to the provider's active production queue.",
          "",
          orderSummary,
          "",
          `View your order: ${orderUrl}`,
        ].join("\n"),
      }),
      sendTransactionalEmail({
        to: context.providerEmail,
        subject: "New paid PrintPair order in your production queue",
        text: [
          "A paid PrintPair order is ready for production.",
          "",
          orderSummary,
          `Merchant fulfillment ZIP: ${context.order.fulfillment_zip}`,
          "",
          `Open your provider queue: ${providerUrl}`,
        ].join("\n"),
      }),
    ]);
  } catch (error) {
    console.error("[notifications] Payment confirmation email failed", error);
  }
}

export async function sendMerchantStatusUpdateNotification(
  orderId: string,
  status: OrderStatus,
) {
  const statusCopy = merchantStatusCopy[status];
  if (!statusCopy) return;

  try {
    const context = await loadNotificationOrderContext(orderId);
    if (!context) return;

    const orderUrl = `${getSiteUrl()}/merchant?orderId=${context.order.id}`;

    await sendTransactionalEmail({
      to: context.merchantEmail,
      subject: `PrintPair order update: ${statusCopy.label}`,
      text: [
        statusCopy.message,
        "",
        formatOrderSummary(context),
        `Provider: ${context.providerName}`,
        "",
        `View your order: ${orderUrl}`,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[notifications] Merchant status email failed", error);
  }
}

async function loadNotificationOrderContext(
  orderId: string,
): Promise<NotificationOrderContext | null> {
  const supabase = createSupabaseServiceRoleClient();

  const orderResult = await supabase
    .from("merchant_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  const order = orderResult.data as MerchantOrderRow | null;

  if (orderResult.error) throw new Error(orderResult.error.message);
  if (!order) return null;

  const [
    itemResult,
    paymentResult,
    merchantProfileResult,
    providerProfileResult,
    providerWholesaleResult,
  ] = await Promise.all([
    supabase
      .from("merchant_order_items")
      .select("garment_type, quantity")
      .eq("merchant_order_id", orderId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .eq("merchant_order_id", orderId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("email")
      .eq("id", order.profile_id)
      .maybeSingle(),
    order.selected_provider_profile_id
      ? supabase
          .from("provider_profiles")
          .select("id, profile_id, business_name")
          .eq("id", order.selected_provider_profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.selected_provider_profile_id
      ? supabase
          .from("provider_wholesale_readiness")
          .select("business_email")
          .eq("provider_profile_id", order.selected_provider_profile_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (itemResult.error) throw new Error(itemResult.error.message);
  if (paymentResult.error) throw new Error(paymentResult.error.message);
  if (merchantProfileResult.error) {
    throw new Error(merchantProfileResult.error.message);
  }
  if (providerProfileResult.error) {
    throw new Error(providerProfileResult.error.message);
  }
  if (providerWholesaleResult.error) {
    throw new Error(providerWholesaleResult.error.message);
  }

  const provider = providerProfileResult.data as Pick<
    ProviderProfileRow,
    "id" | "profile_id" | "business_name"
  > | null;

  const providerOwnerResult = provider?.profile_id
    ? await supabase
        .from("profiles")
        .select("email")
        .eq("id", provider.profile_id)
        .maybeSingle()
    : { data: null, error: null };

  if (providerOwnerResult.error) {
    throw new Error(providerOwnerResult.error.message);
  }

  const providerWholesale = providerWholesaleResult.data as {
    business_email: string | null;
  } | null;
  const providerOwner = providerOwnerResult.data as { email: string | null } | null;

  return {
    order,
    item: itemResult.data as Pick<
      MerchantOrderItemRow,
      "garment_type" | "quantity"
    > | null,
    payment: paymentResult.data as PaymentRow | null,
    merchantEmail:
      (merchantProfileResult.data as { email: string | null } | null)?.email ??
      null,
    providerName: provider?.business_name ?? "Selected provider",
    providerEmail:
      providerWholesale?.business_email ?? providerOwner?.email ?? null,
  };
}

function formatOrderSummary(context: NotificationOrderContext) {
  const quantity = context.item?.quantity ?? 0;
  const garment = formatGarmentType(context.item?.garment_type ?? "order");
  return `Order: ${quantity} ${quantity === 1 ? "unit" : "units"} · ${garment}`;
}

function formatGarmentType(value: string) {
  return value.replace(/_/g, " ");
}

function formatAmount(amountCents: number | null) {
  if (amountCents === null) return "payment";
  return `$${(amountCents / 100).toFixed(2)}`;
}
