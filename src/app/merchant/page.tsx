import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/helpers";
import { hasSupabaseBrowserEnv, hasSupabaseServiceRoleEnv } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MockNotice } from "@/components/ui/mock-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  mockMerchantOrders,
  mockMerchants,
} from "@/lib/mock-data";
import {
  recommendLiveProvidersForOrder,
} from "@/lib/merchant/recommendations";
import {
  loadMerchantOrderById,
  loadMerchantOrderHistory,
  type MerchantOrderSummary,
} from "@/lib/merchant/orders";
import { submitMerchantOrderAction } from "@/actions/merchant-orders";
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
    "Create a DTG order and view transparent local provider recommendations using live verified provider data in InkLink.",
};

type MerchantPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type OrderFormValues = {
  fulfillmentZip: string;
  fulfillmentGoal: FulfillmentGoal;
  localPickupPreferred: boolean;
  garmentType: GarmentType;
  quantity: number;
  preferredBlankBrand: string;
  preferredBlankStyle: string;
};

const fulfillmentGoalOptions = [
  { value: "local_first", label: "Local first" },
  { value: "fastest_turnaround", label: "Fastest turnaround" },
  { value: "lowest_cost", label: "Lowest cost" },
  { value: "premium_blank", label: "Premium blank" },
] satisfies { value: FulfillmentGoal; label: string }[];

const garmentTypeOptions = [
  { value: "t_shirt", label: "T-shirt" },
  { value: "long_sleeve", label: "Long sleeve" },
  { value: "hoodie", label: "Hoodie" },
  { value: "crewneck", label: "Crewneck" },
  { value: "tank", label: "Tank" },
  { value: "tote", label: "Tote" },
] satisfies { value: GarmentType; label: string }[];

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
const formLabelClassName = "text-sm font-medium text-zinc-700";
const formInputClassName =
  "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10";
const formReadonlyClassName =
  "mt-2 h-11 w-full rounded-md border border-zinc-200 bg-zinc-100 px-3 text-sm text-zinc-600";

const demoScenarios = [
  {
    label: "Local tee restock",
    values: {
      fulfillmentZip: "90401",
      fulfillmentGoal: "local_first",
      localPickupPreferred: "true",
      garmentType: "t_shirt",
      quantity: "72",
      preferredBlankBrand: "Los Angeles Apparel",
      preferredBlankStyle: "1801GD Garment Dye Tee",
    },
  },
  {
    label: "Premium tote bundle",
    values: {
      fulfillmentZip: "91103",
      fulfillmentGoal: "premium_blank",
      localPickupPreferred: "false",
      garmentType: "tote",
      quantity: "80",
      preferredBlankBrand: "econscious",
      preferredBlankStyle: "Organic Cotton Tote",
    },
  },
  {
    label: "Fast hoodie sample",
    values: {
      fulfillmentZip: "90802",
      fulfillmentGoal: "fastest_turnaround",
      localPickupPreferred: "false",
      garmentType: "hoodie",
      quantity: "36",
      preferredBlankBrand: "Independent Trading Co.",
      preferredBlankStyle: "IND4000 Heavyweight Hoodie",
    },
  },
] satisfies {
  label: string;
  values: Record<string, string>;
}[];

const defaultOrder = mockMerchantOrders[0];
const defaultItem = defaultOrder.items[0];
const defaultMerchant = mockMerchants.find(
  (merchant) => merchant.id === defaultOrder.merchantId,
);

