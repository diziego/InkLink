import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/helpers";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FieldMetric } from "@/components/ui/field-metric";
import { MockNotice } from "@/components/ui/mock-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { saveProviderInventoryAction } from "@/actions/provider-inventory";
import { saveProviderOnboardingAction } from "@/actions/provider-onboarding";
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

export const metadata: Metadata = {
  title: "Provider demo | InkLink",
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
              title="List shop capabilities before receiving matched DTG work."
              description="This route is the first Supabase-backed vertical slice in InkLink. It can now save provider onboarding, capabilities, and wholesale-readiness fields while the rest of the app continues to use mocked data."
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

        <section className="pb-8">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Provider application
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              Development onboarding form
            </h2>
          </div>
          <ProviderOnboardingForm
            values={onboardingData.values}
          />
        </section>

        <section className="pb-8">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Merchant-facing blanks
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              Inventory seed rows
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              Keep this small for now. These rows feed brand/style matching on
              `/merchant` for the current development provider.
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
            label="Persistence"
            value={
              onboardingData.persistenceMode === "supabase"
                ? onboardingData.hasPersistedRecord
                  ? "Live record"
                  : "Ready to save"
                : "Mock only"
            }
            description="Provider onboarding now persists to Supabase when environment variables are configured."
          />
          <StatCard
            label="Capacity"
            value={`${availableCapacity} units open`}
            description="This still matches the routing engine inputs, even though /merchant and /admin remain mocked for now."
          />
          <StatCard
            label="Turnaround and pickup"
            value={`${onboardingData.values.turnaroundSlaDays} days / ${onboardingData.values.supportsLocalPickup ? "pickup yes" : "pickup no"}`}
            description="Saved values here are intended to become the real source for provider review and future routing migration."
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
        Live provider mode. This page loads and saves your provider profile from
        Supabase. Merchant recommendations use your live verified data.
      </MockNotice>
    );
  }

  return (
    <MockNotice>
      Supabase environment variables are not configured. This page is showing
      local demo data only.
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
          Inventory rows saved. Merchant recommendations will use these live
          blanks the next time `/merchant` loads verified providers.
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
          className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Save inventory rows
        </button>
        <p className="text-sm text-zinc-600">
          Development-only seed data for merchant blank brand/style matching.
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
          className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Save provider onboarding
        </button>
        <p className="text-sm text-zinc-600">
          Temporary development persistence only. Real provider ownership will
          replace this fallback after auth is added.
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
