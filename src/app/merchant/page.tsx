import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock3,
  CreditCard,
  Gauge,
  MapPin,
  PackageCheck,
  Route,
  Sparkles,
  Truck,
  WalletCards,
} from "lucide-react";
import { requireRole } from "@/lib/auth/helpers";
import { hasSupabaseBrowserEnv, hasSupabaseServiceRoleEnv } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";
import {
  loadMerchantProviderData,
  loadRecommendationSnapshotsForOrder,
  recommendLiveProvidersForOrder,
  type PersistedProviderRecommendation,
} from "@/lib/merchant/recommendations";
import {
  loadMerchantOrderById,
  loadMerchantOrderHistory,
  type MerchantOrderSummary,
} from "@/lib/merchant/orders";
import { MerchantCatalogClient } from "./_catalog";
import { ProviderSelectedModal } from "./_provider-selected-modal";
import { selectProviderAction } from "@/actions/merchant-orders";
import {
  type ProviderRecommendation,
  type RoutingFactor,
} from "@/lib/routing";
import type {
  FulfillmentGoal,
  GarmentType,
  MerchantOrder,
  OrderStatus,
} from "@/types";

export const metadata: Metadata = {
  title: "Merchant workspace | PrintPair",
  description:
    "Browse the PrintPair product catalog, create a DTG order, and get transparent local provider recommendations from your verified network.",
};

type MerchantPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const garmentTypeLabels: Record<GarmentType, string> = {
  t_shirt: "T-shirt",
  long_sleeve: "Long sleeve",
  hoodie: "Hoodie",
  crewneck: "Crewneck",
  tank: "Tank",
  tote: "Tote",
};

const fulfillmentGoalLabels: Record<FulfillmentGoal, string> = {
  local_first: "Local first",
  fastest_turnaround: "Fastest turnaround",
  lowest_cost: "Lowest cost",
  premium_blank: "Premium blank",
};

const factorLabels = {
  printMethodCompatibility: "Print fit",
  garmentCompatibility: "Product fit",
  blankAvailability: "Blank fit",
  providerVerificationTier: "Shop trust",
  providerQuality: "Quality",
  turnaroundSla: "Speed",
  providerCapacity: "Capacity",
  proximity: "Distance",
  shippingCost: "Shipping",
  localPickupPreference: "Pickup",
  merchantFulfillmentGoal: "Priority",
} satisfies Record<RoutingFactor, string>;

