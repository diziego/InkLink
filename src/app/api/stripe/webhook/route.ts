import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { finalizeSuccessfulPayment, markPaymentExpiredByCheckoutSession } from "@/lib/merchant/orders";
import { verifyWebhookEvent } from "@/lib/payments/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = verifyWebhookEvent(body, signature);
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Invalid webhook signature",
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.merchantOrderId;

        if (orderId) {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;

          await finalizeSuccessfulPayment({
            orderId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            customerEmail: session.customer_details?.email ?? session.customer_email,
          });

          revalidatePath("/merchant");
          revalidatePath("/provider");
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markPaymentExpiredByCheckoutSession(session.id);
        revalidatePath("/merchant");
        break;
      }
      default:
        break;
    }
  } catch (error) {
    return new NextResponse(
      error instanceof Error ? error.message : "Webhook processing failed",
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
