import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/helpers";
import { AppHeader } from "@/components/app-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FieldMetric } from "@/components/ui/field-metric";
import { MockNotice } from "@/components/ui/mock-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { acceptAssignmentAction, declineAssignmentAction } from "@/actions/provider-orders";
import { advanceOrderStatusAction } from "@/actions/provider-order-status";
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
  getProviderProfileId,
  loadProviderAssignments,
  type ProviderAssignment,
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

  // Load incoming assignments and pricing profiles if a provider profile exists
  const providerProfileId = await getProviderProfileId(user.id);
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

        <section className="grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Provider onboarding"
              title="List your shop's capabilities to start receiving matched orders from local brands."
              description="Complete your profile so PrintPair can match your print methods, garment types, capacity, and location against incoming merchant orders."
            />
            <div className="mt-8">
              <PersistenceNotice
                onboardingData={onboardingData}
                savedFlag={savedFlag}
                sourceFlag={sourceFlag}
              />
            </div>
          </div>

          <ProfilePanel
            values={onboardingData.values}
            qualityScoreLabel={onboardingData.qualityScoreLabel}
            capacityUsePercent={capacityUsePercent}
            hasPersistedRecord={onboardingData.hasPersistedRecord}
            lastSavedAt={onboardingData.lastSavedAt}
          />
        </section>

        <section className="pb-12">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Order inbox
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Incoming orders</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              Orders matched to your provider profile by the routing engine.
              Accept to claim the job and move it to production. Decline to pass.
            </p>
          </div>
          <IncomingOrders assignments={pendingAssignments} hasProviderProfile={!!providerProfileId} />
        </section>

        {acceptedAssignments.length > 0 && (
          <section className="pb-12">
            <div className="mb-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Accepted
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Accepted orders</h2>
            </div>
            <AcceptedOrders assignments={acceptedAssignments} />
          </section>
        )}

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
          />
          <StatCard
            label="Capacity"
            value={`${availableCapacity} units open`}
            description="Open capacity feeds the routing engine. Update your current capacity regularly to receive appropriately sized orders."
          />
          <StatCard
            label="Turnaround and pickup"
            value={`${onboardingData.values.turnaroundSlaDays} days / ${onboardingData.values.supportsLocalPickup ? "pickup yes" : "pickup no"}`}
            description="Turnaround SLA and local pickup support directly affect how your shop ranks against merchant fulfillment goals."
          />
        </section>
      </div>
    </main>
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
    <Card className="shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
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
        <div className="rounded-md bg-zinc-950 px-5 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
            Capacity used
          </p>
          <p className="text-2xl font-semibold">{capacityUsePercent}%</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <FieldMetric label="Turnaround SLA" value={`${values.turnaroundSlaDays} days`} />
        <FieldMetric label="Daily capacity" value={`${values.dailyCapacityUnits} units`} />
        <FieldMetric label="Current capacity used" value={`${values.currentCapacityUsed} units`} />
        <FieldMetric label="Open capacity" value={`${availableCapacity} units`} />
        <FieldMetric label="Quality score" value={qualityScoreLabel} />
        <FieldMetric
          label="Last saved"
          value={lastSavedAt ? formatDateTime(lastSavedAt) : "Not saved yet"}
        />
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TagGroup
          title="Supported print methods"
          values={values.printMethods.map(getPrintMethodOptionLabel)}
        />
        <TagGroup
          title="Garment compatibility"
          values={values.garmentTypes.map(getGarmentTypeOptionLabel)}
        />
      </div>

      <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Wholesale readiness snapshot
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <FieldMetric label="Seller's permit" value={values.sellersPermitNumber || "Not provided"} />
          <FieldMetric label="EIN / tax ID" value={values.einPlaceholder || "Not provided"} />
          <FieldMetric label="Fulfillment cutoff" value={values.fulfillmentCutoffTime || "Not provided"} />
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

function TagGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value}>{value}</Badge>
        ))}
      </div>
    </div>
  );
}

function IncomingOrders({
  assignments,
  hasProviderProfile,
}: {
  assignments: ProviderAssignment[];
  hasProviderProfile: boolean;
}) {
  if (!hasProviderProfile) {
    return (
      <Card className="shadow-sm">
        <p className="text-sm leading-6 text-zinc-600">
          Save your provider onboarding first. Orders will appear here once your
          profile is live and matched by the routing engine.
        </p>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card className="shadow-sm">
        <p className="text-sm leading-6 text-zinc-600">
          No pending orders right now. New matches will appear here when a
          merchant submits an order that fits your capabilities.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FieldMetric
                label="Garment"
                value={assignment.garmentType.replaceAll("_", " ")}
              />
              <FieldMetric
                label="Quantity"
                value={`${assignment.quantity} units`}
              />
              <FieldMetric
                label="Fulfillment ZIP"
                value={assignment.fulfillmentZip}
              />
              <FieldMetric
                label="Goal"
                value={assignment.fulfillmentGoal.replaceAll("_", " ")}
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <form action={acceptAssignmentAction}>
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-950 px-4 text-sm font-semibold text-white transition hover:bg-indigo-900"
                >
                  Accept
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

const ORDER_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  in_production: "In production",
  ready: "Ready for pickup / ship",
  shipped: "Shipped",
  completed: "Completed",
};

const NEXT_STATUS_LABELS: Record<string, string> = {
  accepted: "Start production",
  in_production: "Mark as ready",
  ready: "Mark as shipped",
  shipped: "Mark as completed",
};

function AcceptedOrders({ assignments }: { assignments: ProviderAssignment[] }) {
  return (
    <div className="grid gap-4">
      {assignments.map((assignment) => {
        const statusLabel = ORDER_STATUS_LABELS[assignment.orderStatus] ?? assignment.orderStatus.replaceAll("_", " ");
        const nextLabel = NEXT_STATUS_LABELS[assignment.orderStatus];

        return (
          <Card key={assignment.id} className="shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FieldMetric
                  label="Garment"
                  value={assignment.garmentType.replaceAll("_", " ")}
                />
                <FieldMetric
                  label="Quantity"
                  value={`${assignment.quantity} units`}
                />
                <FieldMetric
                  label="Fulfillment ZIP"
                  value={assignment.fulfillmentZip}
                />
                <FieldMetric
                  label="Goal"
                  value={assignment.fulfillmentGoal.replaceAll("_", " ")}
                />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge status={assignment.orderStatus} />
                {nextLabel ? (
                  <form action={advanceOrderStatusAction}>
                    <input type="hidden" name="merchantOrderId" value={assignment.merchantOrderId} />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-950 px-4 text-sm font-semibold text-white transition hover:bg-indigo-900"
                    >
                      {nextLabel}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Accepted {assignment.respondedAt ? formatDateTime(assignment.respondedAt) : "—"}
            </p>
          </Card>
        );
      })}
    </div>
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
