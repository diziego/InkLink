import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCheckoutSession, hasStripeServerEnv } from "@/lib/payments/stripe";
import {
  prepareMerchantOrderForCheckout,
  upsertCheckoutPendingPayment,
} from "@/lib/merchant/orders";

function redirectToMerchant(origin: string, orderId: string, params: URLSearchParams) {
  params.set("orderId", orderId);
  return NextResponse.redirect(`${origin}/merchant?${params.toString()}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";

  if (!orderId) {
    return NextResponse.redirect(`${origin}/merchant`);
  }

  if (!hasStripeServerEnv()) {
    return redirectToMerchant(
      origin,
      orderId,
      new URLSearchParams({ paymentError: "stripe_unconfigured" }),
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(`/api/stripe/checkout?orderId=${orderId}`)}`,
    );
  }

  const { data: roleRow } = (await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()) as { data: { role: string } | null };

  if (roleRow?.role !== "merchant") {
    return NextResponse.redirect(`${origin}/merchant?orderId=${orderId}`);
  }

  try {
    const preparation = await prepareMerchantOrderForCheckout(orderId, user.id);

    if (preparation.kind === "already_paid") {
      return redirectToMerchant(
        origin,
        orderId,
        new URLSearchParams({ payment: "success" }),
      );
    }

    if (preparation.kind === "not_payable") {
      return redirectToMerchant(
        origin,
        orderId,
        new URLSearchParams({ paymentError: preparation.reason }),
      );
    }

    const session = await createCheckoutSession({
      amountCents: preparation.amountCents,
      customerEmail: preparation.customerEmail,
      merchantOrderId: preparation.orderId,
      providerName: preparation.providerName,
      successUrl: `${origin}/merchant?orderId=${preparation.orderId}&payment=processing`,
      cancelUrl: `${origin}/merchant?orderId=${preparation.orderId}&payment=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    await upsertCheckoutPendingPayment({
      orderId: preparation.orderId,
      recommendationSnapshotId: preparation.recommendationSnapshotId,
      providerProfileId: preparation.providerProfileId,
      amountCents: preparation.amountCents,
      stripeCheckoutSessionId: session.id,
      customerEmail: preparation.customerEmail,
    });

    return NextResponse.redirect(session.url, { status: 303 });
  } catch {
    return redirectToMerchant(
      origin,
      orderId,
      new URLSearchParams({ paymentError: "checkout_unavailable" }),
    );
  }
}
