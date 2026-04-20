import type { Metadata } from "next";
import {
  BadgeCheck,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Factory,
  Gauge,
  MapPin,
  MessageSquare,
  PackageCheck,
  PackageOpen,
  Printer,
  Ruler,
  Shirt,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { requireRole } from "@/lib/auth/helpers";
import { AppHeader } from "@/components/app-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FieldMetric } from "@/components/ui/field-metric";
import { MockNotice } from "@/components/ui/mock-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { acceptAssignmentAction, declineAssignmentAction } from "@/actions/provider-orders";
import {
  advanceOrderStatusAction,
  updateFulfillmentDetailsAction,
} from "@/actions/provider-order-status";
import { saveProviderInventoryAction } from "@/actions/provider-inventory";
import { saveProviderOnboardingAction } from "@/actions/provider-onboarding";
import { savePricingProfileAction } from "@/actions/provider-pricing";
import {
  getGarmentTypeOptionLabel,
  getPrintMethodOptionLabel,
  loadProviderOnboardingData,
  PROVIDER_GARMENT_TYPE_OPTIONS,
  PROVIDER_PRINT_METHOD_OPTIONS,
  type ProviderOnboardingData,
  type ProviderOnboardingFormValues,
} from "@/lib/provider/onboarding";
import {
  loadProviderInventoryData,
  PROVIDER_INVENTORY_GARMENT_OPTIONS,
  PROVIDER_INVENTORY_STOCK_OPTIONS,
  type ProviderInventoryData,
} from "@/lib/provider/inventory";
import {
  getProviderProfileSummary,
  loadProviderAssignments,
  type ProviderAssignment,
  type ProviderProfileSummary,
} from "@/lib/provider/orders";
import {
  loadProviderPricingProfiles,
  type ProviderPricingProfile,
} from "@/lib/provider/pricing";
import type { PrintMethod } from "@/types";

export const metadata: Metadata = {
  title: "Provider | PrintPair",
  description:
    "Review and save a development provider onboarding profile with routing-relevant capability, capacity, and wholesale-readiness fields.",
};

type ProviderPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const inputClassName =
  "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10";
const textareaClassName =
  "mt-2 min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10";
const labelClassName = "text-sm font-medium text-zinc-700";

export default async function ProviderPage({
  searchParams,
}: ProviderPageProps) {
  const user = await requireRole("provider");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [onboardingData, inventoryData] = await Promise.all([
    loadProviderOnboardingData(user.id),
    loadProviderInventoryData(user.id),
  ]);

  // Queue visibility is scoped to the provider profile owned by this login.
  const providerProfileSummary = await getProviderProfileSummary(user.id);
  const providerProfileId = providerProfileSummary?.id ?? null;
  const [
    { pending: pendingAssignments, accepted: acceptedAssignments },
    pricingProfiles,
  ] = await Promise.all([
    providerProfileId
      ? loadProviderAssignments(providerProfileId)
      : Promise.resolve({ pending: [], accepted: [] }),
    providerProfileId
      ? loadProviderPricingProfiles(providerProfileId)
      : Promise.resolve([] as ProviderPricingProfile[]),
  ]);
  const savedFlag = getStringParam(resolvedSearchParams.saved);
  const sourceFlag = getStringParam(resolvedSearchParams.source);

  const availableCapacity =
    Number.parseInt(onboardingData.values.dailyCapacityUnits, 10) -
    Number.parseInt(onboardingData.values.currentCapacityUsed, 10);
  const capacityUsePercent = getCapacityUsePercent(onboardingData.values);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader />

        <section className="py-10">
          <ProviderWorkspaceHero
            profile={providerProfileSummary}
            values={onboardingData.values}
            capacityUsePercent={capacityUsePercent}
            availableCapacity={availableCapacity}
            activeJobCount={acceptedAssignments.length}
            pendingJobCount={pendingAssignments.length}
          />
          <div className="mt-5">
            <PersistenceNotice
              onboardingData={onboardingData}
              savedFlag={savedFlag}
              sourceFlag={sourceFlag}
            />
          </div>
        </section>

        <section className="pb-12">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Production workspace
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Paid active jobs</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                Paid merchant orders appear here after Stripe confirms payment.
                Move each job through production and keep merchant-facing
                fulfillment details current.
              </p>
            </div>
            <QueueSummaryPills assignments={acceptedAssignments} />
          </div>
          <ActiveProductionQueue
            assignments={acceptedAssignments}
            hasProviderProfile={!!providerProfileId}
          />
        </section>

        {pendingAssignments.length > 0 && (
          <section className="pb-12">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Legacy pending matches
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Manual review queue</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                These are older pre-payment match records. New paid PrintPair
                orders skip this step and enter the active queue automatically.
              </p>
            </div>
            <LegacyPendingOrders assignments={pendingAssignments} />
          </section>
        )}

        <section className="grid gap-8 pb-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Provider profile"
              title="Keep your shop profile ready for future matched orders."
              description="Your capabilities, pricing, inventory, and capacity influence which paid orders are routed to your provider profile."
            />
          </div>

          <ProfilePanel
            values={onboardingData.values}
            qualityScoreLabel={onboardingData.qualityScoreLabel}
            capacityUsePercent={capacityUsePercent}
            hasPersistedRecord={onboardingData.hasPersistedRecord}
            lastSavedAt={onboardingData.lastSavedAt}
          />
        </section>

        <section className="pb-8">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Provider application
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              Provider onboarding
            </h2>
          </div>
          <ProviderOnboardingForm
            values={onboardingData.values}
          />
        </section>

        <section className="pb-8">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Pricing
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Pricing profiles</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              Set your per-unit pricing for each print method you support.
              Merchants see instant estimates on their recommendation cards
              before selecting a provider.
            </p>
          </div>
          <ProviderPricingForm
            supportedMethods={onboardingData.values.printMethods as PrintMethod[]}
            pricingProfiles={pricingProfiles}
            hasProviderProfile={!!providerProfileId}
          />
        </section>

        <section className="pb-8">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Merchant-facing blanks
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              Blank inventory
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              List the blanks you stock so merchants can filter recommendations
              by brand and style. These rows feed blank-fit scoring in the
              routing engine.
            </p>
          </div>
          <ProviderInventoryForm
            inventoryData={inventoryData}
            savedFlag={savedFlag}
            sourceFlag={sourceFlag}
          />
        </section>

        <section className="grid gap-5 pb-16 lg:grid-cols-3">
          <StatCard
            label="Profile status"
            value={
              onboardingData.persistenceMode === "supabase"
                ? onboardingData.hasPersistedRecord
                  ? "Live record"
                  : "Ready to save"
                : "Not configured"
            }
            description="Your provider profile is saved and used for matching. Keep it up to date to improve your routing score."
            icon={<BadgeCheck className="h-5 w-5" />}
          />
          <StatCard
            label="Capacity"
            value={`${availableCapacity} units open`}
            description="Open capacity feeds the routing engine. Update your current capacity regularly to receive appropriately sized orders."
            icon={<Gauge className="h-5 w-5" />}
          />
          <StatCard
            label="Turnaround and pickup"
            value={`${onboardingData.values.turnaroundSlaDays} days / ${onboardingData.values.supportsLocalPickup ? "pickup yes" : "pickup no"}`}
            description="Turnaround SLA and local pickup support directly affect how your shop ranks against merchant fulfillment goals."
            icon={<Truck className="h-5 w-5" />}
          />
        </section>
      </div>
    </main>
  );
}

