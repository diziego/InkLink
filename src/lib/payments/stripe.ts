import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function readEnv(key: string) {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export function hasStripeServerEnv() {
  return Boolean(readEnv("STRIPE_SECRET_KEY") && readEnv("STRIPE_WEBHOOK_SECRET"));
}

export function getStripePublishableKey() {
  return readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

function getStripeSecretKey() {
  const secretKey = readEnv("STRIPE_SECRET_KEY");

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return secretKey;
}

export function getStripeWebhookSecret() {
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET");

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }

  return webhookSecret;
}

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }

  return stripeClient;
}

export type CheckoutSessionInput = {
  amountCents: number;
  customerEmail?: string | null;
  merchantOrderId: string;
  providerName: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createCheckoutSession(input: CheckoutSessionInput) {
  const stripe = getStripeClient();

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail ?? undefined,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      merchantOrderId: input.merchantOrderId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          product_data: {
            name: `PrintPair order with ${input.providerName}`,
            description: "Provider-selected print order checkout",
          },
        },
      },
    ],
  });
}

export function verifyWebhookEvent(body: string, signature: string) {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
}
