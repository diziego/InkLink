import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FieldMetric } from "@/components/ui/field-metric";
import { MockNotice } from "@/components/ui/mock-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  mockBlankInventory,
  mockMerchantOrders,
  mockMerchants,
} from "@/lib/mock-data";
import {
  recommendMockProvidersForOrder,
  type ProviderRecommendation,
  type RoutingFactor,
} from "@/lib/routing";
import type {
  FulfillmentGoal,
  GarmentType,
  MerchantOrder,
} from "@/types";

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

const factorLabels = {
  printMethodCompatibility: "Print method",
  garmentCompatibility: "Garment fit",
  blankAvailability: "Blank availability",
  providerVerificationTier: "Verification and tier",
  providerQuality: "Quality",
  turnaroundSla: "Turnaround",
  providerCapacity: "Capacity",
  proximity: "Proximity",
  shippingCost: "Shipping cost",
  localPickupPreference: "Local pickup",
  merchantFulfillmentGoal: "Merchant goal",
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

const blankBrandOptions = Array.from(
  new Set(mockBlankInventory.map((blank) => blank.blankBrand)),
).sort();

const blankStyleOptions = Array.from(
  new Set(mockBlankInventory.map((blank) => blank.styleName)),
).sort();

export default async function MerchantPage({ searchParams }: MerchantPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const formValues = getOrderFormValues(resolvedSearchParams);
  const order = buildMockOrder(formValues);
  const recommendations = recommendMockProvidersForOrder(order).slice(0, 3);
  const topRecommendation = recommendations[0];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-white sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader theme="dark" />

        <section className="grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Merchant workspace"
              title="Create a DTG order and compare local providers."
              description="This screen uses mocked order inputs and the deterministic routing engine. No auth, database writes, payment, or live carrier quotes are active yet."
              theme="dark"
            />
            <div className="mt-8">
              <MockNotice tone="dark">
                Mocked MVP flow: changing the form rebuilds a temporary order
                from URL values and reruns provider scoring against static
                Southern California sample data.
              </MockNotice>
            </div>
          </div>

          <div className="grid gap-4">
            <DemoScenarioSwitcher />
            <OrderEntryForm values={formValues} />
          </div>
        </section>

        <section className="pb-16">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
                Ranked recommendations
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Top providers for this mocked order
              </h2>
            </div>
            <p className="text-sm text-zinc-400">
              Merchant: {defaultMerchant?.businessName ?? "Mock merchant"} -
              Print method: DTG
            </p>
          </div>

          {topRecommendation ? (
            <FirstRankSummary recommendation={topRecommendation} />
          ) : null}

          <div className="grid gap-5">
            {recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.providerId}
                rank={index + 1}
                recommendation={recommendation}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function OrderEntryForm({ values }: { values: OrderFormValues }) {
  return (
    <form
      action="/merchant"
      className="rounded-md border border-white/15 bg-white p-6 text-zinc-950 shadow-sm"
    >
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Mock order entry
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Route a DTG test order
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Values are not saved. Submitting updates the URL and reruns routing
          with mocked data.
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
        Update recommendations
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
        <p className="text-sm text-zinc-300">Mocked URL scenarios</p>
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
        Presets only change mocked URL values. The form below still drives the
        recommendation results.
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
            Strongest weighted signals from the transparent routing score.
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
                {factor.score}/100 - weighted {factor.weightedScore}
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
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
            {recommendation.explanation}
          </p>
        </div>
        <div className="rounded-md bg-zinc-950 px-5 py-4 text-center text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
            Score
          </p>
          <p className="text-3xl font-semibold">{recommendation.totalScore}</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-5">
        <FieldMetric label="Turnaround" value={`${notes.estimatedTurnaroundDays} days`} />
        <FieldMetric
          label="Shipping"
          value={`$${notes.estimatedShippingCostUsd.toFixed(2)}`}
        />
        <FieldMetric
          label="Distance"
          value={`${notes.estimatedDistanceMiles} mi`}
        />
        <FieldMetric
          label="Capacity"
          value={`${notes.availableCapacityUnits}/${notes.requestedUnits} units`}
        />
        <FieldMetric
          label="Pickup"
          value={notes.localPickupSupported ? "Supported" : "Not supported"}
        />
      </dl>

      <div className="mt-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Factor breakdown
        </h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {factorOrder.map((factor) => {
            const breakdown = recommendation.factorBreakdown[factor];

            return (
              <div
                key={factor}
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{factorLabels[factor]}</p>
                  <Badge>
                    {breakdown.score}/100 - w{breakdown.weight}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {breakdown.note}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
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
      getStringParam(
        searchParams.localPickupPreferred,
        defaultOrder.localPickupPreferred ? "true" : "false",
      ) === "true",
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
