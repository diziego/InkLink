import { createSupabaseServiceRoleClient } from "@/lib/supabase";
import {
  getSiteUrl,
  renderTransactionalEmail,
  sendTransactionalEmail,
} from "@/lib/notifications/email";
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
  Record<OrderStatus, { label: string; heading: string; message: string }>
> = {
  in_production: {
    label: "In production",
    heading: "Your PrintPair order is in production.",
    message:
      "Your provider has started production and will add fulfillment details as the order moves forward.",
  },
  ready: {
    label: "Ready for handoff",
    heading: "Your PrintPair order is ready for the next handoff.",
    message:
      "Your provider marked the order ready. Check your order page for pickup instructions, shipping details, or provider notes.",
  },
  shipped: {
    label: "Handoff updated",
    heading: "Your PrintPair order handoff was updated.",
    message:
      "Your provider recorded the next fulfillment step. Tracking, pickup, or completion details will appear on your order page when available.",
  },
  completed: {
    label: "Completed",
    heading: "Your PrintPair order is complete.",
    message:
      "Your provider marked this order complete. You can still review the order details from your merchant workspace.",
  },
};

export async function sendPaymentConfirmedNotifications(orderId: string) {
  try {
    const context = await loadNotificationOrderContext(orderId);
    if (!context) return;

    const orderUrl = `${getSiteUrl()}/merchant?orderId=${context.order.id}`;
    const providerUrl = `${getSiteUrl()}/provider`;
    const orderSummary = getOrderSummaryLines(context);
    const amount = formatAmount(context.payment?.amount_cents ?? null);
    const merchantEmail = renderTransactionalEmail({
      eyebrow: "Payment confirmed",
      heading: "Your PrintPair order is now in the provider queue.",
      intro: `Payment of ${amount} was confirmed for your order with ${context.providerName}. The job has been released to the provider's active production queue.`,
      sections: [
        {
          title: "Order summary",
          lines: orderSummary,
        },
        {
          title: "What happens next",
          lines: [
            "The provider can now start production.",
            "You will receive email updates when the order moves through production, handoff, and completion.",
          ],
        },
      ],
      cta: {
        label: "View order",
        url: orderUrl,
      },
    });

    const providerEmail = renderTransactionalEmail({
      eyebrow: "New paid order",
      heading: "A paid PrintPair order is ready for production.",
      intro:
        "This order has been paid by the merchant and added to your active production queue.",
      sections: [
        {
          title: "Job summary",
          lines: [
            ...orderSummary,
            `Merchant fulfillment ZIP: ${context.order.fulfillment_zip}`,
          ],
        },
        {
          title: "Provider next step",
          lines: [
            "Open your queue to review the job and begin production when ready.",
            "Add fulfillment notes as the order progresses so the merchant can follow along.",
          ],
        },
      ],
      cta: {
        label: "Open provider queue",
        url: providerUrl,
      },
    });

    await Promise.all([
      sendTransactionalEmail({
        to: context.merchantEmail,
        subject: "Payment confirmed for your PrintPair order",
        text: merchantEmail.text,
        html: merchantEmail.html,
      }),
      sendTransactionalEmail({
        to: context.providerEmail,
        subject: "New paid PrintPair order in your production queue",
        text: providerEmail.text,
        html: providerEmail.html,
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
    const email = renderTransactionalEmail({
      eyebrow: "Order status update",
      heading: statusCopy.heading,
      intro: statusCopy.message,
      sections: [
        {
          title: "Order summary",
          lines: getOrderSummaryLines(context),
        },
        {
          title: "Provider",
          lines: [context.providerName],
        },
      ],
      cta: {
        label: "View order",
        url: orderUrl,
      },
    });

    await sendTransactionalEmail({
      to: context.merchantEmail,
      subject: `PrintPair order update: ${statusCopy.label}`,
      text: email.text,
      html: email.html,
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

function getOrderSummaryLines(context: NotificationOrderContext) {
  const quantity = context.item?.quantity ?? 0;
  const garment = formatGarmentType(context.item?.garment_type ?? "order");
  return [
    `${quantity} ${quantity === 1 ? "unit" : "units"} · ${garment}`,
    `Fulfillment ZIP: ${context.order.fulfillment_zip}`,
    `Fulfillment goal: ${formatFulfillmentGoal(context.order.fulfillment_goal)}`,
  ];
}

function formatGarmentType(value: string) {
  return value.replace(/_/g, " ");
}

function formatFulfillmentGoal(value: string) {
  return value.replace(/_/g, " ");
}

function formatAmount(amountCents: number | null) {
  if (amountCents === null) return "payment";
  return `$${(amountCents / 100).toFixed(2)}`;
}