const factorOrder = Object.keys(factorLabels) as RoutingFactor[];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MerchantPage({ searchParams }: MerchantPageProps) {
  const user = await requireRole("merchant");
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const supabaseReady = hasSupabaseBrowserEnv() && hasSupabaseServiceRoleEnv();

  // Load a saved order when orderId is present
  const orderId =
    typeof resolvedSearchParams.orderId === "string"
      ? resolvedSearchParams.orderId
      : "";

  // Success flag set by selectProviderAction redirect
  const providerSelectedFlag = resolvedSearchParams.providerSelected === "1";
  const paymentState =
    typeof resolvedSearchParams.payment === "string"
      ? resolvedSearchParams.payment
      : "";
  const paymentError =
    typeof resolvedSearchParams.paymentError === "string"
      ? resolvedSearchParams.paymentError
      : "";
  let savedOrder: MerchantOrder | null = null;
  if (orderId && supabaseReady) {
    savedOrder = await loadMerchantOrderById(orderId, user.id);
  }

  const defaultOrderForRouting: MerchantOrder = {
    id: "merchant-page-default",
    merchantId: "",
    status: "ready_for_routing",
    fulfillmentZip: "90401",
    fulfillmentGoal: "local_first",
    localPickupPreferred: false,
    neededByDate: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: "",
    items: [
      {
        id: "",
        printMethod: "dtg",
        garmentType: "t_shirt",
        quantity: 1,
        sizes: {},
        color: "",
      },
    ],
  };

  const providerData = savedOrder
    ? await loadMerchantProviderData()
    : (await recommendLiveProvidersForOrder(defaultOrderForRouting)).providerData;

  const blankBrandOptions = Array.from(
    new Set(providerData.inventory.map((b) => b.blankBrand)),
  ).sort();
  const blankStyleOptions = Array.from(
    new Set(providerData.inventory.map((b) => b.styleName)),
  ).sort();
  const hasVerifiedProviders = providerData.providers.length > 0;

  // Recommendations are only shown when a specific saved order is loaded.
  // Saved orders render from frozen recommendation snapshots.
  const recommendations: PersistedProviderRecommendation[] = savedOrder
    ? await loadRecommendationSnapshotsForOrder(savedOrder.id)
    : [];
  const topRecommendation = recommendations[0] ?? null;

  // Find the selected recommendation to populate the confirmation modal
  const selectedRecommendation =
    providerSelectedFlag &&
    savedOrder?.status === "provider_selected" &&
    savedOrder.selectedRecommendationSnapshotId
      ? (recommendations.find(
          (r) => r.snapshotId === savedOrder!.selectedRecommendationSnapshotId,
        ) ?? null)
      : null;
  const selectedRecommendationForOrder =
    savedOrder ? getSelectedRecommendation(savedOrder, recommendations) : null;
  const isPaidOrder =
    savedOrder?.status === "paid" || savedOrder?.paymentSummary?.status === "paid";
  const visibleRecommendations =
    isPaidOrder && selectedRecommendationForOrder
      ? [selectedRecommendationForOrder]
      : recommendations;
  const showPickupSavingsBanner =
    savedOrder !== null &&
    !isPaidOrder &&
    isPickupOrLocalFirstOrder(savedOrder) &&
    topRecommendation?.operationalNotes.localPickupSupported;

  // Load order history
  let orderHistory: MerchantOrderSummary[] = [];
  if (supabaseReady) {
    orderHistory = await loadMerchantOrderHistory(user.id);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader />

        {/* Provider selection confirmation modal */}
        {selectedRecommendation ? (
          <ProviderSelectedModal
            providerName={selectedRecommendation.providerName}
            priceLabel={
              selectedRecommendation.priceEstimate?.estimatedTotalCents != null
                ? `~$${(selectedRecommendation.priceEstimate.estimatedTotalCents / 100).toFixed(2)}`
                : "—"
            }
            isManualQuote={
              selectedRecommendation.priceEstimate?.pricingMode ===
              "manual_quote"
            }
            turnaroundDays={
              selectedRecommendation.operationalNotes.estimatedTurnaroundDays
            }
            orderId={orderId}
            checkoutHref={getCheckoutHref(savedOrder, selectedRecommendationForOrder)}
          />
        ) : null}

        <div className="mt-6">
          <MerchantNotice
            persistenceMode={providerData.persistenceMode}
            hasVerifiedProviders={hasVerifiedProviders}
            isSavedOrder={savedOrder !== null}
          />
        </div>

        {/* Catalog / order form — client component manages view state */}
        <MerchantCatalogClient
          blankBrandOptions={blankBrandOptions}
          blankStyleOptions={blankStyleOptions}
          submittedOrderId={orderId}
          submittedOrder={savedOrder}
        />

        {/* Recommendations — visible only after an order has been saved */}
        {savedOrder ? (
          <section className="pt-10 pb-14">
            {isPaidOrder ? (
              <>
                <div className="mb-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                    Payment confirmed
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-zinc-950">
                    Your selected provider is ready to produce
                  </h2>
                </div>

                <PaymentStatePanel
                  order={savedOrder}
                  paymentState={paymentState}
                  paymentError={paymentError}
                  checkoutHref={getCheckoutHref(savedOrder, selectedRecommendationForOrder)}
                  selectedRecommendation={selectedRecommendationForOrder}
                />

                <OrderTimeline order={savedOrder} />

                <FulfillmentDetailsPanel order={savedOrder} />

                {visibleRecommendations.length > 0 ? (
                  <div className="grid gap-5">
                    {visibleRecommendations.map((recommendation, index) => (
                      <RecommendationCard
                        key={recommendation.providerId}
                        rank={index + 1}
                        recommendation={recommendation}
                        orderId={orderId}
                        orderStatus={savedOrder!.status}
                        isPaidOrder={isPaidOrder}
                        selectedProviderProfileId={
                          savedOrder!.selectedProviderProfileId ?? null
                        }
                        selectedRecommendationSnapshotId={
                          savedOrder!.selectedRecommendationSnapshotId ?? null
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <SavedOrderBar order={savedOrder} />

                <div className="mb-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                    {savedOrder.status === "provider_selected"
                      ? "Provider selected"
                      : "Matching providers"}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-zinc-950">
                    {savedOrder.status === "provider_selected"
                      ? "Your selected provider"
                      : "Choose your print partner"}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                    Compare saved provider matches by price, turnaround, pickup
                    support, and overall fit. Local pickup options are surfaced
                    clearly when they can help you avoid shipping.
                  </p>
                </div>

                <PaymentStatePanel
                  order={savedOrder}
                  paymentState={paymentState}
                  paymentError={paymentError}
                  checkoutHref={getCheckoutHref(savedOrder, selectedRecommendationForOrder)}
                  selectedRecommendation={selectedRecommendationForOrder}
                />

                {showPickupSavingsBanner && topRecommendation ? (
                  <PickupSavingsBanner
                    shippingCostUsd={
                      topRecommendation.operationalNotes.estimatedShippingCostUsd
                    }
                  />
                ) : null}

                {topRecommendation ? (
                  <FirstRankSummary recommendation={topRecommendation} />
                ) : null}

                {visibleRecommendations.length > 0 ? (
                  <div className="grid gap-5">
                    {visibleRecommendations.map((recommendation, index) => (
                      <RecommendationCard
                        key={recommendation.providerId}
                        rank={index + 1}
                        recommendation={recommendation}
                        orderId={orderId}
                        orderStatus={savedOrder!.status}
                        isPaidOrder={isPaidOrder}
                        selectedProviderProfileId={
                          savedOrder!.selectedProviderProfileId ?? null
                        }
                        selectedRecommendationSnapshotId={
                          savedOrder!.selectedRecommendationSnapshotId ?? null
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyRecommendationState
                    persistenceMode={providerData.persistenceMode}
                    hasVerifiedProviders={hasVerifiedProviders}
                  />
                )}
              </>
            )}
          </section>
        ) : null}

        {/* Order history */}
        {orderHistory.length > 0 ? (
          <section className="border-t border-zinc-200 py-14">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Your orders
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-zinc-950">
                Order history
              </h2>
            </div>
            <OrderHistory orders={orderHistory} currentOrderId={orderId} />
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SavedOrderBar({ order }: { order: MerchantOrder }) {
  const firstItem = order.items[0];
  const itemLabel = firstItem
    ? `${garmentTypeLabels[firstItem.garmentType]} · ${getOrderQuantity(order)} units`
    : `${getOrderQuantity(order)} units`;

  return (
    <div className="mb-5 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Saved order</Badge>
          <span className="text-sm font-semibold text-zinc-950">
            {itemLabel}
          </span>
          <span className="text-sm text-zinc-500">
            ZIP {order.fulfillmentZip}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={order.localPickupPreferred ? "warning" : "brand"}>
            {order.localPickupPreferred ? "Pickup preferred" : "Shipping"}
          </Badge>
          <StatusBadge status={order.status} />
        </div>
      </div>
    </div>
  );
}

function PickupSavingsBanner({
  shippingCostUsd,
}: {
  shippingCostUsd: number;
}) {
  return (
    <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-200 text-amber-900">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-950">
              Local pickup providers are shown first
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              Pick up directly from a nearby vetted shop — no shipping required.
            </p>
          </div>
        </div>
        {shippingCostUsd > 0 ? (
          <div className="rounded-md border border-amber-200 bg-white px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Potential savings
            </p>
            <p className="mt-1 text-xl font-semibold text-amber-950">
              ~${shippingCostUsd.toFixed(2)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OrderTimeline({ order }: { order: MerchantOrder }) {
  const steps = getOrderTimelineSteps(order);
  if (steps.length === 0) return null;

  return (
    <Card className="mb-5 overflow-hidden border-zinc-200 bg-white">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Order timeline
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
            Current production milestones
          </h3>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex gap-3 rounded-2xl border px-4 py-3 ${
              step.isCurrent
                ? "border-indigo-200 bg-gradient-to-br from-indigo-50 to-white"
                : "border-zinc-200 bg-zinc-50/70"
            }`}
          >
            <IconCircle active={step.isCurrent}>{step.icon}</IconCircle>
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                {step.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {step.description}
              </p>
              {step.timestamp ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                  {formatTimelineDate(step.timestamp)}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Timeline uses existing order, payment, and queue-release timestamps.
        Detailed per-status history can be added later if a full audit trail is
        needed.
      </p>
    </Card>
  );
}

function IconCircle({
  children,
  active = false,
  tone = "indigo",
}: {
  children: React.ReactNode;
  active?: boolean;
  tone?: "indigo" | "emerald" | "zinc";
}) {
  const toneClassNames = {
    indigo: active
      ? "border-indigo-200 bg-indigo-950 text-white"
      : "border-zinc-200 bg-white text-zinc-600",
    emerald: active
      ? "border-emerald-200 bg-emerald-700 text-white"
      : "border-zinc-200 bg-white text-zinc-600",
    zinc: active
      ? "border-zinc-300 bg-zinc-950 text-white"
      : "border-zinc-200 bg-white text-zinc-600",
  };

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm shadow-zinc-950/10 ${toneClassNames[tone]}`}
    >
      {children}
    </div>
  );
}

function FulfillmentDetailsPanel({ order }: { order: MerchantOrder }) {
  const details = order.providerAssignmentSummary?.fulfillmentDetails;
  if (!details || !hasFulfillmentDetails(details)) {
    return null;
  }

  const detailItems = [
    {
      label: "Provider notes",
      value: details.providerNotes,
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      label: "Estimated ready date",
      value: details.estimatedReadyDate
        ? formatDateOnly(details.estimatedReadyDate)
        : null,
      icon: <CalendarDays className="h-4 w-4" />,
    },
    {
      label: "Pickup instructions",
      value: details.pickupInstructions,
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      label: "Ready note",
      value: details.readyForPickupNote,
      icon: <PackageCheck className="h-4 w-4" />,
    },
    {
      label: "Carrier",
      value: details.carrierName,
      icon: <Truck className="h-4 w-4" />,
    },
    {
      label: "Tracking number",
      value: details.trackingNumber,
      icon: <Route className="h-4 w-4" />,
    },
    {
      label: "Shipping note",
      value: details.shippingNote,
      icon: <Truck className="h-4 w-4" />,
    },
  ].filter((item) => item.value);

  return (
    <Card className="mb-5 border-zinc-200 bg-gradient-to-br from-white to-zinc-50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <IconCircle tone="zinc">
            <ClipboardList className="h-5 w-5" />
          </IconCircle>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Latest provider update
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
              Fulfillment details
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Customer-facing production, pickup, and shipping information from
              your selected provider.
            </p>
          </div>
        </div>
        {details.updatedAt ? (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
            Updated {formatTimelineDate(details.updatedAt)}
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {detailItems.map((item) => (
          <div
            key={item.label}
            className="flex gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm shadow-zinc-950/5"
          >
            <span className="mt-0.5 text-zinc-500">{item.icon}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {item.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-800">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PaymentStatePanel({
  order,
  paymentState,
  paymentError,
  checkoutHref,
  selectedRecommendation,
}: {
  order: MerchantOrder;
  paymentState: string;
  paymentError: string;
  checkoutHref: string | null;
  selectedRecommendation: PersistedProviderRecommendation | null;
}) {
  const isPaid = order.status === "paid" || order.paymentSummary?.status === "paid";
  const isAwaitingPayment =
    order.status === "provider_selected" &&
    order.paymentSummary?.status !== "paid";
  const providerName = selectedRecommendation?.providerName ?? "your selected provider";

  if (isPaid) {
    return (
      <Card className="mb-5 overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white">
        <div className="flex gap-4">
          <IconCircle active tone="emerald">
            <CheckCircle2 className="h-5 w-5" />
          </IconCircle>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Payment confirmed
            </p>
            <h3 className="mt-2 text-3xl font-semibold text-zinc-950">
              Your order is officially in production.
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
              PrintPair confirmed payment and sent this order to {providerName}
              &apos;s active queue. Your provider can now begin production and
              update status from their workspace.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (isAwaitingPayment) {
    const paymentErrorMessage =
      getPaymentErrorMessage(paymentError) ||
      getNonPayableMessage(selectedRecommendation, checkoutHref);

    return (
      <Card className="mb-5 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white">
        <div className="flex gap-4">
          <IconCircle active>
            <CreditCard className="h-5 w-5" />
          </IconCircle>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">
              Payment pending
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
              Pay to send this order into production.
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
              You&apos;ve selected {providerName}. Payment is the next step that
              moves the order from provider selection into the provider&apos;s
              active production queue.
            </p>
          </div>
        </div>
        {paymentState === "processing" ? (
          <p className="mt-3 text-sm text-zinc-700">
            Payment is processing. This page will reflect the confirmed paid
            state after Stripe and the webhook finalize the order.
          </p>
        ) : null}
        {paymentState === "cancelled" ? (
          <p className="mt-3 text-sm text-zinc-700">
            Checkout was cancelled. Your order is still saved as provider selected.
          </p>
        ) : null}
        {paymentErrorMessage ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {paymentErrorMessage}
          </div>
        ) : null}
        {checkoutHref ? (
          <div className="mt-5">
            <a
              href={checkoutHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-indigo-950 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-950/20 transition hover:bg-indigo-900"
            >
              <WalletCards className="h-4 w-4" />
              Pay now
            </a>
          </div>
        ) : null}
      </Card>
    );
  }

  return null;
}

// ─── MerchantNotice ───────────────────────────────────────────────────────────

function MerchantNotice({
  persistenceMode,
  hasVerifiedProviders,
  isSavedOrder,
}: {
  persistenceMode: "unconfigured" | "supabase";
  hasVerifiedProviders: boolean;
  isSavedOrder: boolean;
}) {
  if (persistenceMode === "unconfigured") {
    return (
      <MockNotice>
        Supabase is not configured. Orders will not be saved and live provider
        matching is unavailable until the Supabase environment variables are
        set.
      </MockNotice>
    );
  }

  if (!hasVerifiedProviders) {
    return (
      <MockNotice>
        Live merchant mode is active, but there are no verified providers yet.
        Approve a provider in{" "}
        <Link href="/admin" className="underline">
          /admin
        </Link>{" "}
        to populate this matching view. Orders you submit will still be saved.
      </MockNotice>
    );
  }

  if (isSavedOrder) {
    return (
      <MockNotice>
        Showing your saved order with provider matches saved at routing time.
      </MockNotice>
    );
  }

  return null;
}

// ─── Order status message ─────────────────────────────────────────────────────

// ─── Order history ────────────────────────────────────────────────────────────

function OrderHistory({
  orders,
  currentOrderId,
}: {
  orders: MerchantOrderSummary[];
  currentOrderId: string;
}) {
  return (
    <div className="grid gap-3">
      {orders.map((order) => {
        const isCurrent = order.id === currentOrderId;
        return (
          <Link
            key={order.id}
            href={`/merchant?orderId=${order.id}`}
            className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm transition ${
              isCurrent
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-950"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              {isCurrent ? <Badge tone="dark">Viewing</Badge> : null}
              <span className="font-semibold">
                {garmentTypeLabels[order.garmentType]} · {order.quantity} units
              </span>
              <span className={isCurrent ? "text-zinc-300" : "text-zinc-500"}>
                {fulfillmentGoalLabels[order.fulfillmentGoal]}
              </span>
              <span className={isCurrent ? "text-zinc-400" : "text-zinc-400"}>
                ZIP {order.fulfillmentZip}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={isCurrent ? "text-zinc-400" : "text-zinc-400"}>
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <StatusBadge status={order.status} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Recommendations components ───────────────────────────────────────────────

function EmptyRecommendationState({
  persistenceMode,
  hasVerifiedProviders,
}: {
  persistenceMode: "unconfigured" | "supabase";
  hasVerifiedProviders: boolean;
}) {
  const title =
    persistenceMode === "unconfigured"
      ? "Live provider matching is not configured"
      : hasVerifiedProviders
        ? "No recommendations matched this order"
        : "No verified providers available";
  const description =
    persistenceMode === "unconfigured"
      ? "Add the Supabase environment variables to load verified providers into the merchant matching flow."
      : hasVerifiedProviders
        ? "Verified providers were loaded, but none produced a recommendation for this order shape."
        : "Approve at least one provider in /admin, then reload this page to generate live recommendations.";

  return (
    <Card className="border-dashed bg-gradient-to-br from-white to-zinc-50">
      <div className="flex gap-4">
        <IconCircle>
          <Sparkles className="h-5 w-5" />
        </IconCircle>
        <div>
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}

function FirstRankSummary({
  recommendation,
}: {
  recommendation: ProviderRecommendation;
}) {
  const strongestFactors = factorOrder
    .map((factor) => ({
      factor,
      ...recommendation.factorBreakdown[factor],
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 3);

  return (
    <Card className="mb-5 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white text-zinc-950">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="flex gap-4">
          <IconCircle active tone="emerald">
            <Sparkles className="h-5 w-5" />
          </IconCircle>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Why this provider ranked first
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              {recommendation.providerName}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              Strongest signals from the routing logic, shown here in a simpler
              merchant-friendly rating.
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {strongestFactors.map((factor) => (
            <div
              key={factor.factor}
              className="rounded-md border border-emerald-200 bg-white p-3"
            >
              <p className="text-sm font-semibold">
                {factorLabels[factor.factor]}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {formatScoreOutOfTen(factor.score)}/10
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function RecommendationCard({
  rank,
  recommendation,
  orderId,
  orderStatus,
  selectedProviderProfileId,
  selectedRecommendationSnapshotId,
  isPaidOrder = false,
}: {
  rank: number;
  recommendation: PersistedProviderRecommendation;
  orderId: string;
  orderStatus: OrderStatus;
  selectedProviderProfileId: string | null;
  selectedRecommendationSnapshotId: string | null;
  isPaidOrder?: boolean;
}) {
  const notes = recommendation.operationalNotes;
  const isTopRank = rank === 1;
  const merchantScore = formatScoreOutOfTen(recommendation.totalScore);
  const strongestFactors = factorOrder
    .map((factor) => ({
      factor,
      ...recommendation.factorBreakdown[factor],
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 3);

  const isSelected =
    (orderStatus === "provider_selected" || orderStatus === "paid") &&
    selectedProviderProfileId === recommendation.providerId &&
    selectedRecommendationSnapshotId === recommendation.snapshotId;
  const anotherIsSelected =
    (orderStatus === "provider_selected" || orderStatus === "paid") &&
    selectedRecommendationSnapshotId !== null &&
    selectedRecommendationSnapshotId !== recommendation.snapshotId;

  const priceLabel = recommendation.priceEstimate
    ? recommendation.priceEstimate.estimatedTotalCents !== null
      ? `~$${(recommendation.priceEstimate.estimatedTotalCents / 100).toFixed(2)}`
      : "Manual quote"
    : "—";
  const supportsPickup = notes.localPickupSupported;
  const shippingSavings = notes.estimatedShippingCostUsd;

  return (
    <Card
      className={`border-l-4 ${
        supportsPickup ? "border-l-amber-400" : "border-l-violet-400"
      } ${
        isTopRank
          ? "rounded-md border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40"
          : "rounded-md border-zinc-200 bg-white"
      }`}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isPaidOrder ? (
              <Badge tone="brand" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                Paid provider
              </Badge>
            ) : (
              <Badge icon={<Sparkles className="h-3.5 w-3.5" />}>
                Rank {rank}
              </Badge>
            )}
            {!isPaidOrder && isTopRank ? (
              <Badge tone="brand">Best current fit</Badge>
            ) : null}
            {isSelected ? <Badge tone="brand">Selected</Badge> : null}
            {supportsPickup ? (
              <Badge tone="warning" icon={<MapPin className="h-3.5 w-3.5" />}>
                Local pickup
              </Badge>
            ) : (
              <Badge tone="brand" icon={<Truck className="h-3.5 w-3.5" />}>
                Shipping
              </Badge>
            )}
          </div>
          <h3 className="mt-2 text-2xl font-semibold">
            {recommendation.providerName}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700">
            {cleanExplanation(recommendation.explanation)}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <CompactNote
              label="Turnaround"
              value={`${notes.estimatedTurnaroundDays} days`}
              icon={<Clock3 className="h-3.5 w-3.5" />}
            />
            <CompactNote
              label="Distance"
              value={`${notes.estimatedDistanceMiles} mi`}
              icon={<MapPin className="h-3.5 w-3.5" />}
            />
            <CompactNote
              label="Capacity"
              value={`${notes.availableCapacityUnits}/${notes.requestedUnits} units`}
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
            <CompactNote
              label="Pickup"
              value={supportsPickup ? "Supported" : "Not supported"}
              icon={<PackageCheck className="h-3.5 w-3.5" />}
              highlight={supportsPickup}
            />
            <CompactNote
              label="Est. price"
              value={priceLabel}
              icon={<CreditCard className="h-3.5 w-3.5" />}
            />
          </div>

          {supportsPickup && shippingSavings > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              Save ~${shippingSavings.toFixed(2)} on shipping by picking up
              locally from this shop.
            </div>
          ) : null}

          {!isPaidOrder ? (
            <div className="mt-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Why this ranked high
              </h4>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {strongestFactors.map((factor) => (
                  <div
                    key={factor.factor}
                    className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {factorLabels[factor.factor]}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-zinc-600">
                          {getMerchantFactorExplanation(factor.factor, factor.note)}
                        </p>
                      </div>
                      <MiniScore value={formatScoreOutOfTen(factor.score)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-3">
          <div className="rounded-2xl bg-zinc-950 px-5 py-4 text-center text-white shadow-sm shadow-zinc-950/20">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
              Match rating
            </p>
            <p className="text-3xl font-semibold">{merchantScore}</p>
            <p className="mt-1 text-sm text-zinc-400">out of 10</p>
          </div>
          {isSelected ? (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-indigo-600">
                Est. total
              </p>
              <p className="mt-1 text-lg font-semibold text-indigo-900">
                {priceLabel}
              </p>
            </div>
          ) : !anotherIsSelected ? (
            <SelectProviderForm
              orderId={orderId}
              recommendationSnapshotId={recommendation.snapshotId}
              priceLabel={priceLabel}
            />
          ) : null}
        </div>
      </div>

      {!isPaidOrder ? (
      <details className="mt-4 rounded-md border border-zinc-200 bg-zinc-50">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-700 marker:hidden">
          See full breakdown
        </summary>
        <div className="border-t border-zinc-200/70 px-3 py-2.5">
          <div className="grid gap-1.5 md:grid-cols-2">
            {factorOrder.map((factor) => {
              const breakdown = recommendation.factorBreakdown[factor];

              return (
                <div
                  key={factor}
                  className="rounded-sm border border-zinc-200/70 bg-white px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5">
                        {factorLabels[factor]}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-[1.125rem] text-zinc-600">
                        {getCompactMerchantFactorExplanation(
                          factor,
                          getMerchantFactorExplanation(factor, breakdown.note),
                        )}
                      </p>
                    </div>
                    <MiniScore
                      value={formatScoreOutOfTen(breakdown.score)}
                      compact
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </details>
      ) : null}
    </Card>
  );
}

function getSelectedRecommendation(
  order: MerchantOrder,
  recommendations: PersistedProviderRecommendation[],
) {
  if (!order.selectedRecommendationSnapshotId) {
    return null;
  }

  return (
    recommendations.find(
      (recommendation) =>
        recommendation.snapshotId === order.selectedRecommendationSnapshotId,
    ) ?? null
  );
}

function getCheckoutHref(
  order: MerchantOrder | null,
  selectedRecommendation: PersistedProviderRecommendation | null,
) {
  if (!order || order.status !== "provider_selected" || !selectedRecommendation) {
    return null;
  }

  const estimatedTotalCents =
    selectedRecommendation.priceEstimate?.estimatedTotalCents ?? null;
  const pricingMode = selectedRecommendation.priceEstimate?.pricingMode ?? null;

  if (pricingMode === "manual_quote" || estimatedTotalCents === null || estimatedTotalCents <= 0) {
    return null;
  }

  return `/api/stripe/checkout?orderId=${order.id}`;
}

function getPaymentErrorMessage(paymentError: string) {
  switch (paymentError) {
    case "manual_quote":
      return "This provider selection requires a manual quote before payment can begin.";
    case "missing_estimate":
      return "A payable estimate is not available for this provider selection yet.";
    case "invalid_amount":
      return "The selected provider estimate is not payable yet.";
    case "stripe_unconfigured":
      return "Stripe is not configured in this environment yet.";
    case "checkout_unavailable":
      return "Checkout could not be started right now. Please try again.";
    default:
      return "";
  }
}

function getOrderTimelineSteps(order: MerchantOrder) {
  const steps: Array<{
    label: string;
    description: string;
    timestamp: string | null;
    isCurrent?: boolean;
    icon: React.ReactNode;
  }> = [
    {
      label: "Order created",
      description: "Your order request was saved in PrintPair.",
      timestamp: order.createdAt,
      icon: <CircleDashed className="h-5 w-5" />,
    },
  ];

  if (order.status === "routed") {
    steps.push({
      label: "Provider matches saved",
      description:
        "PrintPair saved the provider comparison snapshot for this order.",
      timestamp: order.updatedAt ?? order.createdAt,
      isCurrent: true,
      icon: <Route className="h-5 w-5" />,
    });
  }

  if (
    order.status === "provider_selected" ||
    order.status === "paid" ||
    productionStatusOrder.includes(order.status)
  ) {
    steps.push({
      label: "Provider selected",
      description:
        order.status === "provider_selected"
          ? "Payment is still needed before this order enters production."
          : "Provider selection is locked for this order.",
      timestamp:
        order.status === "provider_selected"
          ? (order.updatedAt ?? order.createdAt)
          : null,
      isCurrent: order.status === "provider_selected",
      icon: <CreditCard className="h-5 w-5" />,
    });
  }

  if (order.paymentSummary?.status === "paid" || order.status === "paid" || productionStatusOrder.includes(order.status)) {
    steps.push({
      label: "Payment confirmed",
      description:
        "Stripe confirmed payment and PrintPair marked this order paid.",
      timestamp: order.paymentSummary?.paidAt ?? null,
      icon: <CheckCircle2 className="h-5 w-5" />,
    });
  }

  if (order.providerAssignmentSummary?.status === "accepted") {
    steps.push({
      label: "Released to provider queue",
      description:
        "The paid order was released into the selected provider's active queue.",
      timestamp:
        order.providerAssignmentSummary.respondedAt ??
        order.providerAssignmentSummary.assignedAt,
      isCurrent: order.status === "paid",
      icon: <PackageCheck className="h-5 w-5" />,
    });
  }

  const currentProductionStatus = productionStatusLabels[order.status];
  if (currentProductionStatus) {
    steps.push({
      label: currentProductionStatus.label,
      description: currentProductionStatus.description,
      timestamp: order.updatedAt ?? order.createdAt,
      isCurrent: true,
      icon: currentProductionStatus.icon,
    });
  }

  return steps;
}

const productionStatusOrder: OrderStatus[] = [
  "in_production",
  "ready",
  "shipped",
  "completed",
];

const productionStatusLabels: Partial<
  Record<
    OrderStatus,
    { label: string; description: string; icon: React.ReactNode }
  >
> = {
  in_production: {
    label: "In production",
    description: "Your provider has started production.",
    icon: <Clock3 className="h-5 w-5" />,
  },
  ready: {
    label: "Ready",
    description: "Your order is ready for pickup, shipping, or final handoff.",
    icon: <PackageCheck className="h-5 w-5" />,
  },
  shipped: {
    label: "Shipped",
    description: "Your provider marked this order shipped.",
    icon: <Truck className="h-5 w-5" />,
  },
  completed: {
    label: "Completed",
    description: "This order is complete.",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
};

function formatTimelineDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function hasFulfillmentDetails(
  details: NonNullable<
    NonNullable<MerchantOrder["providerAssignmentSummary"]>["fulfillmentDetails"]
  >,
) {
  return Boolean(
    details.providerNotes ||
      details.pickupInstructions ||
      details.readyForPickupNote ||
      details.carrierName ||
      details.trackingNumber ||
      details.estimatedReadyDate ||
      details.shippingNote,
  );
}

function isPickupOrLocalFirstOrder(order: MerchantOrder) {
  return order.localPickupPreferred || order.fulfillmentGoal === "local_first";
}

function getOrderQuantity(order: MerchantOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function cleanExplanation(explanation: string) {
  return explanation
    .replace(/mocked miles? of distance,?\s*/gi, "")
    .replace(/and a \$[\d.]+ mocked shipping estimate\.?\s*/gi, "")
    .replace(/with a ([\d.]+)-day SLA,\s*/gi, "with a $1-day SLA, ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getNonPayableMessage(
  selectedRecommendation: PersistedProviderRecommendation | null,
  checkoutHref: string | null,
) {
  if (checkoutHref || !selectedRecommendation) {
    return "";
  }

  if (selectedRecommendation.priceEstimate?.pricingMode === "manual_quote") {
    return "This provider requires a manual quote before payment can begin.";
  }

  return "A payable estimate is not available for this provider selection yet.";
}

function SelectProviderForm({
  orderId,
  recommendationSnapshotId,
  priceLabel,
}: {
  orderId: string;
  recommendationSnapshotId: string;
  priceLabel: string;
}) {
  return (
    <form action={selectProviderAction} className="flex flex-col gap-1">
      <input type="hidden" name="orderId" value={orderId} />
      <input
        type="hidden"
        name="recommendationSnapshotId"
        value={recommendationSnapshotId}
      />
      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2 text-center">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">
          Est. price
        </p>
        <p className="mt-0.5 text-base font-semibold text-zinc-900">
          {priceLabel}
        </p>
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-950 px-4 text-sm font-semibold text-white transition hover:bg-indigo-900"
      >
        Select this provider
      </button>
    </form>
  );
}

function CompactNote({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-2 shadow-sm shadow-zinc-950/5 ${
        highlight
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-zinc-200 bg-zinc-50 text-zinc-950"
      }`}
    >
      {icon ? (
        <span className={highlight ? "text-amber-700" : "text-zinc-500"}>
          {icon}
        </span>
      ) : null}
      <div>
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
            highlight ? "text-amber-700" : "text-zinc-500"
          }`}
        >
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function MiniScore({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="shrink-0 rounded-sm bg-zinc-950 px-2 py-1 text-[11px] font-semibold leading-none text-white">
        {value}/10
      </div>
    );
  }

  return (
    <div className="rounded-md bg-zinc-950 px-3 py-2 text-center text-white">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
        /10
      </p>
    </div>
  );
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatScoreOutOfTen(score: number) {
  return Math.max(1, Math.min(10, Math.round(score / 10)));
}

function getMerchantFactorExplanation(
  factor: RoutingFactor,
  fallbackNote: string,
) {
  const explanations = {
    printMethodCompatibility:
      "How well this shop fits the requested print method.",
    garmentCompatibility:
      "How comfortable this shop is with the garment type in this order.",
    blankAvailability:
      "How likely this shop can source or stock the blank you want.",
    providerVerificationTier:
      "How established and review-ready this shop looks in the marketplace.",
    providerQuality:
      "A blended view of print quality, reliability, and delivery consistency.",
    turnaroundSla: "How strong this shop's standard turnaround looks.",
    providerCapacity: "How much room this shop has for the current order size.",
    proximity: "How close the shop is to the fulfillment ZIP.",
    shippingCost: "How favorable the mocked shipping estimate looks.",
    localPickupPreference:
      "How well this shop matches the pickup preference on the order.",
    merchantFulfillmentGoal:
      "How well this shop supports the goal selected for this order.",
  } satisfies Record<RoutingFactor, string>;

  return explanations[factor] ?? fallbackNote;
}

function getCompactMerchantFactorExplanation(
  factor: RoutingFactor,
  fallbackNote: string,
) {
  const compactExplanations = {
    printMethodCompatibility: "Fit for the print method.",
    garmentCompatibility: "Fit for the product type.",
    blankAvailability: "Likelihood of sourcing the blank well.",
    providerVerificationTier: "Marketplace trust and review readiness.",
    providerQuality: "Quality and reliability signal.",
    turnaroundSla: "Expected speed for standard production.",
    providerCapacity: "Room for the current order size.",
    proximity: "How near the shop is to fulfillment.",
    shippingCost: "Estimated shipping favorability.",
    localPickupPreference: "Match for the pickup preference.",
    merchantFulfillmentGoal: "Support for the selected order goal.",
  } satisfies Record<RoutingFactor, string>;

  return compactExplanations[factor] ?? fallbackNote;
}
