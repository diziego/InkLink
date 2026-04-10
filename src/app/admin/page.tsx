import type { Metadata } from "next";
import { saveProviderQualityMetricsAction } from "@/actions/admin-quality-metrics";
import { saveAdminProviderReviewAction } from "@/actions/admin-provider-reviews";
import { requireRole } from "@/lib/auth/helpers";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FieldMetric } from "@/components/ui/field-metric";
import { MockNotice } from "@/components/ui/mock-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getProviderTierOptions,
  getReviewDecisionOptions,
  loadAdminReviewData,
  type AdminProviderReviewItem,
  type AdminReviewData,
} from "@/lib/admin/reviews";
import { formatValue } from "@/lib/format";

export const metadata: Metadata = {
  title: "Admin demo | InkLink",
  description:
    "Review live provider applications, capabilities, wholesale readiness, and admin decisions for InkLink.",
};

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireRole("admin");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminData = await loadAdminReviewData();
  const savedFlag = getStringParam(resolvedSearchParams.saved);
  const sourceFlag = getStringParam(resolvedSearchParams.source);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader />

        <section className="grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Admin verification"
              title="Review provider readiness before routing merchant work."
              description="This admin route now reads live provider application records from Supabase and records review outcomes while merchant routing remains mocked."
            />
            <div className="mt-8">
              <AdminNotice
                adminData={adminData}
                savedFlag={savedFlag}
                sourceFlag={sourceFlag}
              />
            </div>
          </div>

          <AdminSummary adminData={adminData} />
        </section>

        <section className="pb-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Provider review queue
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Providers needing review
              </h2>
            </div>
            <Badge>{adminData.reviewQueueCount} in queue</Badge>
          </div>
          {adminData.queueItems.length > 0 ? (
            <div className="grid gap-5">
              {adminData.queueItems.map((item) => (
                <ProviderReviewCard key={item.providerProfile.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title="No providers waiting on review"
              description="Once providers submit onboarding details through /provider, they will appear here for admin review."
            />
          )}
        </section>

        <section className="pb-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Verified routing pool
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Providers already eligible for stronger routing scores
              </h2>
            </div>
            <Badge>{adminData.verifiedCount} verified</Badge>
          </div>
          {adminData.verifiedItems.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {adminData.verifiedItems.map((item) => (
                <VerifiedProviderCard
                  key={item.providerProfile.id}
                  item={item}
                />
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title="No verified providers yet"
              description="Approved providers will move into this pool after an admin review decision is saved."
            />
          )}
        </section>
      </div>
    </main>
  );
}

function AdminNotice({
  adminData,
  savedFlag,
  sourceFlag,
}: {
  adminData: AdminReviewData;
  savedFlag: string;
  sourceFlag: string;
}) {
  if (savedFlag === "1" && sourceFlag === "supabase") {
    return (
      <MockNotice>
        Review decision saved to Supabase.
      </MockNotice>
    );
  }

  if (savedFlag === "quality-metrics" && sourceFlag === "supabase") {
    return (
      <MockNotice>
        Quality metrics saved to Supabase. Merchant recommendations will pick
        up the new quality and reliability inputs on the next load.
      </MockNotice>
    );
  }

  if (adminData.persistenceMode === "supabase") {
    return (
      <MockNotice>
        Live admin review mode. This page reads provider applications from
        Supabase and writes review decisions. Merchant recommendations remain
        mocked for now.
      </MockNotice>
    );
  }

  return (
    <MockNotice>
      Supabase admin review is not configured locally yet. Add the Supabase
      environment variables to load live provider applications and save review
      outcomes from this route.
    </MockNotice>
  );
}

function AdminSummary({ adminData }: { adminData: AdminReviewData }) {
  return (
    <Card className="border-amber-200 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Marketplace review health
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SummaryMetric
          label="Total providers"
          value={`${adminData.totalProviders}`}
        />
        <SummaryMetric
          label="In review queue"
          value={`${adminData.reviewQueueCount}`}
        />
        <SummaryMetric label="Verified" value={`${adminData.verifiedCount}`} />
        <SummaryMetric
          label="Open capacity"
          value={`${adminData.openCapacityUnits} units`}
        />
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-600">
        This page now reviews live provider application data. Approved reviews
        update provider verification status and tier so the verified pool stays
        in sync with admin decisions.
      </p>
    </Card>
  );
}

function ProviderReviewCard({ item }: { item: AdminProviderReviewItem }) {
  const { providerProfile, capability, wholesaleReadiness, qualityMetrics, latestReview } =
    item;
  const openCapacity =
    providerProfile.daily_capacity_units - providerProfile.current_capacity_used;

  return (
    <Card className="shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Review item
          </p>
          <h3 className="mt-2 text-2xl font-semibold">
            {providerProfile.business_name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {providerProfile.contact_name} - {providerProfile.city},{" "}
            {providerProfile.state} {providerProfile.zip}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{formatValue(providerProfile.verification_status)}</Badge>
            <Badge>{`${formatValue(providerProfile.tier)} tier`}</Badge>
            <Badge>
              {providerProfile.supports_local_pickup
                ? "Local pickup"
                : "No pickup"}
            </Badge>
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-700">
            Admin review controls whether this provider stays in queue, moves
            into the verified pool, or is rejected. Current open capacity is{" "}
            {openCapacity} units.
          </p>
          <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Wholesale readiness review
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <FieldMetric
                label="Legal name"
                value={
                  wholesaleReadiness?.legal_business_name ?? "Not submitted"
                }
              />
              <FieldMetric
                label="DBA / shop name"
                value={
                  wholesaleReadiness?.dba_name ?? providerProfile.business_name
                }
              />
              <FieldMetric
                label="Business email"
                value={wholesaleReadiness?.business_email ?? "Not submitted"}
              />
              <FieldMetric
                label="Phone"
                value={wholesaleReadiness?.phone ?? "Not submitted"}
              />
              <FieldMetric
                label="Seller's permit"
                value={
                  wholesaleReadiness?.sellers_permit_number ?? "Not submitted"
                }
              />
              <FieldMetric
                label="EIN / tax ID"
                value={wholesaleReadiness?.ein_placeholder ?? "Not submitted"}
              />
              <FieldMetric
                label="Business type"
                value={wholesaleReadiness?.business_type ?? "Not submitted"}
              />
              <FieldMetric
                label="Years in operation"
                value={
                  wholesaleReadiness?.years_in_operation
                    ? `${wholesaleReadiness.years_in_operation} years`
                    : "Not submitted"
                }
              />
              <FieldMetric
                label="Fulfillment cutoff"
                value={
                  wholesaleReadiness?.fulfillment_cutoff_time ??
                  "Not submitted"
                }
              />
              <FieldMetric
                label="Reorder lead time"
                value={
                  wholesaleReadiness?.reorder_lead_time_days
                    ? `${wholesaleReadiness.reorder_lead_time_days} days`
                    : "Not submitted"
                }
              />
            </dl>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Supplier accounts
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(wholesaleReadiness?.supplier_account_readiness ?? []).map(
                  (account) => (
                  <Badge key={account}>{account}</Badge>
                  ),
                )}
                {(wholesaleReadiness?.supplier_account_readiness ?? []).length ===
                0 ? (
                  <span className="text-sm text-zinc-500">Not submitted</span>
                ) : null}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Preferred blank distributors
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(wholesaleReadiness?.preferred_blank_distributors ?? []).map(
                  (distributor) => (
                  <Badge key={distributor}>{distributor}</Badge>
                  ),
                )}
                {(wholesaleReadiness?.preferred_blank_distributors ?? [])
                  .length === 0 ? (
                  <span className="text-sm text-zinc-500">Not submitted</span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-700">
                {wholesaleReadiness?.blank_sourcing_notes ?? "No sourcing notes submitted yet."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Review signals
          </h4>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <FieldMetric
              label="Print methods"
              value={
                capability?.print_methods.map(formatValue).join(", ") ??
                "Not submitted"
              }
            />
            <FieldMetric
              label="Garments"
              value={
                capability?.garment_types.map(formatValue).join(", ") ??
                "Not submitted"
              }
            />
            <FieldMetric
              label="Turnaround"
              value={`${providerProfile.turnaround_sla_days} days`}
            />
            <FieldMetric
              label="Capacity"
              value={`${providerProfile.current_capacity_used}/${providerProfile.daily_capacity_units} used`}
            />
            <FieldMetric
              label="Quality"
              value={`${qualityMetrics?.quality_score ?? 0}/100`}
            />
            <FieldMetric
              label="On-time"
              value={`${Math.round(Number(qualityMetrics?.on_time_delivery_rate ?? 0) * 100)}%`}
            />
          </dl>
          <div className="mt-4 rounded-md border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Latest review
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              {latestReview
                ? `${formatValue(latestReview.decision)} on ${formatDateTime(latestReview.created_at)}`
                : "No review saved yet."}
            </p>
            {latestReview?.review_notes ? (
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {latestReview.review_notes}
              </p>
            ) : null}
          </div>
          <AdminReviewForm item={item} />
          <QualityMetricsSeedForm item={item} />
        </div>
      </div>
    </Card>
  );
}

function AdminReviewForm({ item }: { item: AdminProviderReviewItem }) {
  const { providerProfile, latestReview } = item;

  return (
    <form action={saveAdminProviderReviewAction} className="mt-4 grid gap-3">
      <input
        type="hidden"
        name="providerProfileId"
        value={providerProfile.id}
      />
      <label className="text-sm font-medium text-zinc-700">
        Decision
        <select
          name="decision"
          defaultValue={latestReview?.decision ?? "pending"}
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
        >
          {getReviewDecisionOptions().map((decision) => (
            <option key={decision} value={decision}>
              {formatValue(decision)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-zinc-700">
        Tier after review
        <select
          name="tierAfterReview"
          defaultValue={latestReview?.tier_after_review ?? providerProfile.tier}
          className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
        >
          {getProviderTierOptions().map((tier) => (
            <option key={tier} value={tier}>
              {formatValue(tier)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-zinc-700">
        Review notes
        <textarea
          name="reviewNotes"
          defaultValue={latestReview?.review_notes ?? ""}
          className="mt-2 min-h-24 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
          placeholder="Capture why this provider should stay pending, move into the verified pool, or be rejected."
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        Save review
      </button>
    </form>
  );
}

function VerifiedProviderCard({ item }: { item: AdminProviderReviewItem }) {
  const { providerProfile, qualityMetrics, latestReview } = item;
  const openCapacity =
    providerProfile.daily_capacity_units - providerProfile.current_capacity_used;

  return (
    <Card className="shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {formatValue(providerProfile.tier)} tier
      </p>
      <h3 className="mt-2 text-xl font-semibold">
        {providerProfile.business_name}
      </h3>
      <p className="mt-2 text-sm text-zinc-600">
        {providerProfile.city}, {providerProfile.state} {providerProfile.zip}
      </p>
      <dl className="mt-5 grid gap-3">
        <FieldMetric
          label="Verification"
          value={formatValue(providerProfile.verification_status)}
        />
        <FieldMetric label="Open capacity" value={`${openCapacity} units`} />
        <FieldMetric
          label="SLA"
          value={`${providerProfile.turnaround_sla_days} days`}
        />
        <FieldMetric
          label="Quality"
          value={`${qualityMetrics?.quality_score ?? 0}/100`}
        />
      </dl>
      <p className="mt-4 text-sm leading-6 text-zinc-600">
        {latestReview
          ? `Last review: ${formatValue(latestReview.decision)} on ${formatDateTime(latestReview.created_at)}`
          : "No review history yet."}
      </p>
      <div className="mt-4 border-t border-zinc-200 pt-4">
        <QualityMetricsSeedForm item={item} compact />
      </div>
    </Card>
  );
}

function QualityMetricsSeedForm({
  item,
  compact = false,
}: {
  item: AdminProviderReviewItem;
  compact?: boolean;
}) {
  const { providerProfile, qualityMetrics } = item;

  return (
    <form
      action={saveProviderQualityMetricsAction}
      className={`grid gap-3 ${compact ? "mt-0" : "mt-4"}`}
    >
      <input type="hidden" name="providerProfileId" value={providerProfile.id} />
      <div className="rounded-md border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Quality metrics seed
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <MetricField
            label="Quality score"
            name="qualityScore"
            defaultValue={`${Number(qualityMetrics?.quality_score ?? 0)}`}
          />
          <MetricField
            label="Reliability score"
            name="reliabilityScore"
            defaultValue={`${Number(qualityMetrics?.reliability_score ?? 0)}`}
          />
          <MetricField
            label="On-time %"
            name="onTimeDeliveryRatePercent"
            defaultValue={`${Math.round(Number(qualityMetrics?.on_time_delivery_rate ?? 0) * 100)}`}
          />
          <MetricField
            label="Reprint %"
            name="reprintRatePercent"
            defaultValue={`${(Number(qualityMetrics?.reprint_rate ?? 0) * 100).toFixed(1)}`}
          />
          <MetricField
            label="Average rating"
            name="averageRating"
            defaultValue={`${Number(qualityMetrics?.average_rating ?? 0)}`}
          />
          <MetricField
            label="Completed orders"
            name="completedOrders"
            defaultValue={`${qualityMetrics?.completed_orders ?? 0}`}
          />
        </div>
        <button
          type="submit"
          className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Save quality metrics
        </button>
      </div>
    </form>
  );
}

function MetricField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="text-sm font-medium text-zinc-700">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
      />
    </label>
  );
}

function EmptyStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed border-zinc-300 bg-white/70 text-center shadow-sm">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
    </Card>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-zinc-950">{value}</dd>
    </div>
  );
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