function ProviderWorkspaceHero({
  profile,
  values,
  capacityUsePercent,
  availableCapacity,
  activeJobCount,
  pendingJobCount,
}: {
  profile: ProviderProfileSummary | null;
  values: ProviderOnboardingFormValues;
  capacityUsePercent: number;
  availableCapacity: number;
  activeJobCount: number;
  pendingJobCount: number;
}) {
  return (
    <Card className="overflow-hidden rounded-md border-zinc-200 bg-white">
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            Provider workspace
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-950">
            Production queue for paid PrintPair jobs.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            {profile
              ? `${profile.businessName} is receiving paid orders selected by merchants. Keep statuses and fulfillment details current so merchants can follow production.`
              : "Save provider onboarding first so paid orders selected for your shop can appear in this workspace."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone={profile ? "brand" : "warning"}>
              {profile ? "Provider profile linked" : "Profile setup needed"}
            </Badge>
            <Badge>{values.supportsLocalPickup ? "Local pickup supported" : "Shipping focused"}</Badge>
            <Badge>{`${values.turnaroundSlaDays} day SLA`}</Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <WorkspaceMetric
            label="Active jobs"
            value={`${activeJobCount}`}
            description="Paid jobs in your queue"
          />
          <WorkspaceMetric
            label="Open capacity"
            value={`${availableCapacity}`}
            description={`${capacityUsePercent}% currently used`}
          />
          <WorkspaceMetric
            label="Legacy pending"
            value={`${pendingJobCount}`}
            description="Older pre-payment matches"
          />
        </div>
      </div>
    </Card>
  );
}

function WorkspaceMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
    </div>
  );
}

function PersistenceNotice({
  onboardingData,
  savedFlag,
  sourceFlag,
}: {
  onboardingData: ProviderOnboardingData;
  savedFlag: string;
  sourceFlag: string;
}) {
  if (savedFlag === "inventory" && sourceFlag === "supabase") {
    return (
      <MockNotice>
        Provider inventory rows saved to Supabase for merchant-facing blank
        matching.
      </MockNotice>
    );
  }

  if (savedFlag === "pricing" && sourceFlag === "supabase") {
    return (
      <MockNotice>
        Pricing profiles saved. Merchants will now see instant price estimates
        when your shop appears in recommendations.
      </MockNotice>
    );
  }

  if (savedFlag === "1" && sourceFlag === "supabase") {
    return (
      <MockNotice>
        Provider onboarding saved to Supabase.
      </MockNotice>
    );
  }

  if (onboardingData.persistenceMode === "supabase") {
    return (
      <MockNotice>
        Your provider profile is live. Changes you save here are reflected
        immediately in merchant order recommendations.
      </MockNotice>
    );
  }

  return (
    <MockNotice>
      Provider persistence is not configured in this environment. Set the
      Supabase environment variables to save and load your provider profile.
    </MockNotice>
  );
}

