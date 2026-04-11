import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/helpers";
import { hasSupabaseBrowserEnv, hasSupabaseServiceRoleEnv } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";
import {
  recommendLiveProvidersForOrder,
} from "@/lib/merchant/recommendations";
import {
  loadMerchantOrderById,
  loadMerchantOrderHistory,
  type MerchantOrderSummary,
} from "@/lib/merchant/orders";
import { MerchantCatalogClient } from "./_catalog";
import {
  type ProviderRecommendation,
  type RoutingFactor,
} from "@/lib/routing";
import type {
  FulfillmentGoal,
  GarmentType,
  MerchantOrder,
} from "@/types";

export const metadata: Metadata = {
  title: "Merchant workspace | InkLink",
  description:
    "Browse the InkLink product catalog, create a DTG order, and get transparent local provider recommendations from your verified network.",
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
  let savedOrder: MerchantOrder | null = null;
  if (orderId && supabaseReady) {
    savedOrder = await loadMerchantOrderById(orderId, user.id);
  }

  // Run provider matching to populate blank inventory suggestions and,
  // when a saved order is loaded, to show ranked recommendations.
  // Uses a minimal default order when no saved order is present.
  const orderForRouting: MerchantOrder = savedOrder ?? {
    id: "merchant-page-default",
    merchantId: "",
    status: "ready_for_routing",
    fulfillmentZip: "90401",
    fulfillmentGoal: "local_first",
    localPickupPreferred: false,
    neededByDate: "",
    createdAt: new Date().toISOString(),
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

  const recommendationData = await recommendLiveProvidersForOrder(orderForRouting);
  const providerData = recommendationData.providerData;

  const blankBrandOptions = Array.from(
    new Set(providerData.inventory.map((b) => b.blankBrand)),
  ).sort();
  const blankStyleOptions = Array.from(
    new Set(providerData.inventory.map((b) => b.styleName)),
  ).sort();
  const hasVerifiedProviders = providerData.providers.length > 0;

  // Recommendations are only shown when a specific saved order is loaded
  const recommendations = savedOrder
    ? recommendationData.recommendations.slice(0, 3)
    : [];
  const topRecommendation = recommendations[0] ?? null;

  // Load order history
  let orderHistory: MerchantOrderSummary[] = [];
  if (supabaseReady) {
    orderHistory = await loadMerchantOrderHistory(user.id);
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader />

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
        />

        {/* Recommendations — visible only after an order has been saved */}
        {savedOrder ? (
          <section className="border-t border-zinc-200 py-14">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Ranked recommendations
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-zinc-950">
                  Top providers for this order
                </h2>
              </div>
              <p className="text-sm text-zinc-500">
                {`Saved order · ${(savedOrder.items[0]?.garmentType ?? "t_shirt").replace(/_/g, " ")} · DTG`}
              </p>
            </div>

            {topRecommendation ? (
              <FirstRankSummary recommendation={topRecommendation} />
            ) : null}

            {recommendations.length > 0 ? (
              <div className="grid gap-5">
                {recommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={recommendation.providerId}
                    rank={index + 1}
                    recommendation={recommendation}
                  />
                ))}
              </div>
            ) : (
              <EmptyRecommendationState
                persistenceMode={providerData.persistenceMode}
                hasVerifiedProviders={hasVerifiedProviders}
              />
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
        Showing your saved order below. Recommendations use live verified
        provider records. Shipping, distance, and blank-fit estimates are
        calculated using standard industry benchmarks.
      </MockNotice>
    );
  }

  return null;
}

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
    <Card>
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
        {description}
      </p>
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
    <Card className="mb-5 border-emerald-200 bg-emerald-50 text-zinc-950">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
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
}: {
  rank: number;
  recommendation: ProviderRecommendation;
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

  return (
    <Card
      className={
        isTopRank ? "border-emerald-200 shadow-sm" : "border-zinc-200 shadow-sm"
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Rank {rank}</Badge>
            {isTopRank ? <Badge>Best current fit</Badge> : null}
          </div>
          <h3 className="mt-1 text-2xl font-semibold">
            {recommendation.providerName}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-700">
            {recommendation.explanation}
          </p>
        </div>
        <div className="rounded-md bg-zinc-950 px-5 py-4 text-center text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
            Match rating
          </p>
          <p className="text-3xl font-semibold">{merchantScore}</p>
          <p className="mt-1 text-sm text-zinc-400">out of 10</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <CompactNote
          label="Turnaround"
          value={`${notes.estimatedTurnaroundDays} days`}
        />
        <CompactNote
          label="Shipping"
          value={`$${notes.estimatedShippingCostUsd.toFixed(2)}`}
        />
        <CompactNote
          label="Distance"
          value={`${notes.estimatedDistanceMiles} mi`}
        />
        <CompactNote
          label="Capacity"
          value={`${notes.availableCapacityUnits}/${notes.requestedUnits} units`}
        />
        <CompactNote
          label="Pickup"
          value={notes.localPickupSupported ? "Supported" : "Not supported"}
        />
      </div>

      <div className="mt-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Why this ranked high
        </h4>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {strongestFactors.map((factor) => (
            <div
              key={factor.factor}
              className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
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
    </Card>
  );
}

function CompactNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-950">{value}</p>
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