export default async function MerchantPage({ searchParams }: MerchantPageProps) {
  const user = await requireRole("merchant");
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const supabaseReady =
    hasSupabaseBrowserEnv() && hasSupabaseServiceRoleEnv();

  // Attempt to load a persisted order when orderId is present
  const orderId = getStringParam(resolvedSearchParams.orderId, "");
  let savedOrder: MerchantOrder | null = null;
  if (orderId && supabaseReady) {
    savedOrder = await loadMerchantOrderById(orderId, user.id);
  }

  // Build form values from the persisted order or URL params
  const formValues = savedOrder
    ? orderToFormValues(savedOrder)
    : getOrderFormValues(resolvedSearchParams);

  const order = savedOrder ?? buildMockOrder(formValues);

  const recommendationData = await recommendLiveProvidersForOrder(order);
  const providerData = recommendationData.providerData;
  const blankBrandOptions = Array.from(
    new Set(providerData.inventory.map((blank) => blank.blankBrand)),
  ).sort();
  const blankStyleOptions = Array.from(
    new Set(providerData.inventory.map((blank) => blank.styleName)),
  ).sort();
  const recommendations = recommendationData.recommendations.slice(0, 3);
  const topRecommendation = recommendations[0];
  const hasVerifiedProviders = providerData.providers.length > 0;

  // Load order history when Supabase is available
  let orderHistory: MerchantOrderSummary[] = [];
  if (supabaseReady) {
    orderHistory = await loadMerchantOrderHistory(user.id);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader theme="dark" />

        <section className="grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Merchant workspace"
              title="Create a DTG order and compare local providers."
              description="Submit the form to save a real order to Supabase, then see live provider recommendations from the deterministic routing engine."
              theme="dark"
            />
            <div className="mt-8">
              <MerchantNotice
                persistenceMode={providerData.persistenceMode}
                hasVerifiedProviders={hasVerifiedProviders}
                isSavedOrder={savedOrder !== null}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <DemoScenarioSwitcher />
            <OrderEntryForm
              values={formValues}
              blankBrandOptions={blankBrandOptions}
              blankStyleOptions={blankStyleOptions}
            />
          </div>
        </section>

        <section className="pb-16">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
                Ranked recommendations
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Top providers for this order
              </h2>
            </div>
            <p className="text-sm text-zinc-400">
              {savedOrder
                ? `Saved order · ${formValues.garmentType.replace("_", " ")} · DTG`
                : `Merchant: ${defaultMerchant?.businessName ?? "Mock merchant"} · Print method: DTG`}
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

        {orderHistory.length > 0 ? (
          <section className="border-t border-white/10 py-16">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
                Your orders
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Order history</h2>
            </div>
            <OrderHistory orders={orderHistory} currentOrderId={orderId} />
          </section>
        ) : null}
      </div>
    </main>
  );
}

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
      <MockNotice tone="dark">
        Supabase is not configured. Orders will not be saved and live provider
        matching is unavailable until the Supabase environment variables are
        set.
      </MockNotice>
    );
  }

  if (!hasVerifiedProviders) {
    return (
      <MockNotice tone="dark">
        Live merchant mode is active, but there are no verified providers yet.
        Approve a provider in `/admin` to populate this matching view. Orders
        you submit will still be saved.
      </MockNotice>
    );
  }

  if (isSavedOrder) {
    return (
      <MockNotice tone="dark">
        Showing a saved order from Supabase. Recommendations use live verified
        provider records. Shipping, distance, and blank-fit calculations remain
        mocked inside the routing engine.
      </MockNotice>
    );
  }

  return (
    <MockNotice tone="dark">
      Submit the form to save an order to Supabase. Recommendations use live
      verified provider records. Shipping, distance, and blank-fit calculations
      remain mocked inside the routing engine.
    </MockNotice>
  );
}