function ProviderInventoryForm({
  inventoryData,
  savedFlag,
  sourceFlag,
}: {
  inventoryData: ProviderInventoryData;
  savedFlag: string;
  sourceFlag: string;
}) {
  if (inventoryData.persistenceMode === "supabase" && !inventoryData.hasProviderProfile) {
    return (
      <Card className="shadow-sm">
        <p className="text-sm leading-6 text-zinc-600">
          Save provider onboarding first. Inventory rows attach to the current
          live provider profile after the onboarding record exists.
        </p>
      </Card>
    );
  }

  return (
    <form action={saveProviderInventoryAction} className="grid gap-5">
      {(savedFlag === "inventory" && sourceFlag === "supabase") ? (
        <MockNotice>
          Blank inventory saved. These rows are now used for brand and style
          matching on merchant order recommendations.
        </MockNotice>
      ) : null}
      <Card className="shadow-sm">
        <div className="grid gap-4">
          {inventoryData.rows.map((row, index) => (
            <div
              key={`${row.id || "new"}-${index}`}
              className="rounded-md border border-zinc-200 bg-zinc-50 p-4"
            >
              <input
                type="hidden"
                name={`inventoryRows.${index}.id`}
                value={row.id}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Blank brand">
                  <input
                    name={`inventoryRows.${index}.blankBrand`}
                    defaultValue={row.blankBrand}
                    className={inputClassName}
                  />
                </FormField>
                <FormField label="Style name">
                  <input
                    name={`inventoryRows.${index}.styleName`}
                    defaultValue={row.styleName}
                    className={inputClassName}
                  />
                </FormField>
                <FormField label="Garment type">
                  <select
                    name={`inventoryRows.${index}.garmentType`}
                    defaultValue={row.garmentType}
                    className={inputClassName}
                  >
                    {PROVIDER_INVENTORY_GARMENT_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {getGarmentTypeOptionLabel(value)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Stock status">
                  <select
                    name={`inventoryRows.${index}.stockStatus`}
                    defaultValue={row.stockStatus}
                    className={inputClassName}
                  >
                    {PROVIDER_INVENTORY_STOCK_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Quantity on hand">
                  <input
                    name={`inventoryRows.${index}.quantityOnHand`}
                    type="number"
                    min="0"
                    defaultValue={row.quantityOnHand}
                    className={inputClassName}
                  />
                </FormField>
                <FormField label="Colors">
                  <input
                    name={`inventoryRows.${index}.colors`}
                    defaultValue={row.colors}
                    className={inputClassName}
                  />
                </FormField>
                <FormField label="Sizes">
                  <input
                    name={`inventoryRows.${index}.sizes`}
                    defaultValue={row.sizes}
                    className={inputClassName}
                  />
                </FormField>
                <ToggleField
                  label="Premium blank"
                  name={`inventoryRows.${index}.isPremiumBlank`}
                  checked={row.isPremiumBlank}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-900"
        >
          Save inventory rows
        </button>
        <p className="text-sm text-zinc-600">
          Saved rows are used for merchant blank brand and style matching.
        </p>
      </div>
    </form>
  );
}

function ProfilePanel({
  values,
  qualityScoreLabel,
  capacityUsePercent,
  hasPersistedRecord,
  lastSavedAt,
}: {
  values: ProviderOnboardingFormValues;
  qualityScoreLabel: string;
  capacityUsePercent: number;
  hasPersistedRecord: boolean;
  lastSavedAt?: string;
}) {
  const availableCapacity =
    Number.parseInt(values.dailyCapacityUnits, 10) -
    Number.parseInt(values.currentCapacityUsed, 10);

  return (
    <Card className="overflow-hidden border-zinc-200 bg-gradient-to-br from-white via-white to-zinc-50">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <ProviderIconCircle active>
            <Store className="h-5 w-5" />
          </ProviderIconCircle>
          <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {hasPersistedRecord ? "Saved provider profile" : "Development provider profile"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{values.businessName}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {values.contactName} - {values.city}, {values.state} {values.zip}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{values.businessType || "Business type pending"}</Badge>
            <Badge>
              {values.supportsLocalPickup ? "Local pickup" : "No pickup"}
            </Badge>
            <Badge>{`${values.yearsInOperation || "0"} years active`}</Badge>
          </div>
          </div>
        </div>
        <div className="rounded-2xl bg-zinc-950 px-5 py-4 text-white shadow-sm shadow-zinc-950/20">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
            Capacity used
          </p>
          <p className="text-2xl font-semibold">{capacityUsePercent}%</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <FieldMetric
          label="Turnaround SLA"
          value={`${values.turnaroundSlaDays} days`}
          icon={<Clock3 className="h-4 w-4" />}
        />
        <FieldMetric
          label="Daily capacity"
          value={`${values.dailyCapacityUnits} units`}
          icon={<Boxes className="h-4 w-4" />}
        />
        <FieldMetric
          label="Current capacity used"
          value={`${values.currentCapacityUsed} units`}
          icon={<Gauge className="h-4 w-4" />}
        />
        <FieldMetric
          label="Open capacity"
          value={`${availableCapacity} units`}
          icon={<PackageOpen className="h-4 w-4" />}
        />
        <FieldMetric
          label="Quality score"
          value={qualityScoreLabel}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <FieldMetric
          label="Last saved"
          value={lastSavedAt ? formatDateTime(lastSavedAt) : "Not saved yet"}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TagGroup
          title="Supported print methods"
          values={values.printMethods.map(getPrintMethodOptionLabel)}
          icon={<Printer className="h-4 w-4" />}
        />
        <TagGroup
          title="Garment compatibility"
          values={values.garmentTypes.map(getGarmentTypeOptionLabel)}
          icon={<Shirt className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/5">
        <div className="flex items-center gap-3">
          <ProviderIconCircle>
            <Building2 className="h-4 w-4" />
          </ProviderIconCircle>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Wholesale readiness snapshot
          </h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FieldMetric
            label="Seller's permit"
            value={values.sellersPermitNumber || "Not provided"}
          />
          <FieldMetric
            label="EIN / tax ID"
            value={values.einPlaceholder || "Not provided"}
          />
          <FieldMetric
            label="Fulfillment cutoff"
            value={values.fulfillmentCutoffTime || "Not provided"}
          />
        </div>
      </div>
    </Card>
  );
}

function ProviderOnboardingForm({
  values,
}: {
  values: ProviderOnboardingFormValues;
}) {
  return (
    <form action={saveProviderOnboardingAction} className="grid gap-5">
      <Card className="shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Business profile
        </h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField label="Business name">
            <input name="businessName" defaultValue={values.businessName} className={inputClassName} />
          </FormField>
          <FormField label="Legal business name">
            <input name="legalBusinessName" defaultValue={values.legalBusinessName} className={inputClassName} />
          </FormField>
          <FormField label="DBA / shop name">
            <input name="dbaName" defaultValue={values.dbaName} className={inputClassName} />
          </FormField>
          <FormField label="Contact name">
            <input name="contactName" defaultValue={values.contactName} className={inputClassName} />
          </FormField>
          <FormField label="Business email">
            <input name="businessEmail" type="email" defaultValue={values.businessEmail} className={inputClassName} />
          </FormField>
          <FormField label="Phone">
            <input name="phone" defaultValue={values.phone} className={inputClassName} />
          </FormField>
          <FormField label="Street address" className="sm:col-span-2">
            <input name="streetAddress" defaultValue={values.streetAddress} className={inputClassName} />
          </FormField>
          <FormField label="City">
            <input name="city" defaultValue={values.city} className={inputClassName} />
          </FormField>
          <FormField label="State">
            <input name="state" defaultValue={values.state} className={inputClassName} />
          </FormField>
          <FormField label="ZIP">
            <input name="zip" defaultValue={values.zip} className={inputClassName} />
          </FormField>
          <FormField label="Business type">
            <input name="businessType" defaultValue={values.businessType} className={inputClassName} />
          </FormField>
          <FormField label="Years in operation">
            <input name="yearsInOperation" type="number" min="0" defaultValue={values.yearsInOperation} className={inputClassName} />
          </FormField>
        </div>
      </Card>

      <Card className="shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Capability and fulfillment
        </h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField label="Turnaround SLA (days)">
            <input name="turnaroundSlaDays" type="number" min="1" defaultValue={values.turnaroundSlaDays} className={inputClassName} />
          </FormField>
          <FormField label="Service radius (miles)">
            <input name="serviceRadiusMiles" type="number" min="0" defaultValue={values.serviceRadiusMiles} className={inputClassName} />
          </FormField>
          <FormField label="Daily capacity (units)">
            <input name="dailyCapacityUnits" type="number" min="0" defaultValue={values.dailyCapacityUnits} className={inputClassName} />
          </FormField>
          <FormField label="Current capacity used">
            <input name="currentCapacityUsed" type="number" min="0" defaultValue={values.currentCapacityUsed} className={inputClassName} />
          </FormField>
          <FormField label="Max order quantity">
            <input name="maxOrderQuantity" type="number" min="0" defaultValue={values.maxOrderQuantity} className={inputClassName} />
          </FormField>
          <FormField label="Fulfillment cutoff time">
            <input name="fulfillmentCutoffTime" defaultValue={values.fulfillmentCutoffTime} className={inputClassName} />
          </FormField>
          <FormField label="Reorder lead time (days)">
            <input name="reorderLeadTimeDays" type="number" min="0" defaultValue={values.reorderLeadTimeDays} className={inputClassName} />
          </FormField>
          <FormField label="Specialties" className="sm:col-span-2">
            <textarea name="specialties" defaultValue={values.specialties} className={textareaClassName} />
          </FormField>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <CheckboxGroup
            label="Supported print methods"
            name="printMethods"
            options={PROVIDER_PRINT_METHOD_OPTIONS.map((value) => ({
              value,
              label: getPrintMethodOptionLabel(value),
            }))}
            selectedValues={values.printMethods}
          />
          <CheckboxGroup
            label="Garment compatibility"
            name="garmentTypes"
            options={PROVIDER_GARMENT_TYPE_OPTIONS.map((value) => ({
              value,
              label: getGarmentTypeOptionLabel(value),
            }))}
            selectedValues={values.garmentTypes}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ToggleField
            label="Supports local pickup"
            name="supportsLocalPickup"
            checked={values.supportsLocalPickup}
          />
          <ToggleField
            label="Accepts premium blanks"
            name="acceptsPremiumBlanks"
            checked={values.acceptsPremiumBlanks}
          />
        </div>
      </Card>

      <Card className="shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Wholesale readiness
        </h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField label="Seller's permit / resale certificate">
            <input name="sellersPermitNumber" defaultValue={values.sellersPermitNumber} className={inputClassName} />
          </FormField>
          <FormField label="EIN / tax ID placeholder">
            <input name="einPlaceholder" defaultValue={values.einPlaceholder} className={inputClassName} />
          </FormField>
          <FormField label="Supplier account readiness" className="sm:col-span-2">
            <textarea name="supplierAccountReadiness" defaultValue={values.supplierAccountReadiness} className={textareaClassName} />
          </FormField>
          <FormField label="Preferred blank distributors" className="sm:col-span-2">
            <textarea name="preferredBlankDistributors" defaultValue={values.preferredBlankDistributors} className={textareaClassName} />
          </FormField>
          <FormField label="Blank sourcing notes" className="sm:col-span-2">
            <textarea name="blankSourcingNotes" defaultValue={values.blankSourcingNotes} className={textareaClassName} />
          </FormField>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-900"
        >
          Save provider onboarding
        </button>
        <p className="text-sm text-zinc-600">
          Saved values update your live profile and affect routing scores on
          merchant recommendations.
        </p>
      </div>
    </form>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`${labelClassName} ${className}`}>
      {label}
      {children}
    </label>
  );
}

function CheckboxGroup({
  label,
  name,
  options,
  selectedValues,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
}) {
  return (
    <div>
      <p className={labelClassName}>{label}</p>
      <div className="mt-3 grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selectedValues.includes(option.value)}
              className="mt-1 h-4 w-4 accent-zinc-950"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ToggleField({
  label,
  name,
  checked,
}: {
  label: string;
  name: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
      <input type="hidden" name={name} value="false" />
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={checked}
        className="mt-1 h-4 w-4 accent-zinc-950"
      />
      <span>{label}</span>
    </label>
  );
}

function ProviderIconCircle({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm shadow-zinc-950/10 ${
        active
          ? "border-zinc-300 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-600"
      }`}
    >
      {children}
    </div>
  );
}

function TagGroup({
  title,
  values,
  icon,
}: {
  title: string;
  values: string[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/5">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">
          {title}
        </h3>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value}>{value}</Badge>
        ))}
      </div>
    </div>
  );
}

function ProviderQueueIdentity({
  profile,
}: {
  profile: ProviderProfileSummary | null;
}) {
  if (!profile) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm shadow-zinc-950/5">
      <ProviderIconCircle>
        <Factory className="h-4 w-4" />
      </ProviderIconCircle>
      <div>
        <span className="font-semibold text-zinc-950">Viewing queue for:</span>{" "}
        {profile.businessName}
        <span className="ml-2 text-zinc-500">
          ({profile.verificationStatus.replaceAll("_", " ")})
        </span>
      </div>
    </div>
  );
}

function QueueSummaryPills({ assignments }: { assignments: ProviderAssignment[] }) {
  const statusCounts = assignments.reduce(
    (counts, assignment) => {
      counts.total += 1;
      if (assignment.orderStatus === "paid" || assignment.orderStatus === "accepted") {
        counts.readyToStart += 1;
      }
      if (assignment.orderStatus === "in_production") {
        counts.inProduction += 1;
      }
      if (assignment.orderStatus === "ready" || assignment.orderStatus === "shipped") {
        counts.handoff += 1;
      }
      return counts;
    },
    { total: 0, readyToStart: 0, inProduction: 0, handoff: 0 },
  );

  return (
    <div className="flex flex-wrap gap-2">
      <QueuePill label="All active" value={statusCounts.total} />
      <QueuePill label="Ready to start" value={statusCounts.readyToStart} />
      <QueuePill label="In production" value={statusCounts.inProduction} />
      <QueuePill label="Handoff" value={statusCounts.handoff} />
    </div>
  );
}

function QueuePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm">
      <span>{label}</span>
      <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-xs text-white">
        {value}
      </span>
    </div>
  );
}

function ActiveProductionQueue({
  assignments,
  hasProviderProfile,
}: {
  assignments: ProviderAssignment[];
  hasProviderProfile: boolean;
}) {
  if (!hasProviderProfile) {
    return (
      <Card className="border-dashed bg-gradient-to-br from-white to-zinc-50">
        <div className="flex gap-4">
          <ProviderIconCircle>
            <Store className="h-5 w-5" />
          </ProviderIconCircle>
          <p className="text-sm leading-6 text-zinc-600">
            No provider profile is linked to this login yet. Save provider
            onboarding first, then paid orders selected for that profile will
            appear here.
          </p>
        </div>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card className="border-dashed bg-gradient-to-br from-white to-zinc-50">
        <div className="flex gap-4">
          <ProviderIconCircle>
            <PackageCheck className="h-5 w-5" />
          </ProviderIconCircle>
          <div>
            <h3 className="text-xl font-semibold text-zinc-950">
              Production queue is clear
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              No paid active jobs right now. When a merchant pays for an order
              after selecting your shop, it will appear here automatically.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return <AcceptedOrders assignments={assignments} />;
}

function LegacyPendingOrders({
  assignments,
}: {
  assignments: ProviderAssignment[];
}) {
  if (assignments.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FieldMetric
                label="Garment"
                value={assignment.garmentType.replaceAll("_", " ")}
                icon={<Shirt className="h-4 w-4" />}
              />
              <FieldMetric
                label="Quantity"
                value={`${assignment.quantity} units`}
                icon={<Boxes className="h-4 w-4" />}
              />
              <FieldMetric
                label="Fulfillment ZIP"
                value={assignment.fulfillmentZip}
                icon={<MapPin className="h-4 w-4" />}
              />
              <FieldMetric
                label="Goal"
                value={assignment.fulfillmentGoal.replaceAll("_", " ")}
                icon={<Ruler className="h-4 w-4" />}
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <form action={acceptAssignmentAction}>
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-950 px-4 text-sm font-semibold text-white transition hover:bg-indigo-900"
                >
                  Move to active
                </button>
              </form>
              <form action={declineAssignmentAction}>
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Decline
                </button>
              </form>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            Assigned {formatDateTime(assignment.assignedAt)}
          </p>
        </Card>
      ))}
    </div>
  );
}

const NEXT_STATUS_LABELS: Record<string, string> = {
  paid: "Start production",
  accepted: "Start production",
  in_production: "Mark as ready",
  ready: "Mark as shipped",
  shipped: "Mark as completed",
};

function getProviderStatusContext(status: ProviderAssignment["orderStatus"]) {
  switch (status) {
    case "paid":
    case "accepted":
      return {
        label: "Ready to start",
        description:
          "This paid order is released to your active queue. Start production when your team is ready.",
      };
    case "in_production":
      return {
        label: "In production",
        description:
          "Production is underway. Keep notes and estimated ready dates current for the merchant.",
      };
    case "ready":
      return {
        label: "Ready for handoff",
        description:
          "This job is ready for the next fulfillment step. Add pickup or shipping details before moving it forward.",
      };
    case "shipped":
      return {
        label: "Handoff complete",
        description:
          "The order has moved through handoff. Mark it completed when no further provider action is needed.",
      };
    case "completed":
      return {
        label: "Completed",
        description: "This job is complete.",
      };
    default:
      return {
        label: status.replaceAll("_", " "),
        description:
          "Review this paid order and update production status when work begins.",
      };
  }
}

function getProviderProgressSteps(status: ProviderAssignment["orderStatus"]) {
  const progress = getProviderProgressIndex(status);
  const steps = [
    { label: "Paid", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { label: "Production", icon: <Printer className="h-3.5 w-3.5" /> },
    { label: "Ready", icon: <PackageCheck className="h-3.5 w-3.5" /> },
    { label: "Handoff", icon: <Truck className="h-3.5 w-3.5" /> },
    { label: "Complete", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  ];

  return steps.map((step, index) => ({
    ...step,
    state:
      index < progress
        ? "complete"
        : index === progress
          ? "current"
          : "upcoming",
  }));
}

function getProviderProgressIndex(status: ProviderAssignment["orderStatus"]) {
  switch (status) {
    case "paid":
    case "accepted":
      return 0;
    case "in_production":
      return 1;
    case "ready":
      return 2;
    case "shipped":
      return 3;
    case "completed":
      return 4;
    default:
      return 0;
  }
}

function AcceptedOrders({ assignments }: { assignments: ProviderAssignment[] }) {
  return (
    <div className="grid gap-5">
      {assignments.map((assignment) => {
        const nextLabel = NEXT_STATUS_LABELS[assignment.orderStatus];
        const statusContext = getProviderStatusContext(assignment.orderStatus);

        return (
          <Card key={assignment.id} className="rounded-md border-zinc-200 bg-white">
            <div className="grid gap-5 lg:grid-cols-[1fr_13rem] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">Paid job</Badge>
                  <Badge>{`Order ${formatShortId(assignment.merchantOrderId)}`}</Badge>
                  <StatusBadge status={assignment.orderStatus} />
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-zinc-950">
                  {assignment.quantity} {assignment.garmentType.replaceAll("_", " ")}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                  {statusContext.description}
                </p>
              </div>

              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Current state
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-950">
                  {statusContext.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Released {assignment.respondedAt ? formatDateTime(assignment.respondedAt) : "recently"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FieldMetric
                label="Item"
                value={assignment.garmentType.replaceAll("_", " ")}
                icon={<Shirt className="h-4 w-4" />}
              />
              <FieldMetric
                label="Quantity"
                value={`${assignment.quantity} units`}
                icon={<Boxes className="h-4 w-4" />}
              />
              <FieldMetric
                label="Fulfillment ZIP"
                value={assignment.fulfillmentZip}
                icon={<MapPin className="h-4 w-4" />}
              />
              <FieldMetric
                label="Merchant goal"
                value={assignment.fulfillmentGoal.replaceAll("_", " ")}
                icon={<Ruler className="h-4 w-4" />}
              />
            </div>

            <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {getProviderProgressSteps(assignment.orderStatus).map((step) => (
                  <div
                    key={step.label}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                      step.state === "complete"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : step.state === "current"
                          ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                          : "border-zinc-200 bg-white text-zinc-500"
                    }`}
                  >
                    {step.icon}
                    {step.label}
                  </div>
                ))}
              </div>
            </div>

            <JobActionBar
              assignment={assignment}
              nextStatusLabel={nextLabel}
            />

            <details className="mt-4 rounded-md border border-zinc-200 bg-zinc-50">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-zinc-700 marker:hidden">
                Open production details
              </summary>
              <div className="border-t border-zinc-200 p-4">
                <FulfillmentDetailsForm
                  assignment={assignment}
                  nextStatusLabel={nextLabel}
                />
              </div>
            </details>
          </Card>
        );
      })}
    </div>
  );
}

function JobActionBar({
  assignment,
  nextStatusLabel,
}: {
  assignment: ProviderAssignment;
  nextStatusLabel?: string;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-zinc-950">Next provider action</p>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Advance the job from the queue card, or open production details to add
          merchant-facing notes before saving.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {nextStatusLabel ? (
          <form action={advanceOrderStatusAction}>
            <input
              type="hidden"
              name="merchantOrderId"
              value={assignment.merchantOrderId}
            />
            <HiddenFulfillmentDetailInputs assignment={assignment} />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-950 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-950/20 transition hover:bg-indigo-900"
            >
              <PackageCheck className="h-4 w-4" />
              {nextStatusLabel}
            </button>
          </form>
        ) : (
          <Badge tone="brand">No further status action</Badge>
        )}
      </div>
    </div>
  );
}

function HiddenFulfillmentDetailInputs({
  assignment,
}: {
  assignment: ProviderAssignment;
}) {
  const details = assignment.fulfillmentDetails;

  return (
    <>
      <input type="hidden" name="providerNotes" value={details.providerNotes ?? ""} />
      <input type="hidden" name="estimatedReadyDate" value={details.estimatedReadyDate ?? ""} />
      <input type="hidden" name="pickupInstructions" value={details.pickupInstructions ?? ""} />
      <input type="hidden" name="readyForPickupNote" value={details.readyForPickupNote ?? ""} />
      <input type="hidden" name="carrierName" value={details.carrierName ?? ""} />
      <input type="hidden" name="trackingNumber" value={details.trackingNumber ?? ""} />
      <input type="hidden" name="shippingNote" value={details.shippingNote ?? ""} />
    </>
  );
}

function FulfillmentDetailsForm({
  assignment,
  nextStatusLabel,
}: {
  assignment: ProviderAssignment;
  nextStatusLabel?: string;
}) {
  const details = assignment.fulfillmentDetails;

  return (
    <form action={updateFulfillmentDetailsAction} className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/5">
      <input
        type="hidden"
        name="merchantOrderId"
        value={assignment.merchantOrderId}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ProviderIconCircle>
            <ClipboardList className="h-4 w-4" />
          </ProviderIconCircle>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Production details
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Merchant-facing notes, handoff instructions, and tracking fields.
            </p>
          </div>
        </div>
        {details.updatedAt ? (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
            Updated {formatDateTime(details.updatedAt)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FormField label="Provider notes">
          <textarea
            name="providerNotes"
            defaultValue={details.providerNotes ?? ""}
            className={textareaClassName}
            placeholder="Production note visible to the merchant"
          />
        </FormField>
        <FormField label="Estimated ready date">
          <input
            name="estimatedReadyDate"
            type="date"
            defaultValue={details.estimatedReadyDate ?? ""}
            className={inputClassName}
          />
        </FormField>
        <FormField label="Pickup instructions">
          <textarea
            name="pickupInstructions"
            defaultValue={details.pickupInstructions ?? ""}
            className={textareaClassName}
            placeholder="Where and how the merchant should pick up"
          />
        </FormField>
        <FormField label="Ready-for-pickup note">
          <textarea
            name="readyForPickupNote"
            defaultValue={details.readyForPickupNote ?? ""}
            className={textareaClassName}
            placeholder="Add when marking the order ready"
          />
        </FormField>
        <FormField label="Carrier">
          <input
            name="carrierName"
            defaultValue={details.carrierName ?? ""}
            className={inputClassName}
            placeholder="UPS, FedEx, USPS, local courier"
          />
        </FormField>
        <FormField label="Tracking number">
          <input
            name="trackingNumber"
            defaultValue={details.trackingNumber ?? ""}
            className={inputClassName}
            placeholder="Tracking or courier reference"
          />
        </FormField>
        <FormField label="Shipping note" className="lg:col-span-2">
          <textarea
            name="shippingNote"
            defaultValue={details.shippingNote ?? ""}
            className={textareaClassName}
            placeholder="Delivery notes, package count, or handoff details"
          />
        </FormField>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
        >
          <MessageSquare className="h-4 w-4" />
          Save details
        </button>
        {nextStatusLabel ? (
          <button
            type="submit"
            formAction={advanceOrderStatusAction}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-950 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-950/20 transition hover:bg-indigo-900"
          >
            <PackageCheck className="h-4 w-4" />
            {nextStatusLabel}
          </button>
        ) : null}
        <p className="text-sm text-zinc-500">
          Status changes save these details at the same time.
        </p>
      </div>
    </form>
  );
}

function getCapacityUsePercent(values: ProviderOnboardingFormValues) {
  const dailyCapacityUnits = Number.parseInt(values.dailyCapacityUnits, 10);
  const currentCapacityUsed = Number.parseInt(values.currentCapacityUsed, 10);

  if (!dailyCapacityUnits) {
    return 0;
  }

  return Math.round((currentCapacityUsed / dailyCapacityUnits) * 100);
}

function getStringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatShortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const PRINT_METHOD_LABELS: Record<PrintMethod, string> = {
  dtg: "Direct-to-garment (DTG)",
  dtf: "Direct-to-film (DTF)",
  screen_print: "Screen print",
  embroidery: "Embroidery",
  heat_transfer: "Heat transfer",
};

const PRICING_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "instant", label: "Instant — price shown immediately to merchant" },
  { value: "hybrid", label: "Hybrid — instant estimate + manual confirmation" },
  { value: "manual_quote", label: "Manual quote — merchant requests a quote" },
];

function ProviderPricingForm({
  supportedMethods,
  pricingProfiles,
  hasProviderProfile,
}: {
  supportedMethods: PrintMethod[];
  pricingProfiles: ProviderPricingProfile[];
  hasProviderProfile: boolean;
}) {
  if (!hasProviderProfile) {
    return (
      <Card className="shadow-sm">
        <p className="text-sm leading-6 text-zinc-600">
          Save provider onboarding first. Pricing profiles attach to the live
          provider record after it exists.
        </p>
      </Card>
    );
  }

  if (supportedMethods.length === 0) {
    return (
      <Card className="shadow-sm">
        <p className="text-sm leading-6 text-zinc-600">
          Select at least one supported print method in your onboarding profile
          to configure pricing.
        </p>
      </Card>
    );
  }

  const profilesByMethod = new Map(
    pricingProfiles.map((p) => [p.printMethod, p]),
  );

  return (
    <form action={savePricingProfileAction} className="grid gap-5">
      {supportedMethods.map((method) => {
        const existing = profilesByMethod.get(method);
        return (
          <Card key={method} className="shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {PRINT_METHOD_LABELS[method] ?? method.replaceAll("_", " ")}
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Pricing mode" className="sm:col-span-2 lg:col-span-3">
                <select
                  name={`pricing_${method}_mode`}
                  defaultValue={existing?.pricingMode ?? "instant"}
                  className={inputClassName}
                >
                  {PRICING_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Base price per unit ($)">
                <input
                  name={`pricing_${method}_base_price`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    existing ? (existing.basePriceCents / 100).toFixed(2) : "0.00"
                  }
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Setup fee ($)">
                <input
                  name={`pricing_${method}_setup_fee`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    existing ? (existing.setupFeeCents / 100).toFixed(2) : "0.00"
                  }
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Minimum quantity">
                <input
                  name={`pricing_${method}_min_qty`}
                  type="number"
                  min="1"
                  defaultValue={existing?.minimumQuantity ?? 1}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Turnaround (days)">
                <input
                  name={`pricing_${method}_turnaround`}
                  type="number"
                  min="1"
                  defaultValue={existing?.turnaroundDays ?? 5}
                  className={inputClassName}
                />
              </FormField>
              <div className="flex flex-col gap-3 sm:col-span-2">
                <ToggleField
                  label="Supports local pickup"
                  name={`pricing_${method}_local_pickup`}
                  checked={existing?.supportsLocalPickup ?? false}
                />
                <ToggleField
                  label="Supports shipping"
                  name={`pricing_${method}_shipping`}
                  checked={existing?.supportsShipping ?? true}
                />
              </div>
              <FormField label="Notes" className="sm:col-span-2 lg:col-span-3">
                <textarea
                  name={`pricing_${method}_notes`}
                  defaultValue={existing?.notes ?? ""}
                  className={textareaClassName}
                  rows={2}
                />
              </FormField>
            </div>
          </Card>
        );
      })}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-900"
        >
          Save pricing profiles
        </button>
        <p className="text-sm text-zinc-600">
          Saved pricing is shown to merchants as instant estimates on
          recommendation cards.
        </p>
      </div>
    </form>
  );
}
