import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FieldMetric } from "@/components/ui/field-metric";
import { MockNotice } from "@/components/ui/mock-notice";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  mockProviderCapabilities,
  mockProviderQualityMetrics,
  mockProviders,
} from "@/lib/mock-data";
import { formatValue } from "@/lib/format";
import type { ProviderProfile } from "@/types";

const pendingProviders = mockProviders.filter(
  (provider) => provider.verificationStatus === "pending",
);
const verifiedProviders = mockProviders.filter(
  (provider) => provider.verificationStatus === "verified",
);

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader />

        <section className="grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Admin verification"
              title="Review provider readiness before routing merchant work."
              description="This mocked admin screen shows how verification, tier, quality, SLA, and capacity are reviewed before they influence merchant recommendations."
            />
            <div className="mt-8">
              <MockNotice>
              Mocked MVP flow: review actions are display-only. No provider
              status, tier, or capacity changes are saved until Supabase and
              admin actions are added.
              </MockNotice>
            </div>
          </div>

          <AdminSummary />
        </section>

        <section className="pb-16">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Provider review queue
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Pending verification
              </h2>
            </div>
            <Badge>{pendingProviders.length} pending</Badge>
          </div>
          <div className="grid gap-5">
            {pendingProviders.map((provider) => (
              <ProviderReviewCard key={provider.id} provider={provider} />
            ))}
          </div>
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
            <Badge>{verifiedProviders.length} verified</Badge>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {verifiedProviders.map((provider) => (
              <VerifiedProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminSummary() {
  const totalDailyCapacity = mockProviders.reduce(
    (total, provider) => total + provider.dailyCapacityUnits,
    0,
  );
  const usedDailyCapacity = mockProviders.reduce(
    (total, provider) => total + provider.currentCapacityUsed,
    0,
  );

  return (
    <Card className="border-amber-200 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Mock marketplace health
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SummaryMetric label="Total providers" value={`${mockProviders.length}`} />
        <SummaryMetric label="Pending review" value={`${pendingProviders.length}`} />
        <SummaryMetric label="Verified" value={`${verifiedProviders.length}`} />
        <SummaryMetric
          label="Open capacity"
          value={`${totalDailyCapacity - usedDailyCapacity} units`}
        />
      </div>
      <p className="mt-5 text-sm leading-6 text-zinc-600">
        The routing engine rewards verified status and stronger tiers, then
        checks whether open capacity can fit the merchant order quantity.
      </p>
    </Card>
  );
}

function ProviderReviewCard({ provider }: { provider: ProviderProfile }) {
  const capability = mockProviderCapabilities.find(
    (candidate) => candidate.providerId === provider.id,
  );
  const metrics = mockProviderQualityMetrics.find(
    (candidate) => candidate.providerId === provider.id,
  );
  const openCapacity = provider.dailyCapacityUnits - provider.currentCapacityUsed;

  return (
    <Card className="shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Mock review item
          </p>
          <h3 className="mt-2 text-2xl font-semibold">{provider.businessName}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {provider.contactName} - {provider.city}, {provider.state}{" "}
            {provider.zip}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{formatValue(provider.verificationStatus)}</Badge>
            <Badge>{`${formatValue(provider.tier)} tier`}</Badge>
            <Badge>
              {provider.supportsLocalPickup ? "Local pickup" : "No pickup"}
            </Badge>
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-700">
            Admin decision preview: moving this provider from pending to
            verified and assigning a stronger tier would improve its
            verification/tier score. Capacity remains constrained by{" "}
            {openCapacity} currently open units.
          </p>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Review signals
          </h4>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <FieldMetric label="Print methods" value={capability?.printMethods.map(formatValue).join(", ") ?? "None"} />
            <FieldMetric label="Garments" value={capability?.garmentTypes.map(formatValue).join(", ") ?? "None"} />
            <FieldMetric label="Turnaround" value={`${provider.turnaroundSlaDays} days`} />
            <FieldMetric label="Capacity" value={`${provider.currentCapacityUsed}/${provider.dailyCapacityUnits} used`} />
            <FieldMetric label="Quality" value={`${metrics?.qualityScore ?? 0}/100`} />
            <FieldMetric
              label="On-time"
              value={`${Math.round((metrics?.onTimeDeliveryRate ?? 0) * 100)}%`}
            />
          </dl>
        </div>
      </div>
    </Card>
  );
}

function VerifiedProviderCard({ provider }: { provider: ProviderProfile }) {
  const metrics = mockProviderQualityMetrics.find(
    (candidate) => candidate.providerId === provider.id,
  );
  const openCapacity = provider.dailyCapacityUnits - provider.currentCapacityUsed;

  return (
    <Card className="shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {formatValue(provider.tier)} tier
      </p>
      <h3 className="mt-2 text-xl font-semibold">{provider.businessName}</h3>
      <p className="mt-2 text-sm text-zinc-600">
        {provider.city}, {provider.state} {provider.zip}
      </p>
      <dl className="mt-5 grid gap-3">
        <FieldMetric label="Verification" value={formatValue(provider.verificationStatus)} />
        <FieldMetric label="Open capacity" value={`${openCapacity} units`} />
        <FieldMetric label="SLA" value={`${provider.turnaroundSlaDays} days`} />
        <FieldMetric label="Quality" value={`${metrics?.qualityScore ?? 0}/100`} />
      </dl>
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