function OrderEntryForm({
  values,
  blankBrandOptions,
  blankStyleOptions,
}: {
  values: OrderFormValues;
  blankBrandOptions: string[];
  blankStyleOptions: string[];
}) {
  return (
    <form
      action={submitMerchantOrderAction}
      className="rounded-md border border-white/15 bg-white p-6 text-zinc-950 shadow-sm"
    >
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Order entry
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Route a DTG order
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Submitting saves the order to Supabase and reruns routing against the
          current verified provider pool.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={formLabelClassName}>
          Fulfillment ZIP
          <input
            name="fulfillmentZip"
            defaultValue={values.fulfillmentZip}
            inputMode="numeric"
            className={formInputClassName}
          />
        </label>

        <label className={formLabelClassName}>
          Fulfillment goal
          <select
            name="fulfillmentGoal"
            defaultValue={values.fulfillmentGoal}
            className={formInputClassName}
          >
            {fulfillmentGoalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={formLabelClassName}>
          Print method
          <input
            name="printMethod"
            value="DTG"
            readOnly
            className={formReadonlyClassName}
          />
        </label>

        <label className={formLabelClassName}>
          Garment type
          <select
            name="garmentType"
            defaultValue={values.garmentType}
            className={formInputClassName}
          >
            {garmentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={formLabelClassName}>
          Quantity
          <input
            name="quantity"
            type="number"
            min="1"
            max="500"
            defaultValue={values.quantity}
            className={formInputClassName}
          />
        </label>

        <label className={formLabelClassName}>
          Preferred blank brand
          <input
            name="preferredBlankBrand"
            list="blank-brand-options"
            defaultValue={values.preferredBlankBrand}
            className={formInputClassName}
          />
          <datalist id="blank-brand-options">
            {blankBrandOptions.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        </label>

        <label className={`${formLabelClassName} sm:col-span-2`}>
          Preferred blank style
          <input
            name="preferredBlankStyle"
            list="blank-style-options"
            defaultValue={values.preferredBlankStyle}
            className={formInputClassName}
          />
          <datalist id="blank-style-options">
            {blankStyleOptions.map((style) => (
              <option key={style} value={style} />
            ))}
          </datalist>
        </label>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        <input type="hidden" name="localPickupPreferred" value="false" />
        <input
          type="checkbox"
          name="localPickupPreferred"
          value="true"
          defaultChecked={values.localPickupPreferred}
          className="mt-1 h-4 w-4 accent-zinc-950"
        />
        <span>Prefer local pickup when a provider supports it</span>
      </label>

      <button
        type="submit"
        className="mt-6 h-11 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        Save order &amp; route
      </button>
    </form>
  );
}

function DemoScenarioSwitcher() {
  return (
    <Card className="border-white/15 bg-white/10 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Demo presets
        </p>
        <p className="text-sm text-zinc-300">Quick-fill scenarios</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {demoScenarios.map((scenario) => (
          <Link
            key={scenario.label}
            href={`/merchant?${new URLSearchParams(scenario.values).toString()}`}
            className="rounded-md border border-white/15 bg-zinc-950/40 px-3 py-3 text-sm font-semibold text-zinc-100 transition hover:border-white/40 hover:bg-white/10"
          >
            {scenario.label}
          </Link>
        ))}
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-300">
        Presets pre-fill the form. Submit to save as a real order.
      </p>
    </Card>
  );
}

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
                ? "border-white/40 bg-white/10 text-white"
                : "border-white/15 bg-white/5 text-zinc-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              {isCurrent ? (
                <Badge>Viewing</Badge>
              ) : null}
              <span className="font-semibold">
                {garmentTypeLabels[order.garmentType]} · {order.quantity} units
              </span>
              <span className="text-zinc-400">
                {fulfillmentGoalLabels[order.fulfillmentGoal]}
              </span>
              <span className="text-zinc-500">ZIP {order.fulfillmentZip}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-500">
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="rounded-sm bg-zinc-800 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-300">
                {order.status.replace(/_/g, " ")}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

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
      ? "Add the Supabase environment variables in this environment to load verified providers into the merchant matching flow."
      : hasVerifiedProviders
        ? "Verified providers were loaded, but none produced a recommendation for this order shape."
        : "Approve at least one provider in /admin, then reload this page to generate live recommendations.";

  return (
    <Card className="border-white/15 bg-white/10 text-white">
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
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
    .sort((first, second) => second.weightedScore - first.weightedScore)
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
    .sort((first, second) => second.weightedScore - first.weightedScore)
    .slice(0, 3);

  return (
    <Card className={isTopRank ? "border-emerald-200 shadow-sm" : "border-white/15 shadow-sm"}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isTopRank ? "neutral" : "neutral"}>Rank {rank}</Badge>
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
        <CompactNote label="Turnaround" value={`${notes.estimatedTurnaroundDays} days`} />
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
                      <p className="mt-0.5 text-[11px] leading-4.5 text-zinc-600">
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

function orderToFormValues(order: MerchantOrder): OrderFormValues {
  const item = order.items[0];
  return {
    fulfillmentZip: order.fulfillmentZip,
    fulfillmentGoal: order.fulfillmentGoal,
    localPickupPreferred: order.localPickupPreferred,
    garmentType: item?.garmentType ?? "t_shirt",
    quantity: item?.quantity ?? defaultItem.quantity,
    preferredBlankBrand: item?.preferredBlankBrand ?? "",
    preferredBlankStyle: item?.preferredBlankStyle ?? "",
  };
}

function getOrderFormValues(
  searchParams: Record<string, string | string[] | undefined>,
): OrderFormValues {
  const defaultBrand = defaultItem.preferredBlankBrand ?? "";
  const defaultStyle = defaultItem.preferredBlankStyle ?? "";

  return {
    fulfillmentZip: getStringParam(
      searchParams.fulfillmentZip,
      defaultOrder.fulfillmentZip,
    ),
    fulfillmentGoal: getFulfillmentGoalParam(
      searchParams.fulfillmentGoal,
      defaultOrder.fulfillmentGoal,
    ),
    localPickupPreferred:
      getBooleanParam(
        searchParams.localPickupPreferred,
        defaultOrder.localPickupPreferred,
      ),
    garmentType: getGarmentTypeParam(
      searchParams.garmentType,
      defaultItem.garmentType,
    ),
    quantity: getQuantityParam(searchParams.quantity, defaultItem.quantity),
    preferredBlankBrand: getStringParam(
      searchParams.preferredBlankBrand,
      defaultBrand,
    ),
    preferredBlankStyle: getStringParam(
      searchParams.preferredBlankStyle,
      defaultStyle,
    ),
  };
}

function buildMockOrder(values: OrderFormValues): MerchantOrder {
  return {
    ...defaultOrder,
    id: "order-merchant-form-preview",
    status: "ready_for_routing",
    fulfillmentZip: values.fulfillmentZip,
    fulfillmentGoal: values.fulfillmentGoal,
    localPickupPreferred: values.localPickupPreferred,
    items: [
      {
        ...defaultItem,
        id: "order-item-merchant-form-preview",
        printMethod: "dtg",
        garmentType: values.garmentType,
        quantity: values.quantity,
        preferredBlankBrand: values.preferredBlankBrand,
        preferredBlankStyle: values.preferredBlankStyle,
        sizes: {
          M: Math.ceil(values.quantity / 2),
          L: Math.floor(values.quantity / 2),
        },
      },
    ],
    notes: "Mock merchant-entered order generated from /merchant form values.",
  };
}

function getStringParam(
  value: string | string[] | undefined,
  fallback: string,
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getFulfillmentGoalParam(
  value: string | string[] | undefined,
  fallback: FulfillmentGoal,
): FulfillmentGoal {
  const resolvedValue = getStringParam(value, fallback);
  const validValues = fulfillmentGoalOptions.map((option) => option.value);

  return validValues.includes(resolvedValue as FulfillmentGoal)
    ? (resolvedValue as FulfillmentGoal)
    : fallback;
}

function getGarmentTypeParam(
  value: string | string[] | undefined,
  fallback: GarmentType,
): GarmentType {
  const resolvedValue = getStringParam(value, fallback);
  const validValues = garmentTypeOptions.map((option) => option.value);

  return validValues.includes(resolvedValue as GarmentType)
    ? (resolvedValue as GarmentType)
    : fallback;
}

function getQuantityParam(
  value: string | string[] | undefined,
  fallback: number,
) {
  const parsedQuantity = Number.parseInt(getStringParam(value, `${fallback}`), 10);

  if (Number.isNaN(parsedQuantity)) {
    return fallback;
  }

  return Math.max(1, Math.min(parsedQuantity, 500));
}

function getBooleanParam(
  value: string | string[] | undefined,
  fallback: boolean,
) {
  if (Array.isArray(value)) {
    return value.includes("true");
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function formatScoreOutOfTen(score: number) {
  const scaled = Math.max(1, Math.min(10, Math.round(score / 10)));

  return scaled;
}

function getMerchantFactorExplanation(
  factor: RoutingFactor,
  fallbackNote: string,
) {
  const merchantExplanations = {
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

  return merchantExplanations[factor] ?? fallbackNote;
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
    shippingCost: "Mocked shipping favorability.",
    localPickupPreference: "Match for the pickup preference.",
    merchantFulfillmentGoal: "Support for the selected order goal.",
  } satisfies Record<RoutingFactor, string>;

  return compactExplanations[factor] ?? fallbackNote;
}
