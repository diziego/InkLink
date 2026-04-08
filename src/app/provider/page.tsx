import Link from "next/link";
import { BRAND } from "@/config/brand";
import {
  mockBlankInventory,
  mockProviderCapabilities,
  mockProviderQualityMetrics,
  mockProviders,
} from "@/lib/mock-data";

const featuredProvider = mockProviders[0];
const featuredCapability = mockProviderCapabilities.find(
  (capability) => capability.providerId === featuredProvider.id,
);
const featuredQuality = mockProviderQualityMetrics.find(
  (metrics) => metrics.providerId === featuredProvider.id,
);
const featuredInventory = mockBlankInventory.filter(
  (blank) => blank.providerId === featuredProvider.id,
);
const availableCapacity =
  featuredProvider.dailyCapacityUnits - featuredProvider.currentCapacityUsed;
const capacityUsePercent = Math.round(
  (featuredProvider.currentCapacityUsed / featuredProvider.dailyCapacityUnits) *
    100,
);

export default function ProviderPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            {BRAND.logoText}
          </Link>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-950">
            Back to home
          </Link>
        </header>

        <section className="grid gap-8 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Provider onboarding
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
              List shop capabilities before receiving matched DTG work.
            </h1>
            <p className="mt-5 text-lg leading-8 text-zinc-700">
              This is a mocked provider profile screen using static marketplace
              data. These fields are the same signals the routing engine reads
              when recommending providers to merchants.
            </p>
            <div className="mt-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Mocked MVP flow: no provider profile is saved yet. Supabase auth,
              profile editing, document upload, and admin submission will be
              wired later.
            </div>
          </div>

          <ProfilePanel />
        </section>

        <section className="grid gap-5 pb-16 lg:grid-cols-3">
          <RoutingSignalCard
            title="Verification and tier"
            value={`${formatValue(featuredProvider.verificationStatus)} / ${formatValue(featuredProvider.tier)}`}
            description="Verified and preferred providers receive stronger routing scores than pending emerging providers."
          />
          <RoutingSignalCard
            title="Capacity"
            value={`${availableCapacity} units open`}
            description="The routing engine compares requested order quantity against daily capacity minus current usage."
          />
          <RoutingSignalCard
            title="Turnaround and pickup"
            value={`${featuredProvider.turnaroundSlaDays} days / ${featuredProvider.supportsLocalPickup ? "pickup yes" : "pickup no"}`}
            description="Shorter SLA and local pickup support can improve recommendations when the merchant goal matches."
          />
        </section>
      </div>
    </main>
  );
}

function ProfilePanel() {
  return (
    <article className="rounded-md border border-zinc-200 bg-zinc-50 p-5">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Mock provider profile
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {featuredProvider.businessName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {featuredProvider.contactName} - {featuredProvider.city},{" "}
            {featuredProvider.state} {featuredProvider.zip}
          </p>
        </div>
        <div className="rounded-md bg-zinc-950 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
            Capacity used
          </p>
          <p className="text-2xl font-semibold">{capacityUsePercent}%</p>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <ProfileField label="Verification" value={formatValue(featuredProvider.verificationStatus)} />
        <ProfileField label="Provider tier" value={formatValue(featuredProvider.tier)} />
        <ProfileField label="Turnaround SLA" value={`${featuredProvider.turnaroundSlaDays} days`} />
        <ProfileField label="Daily capacity" value={`${featuredProvider.dailyCapacityUnits} units`} />
        <ProfileField label="Current capacity used" value={`${featuredProvider.currentCapacityUsed} units`} />
        <ProfileField label="Local pickup" value={featuredProvider.supportsLocalPickup ? "Supported" : "Not supported"} />
      </dl>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TagGroup
          title="Supported print methods"
          values={featuredCapability?.printMethods.map(formatValue) ?? []}
        />
        <TagGroup
          title="Garment compatibility"
          values={featuredCapability?.garmentTypes.map(formatValue) ?? []}
        />
      </div>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Quality and inventory snapshot
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <ProfileField
            label="Quality score"
            value={`${featuredQuality?.qualityScore ?? 0}/100`}
          />
          <ProfileField
            label="On-time delivery"
            value={`${Math.round((featuredQuality?.onTimeDeliveryRate ?? 0) * 100)}%`}
          />
          <ProfileField
            label="Premium blanks"
            value={`${featuredInventory.filter((blank) => blank.isPremiumBlank).length} styles`}
          />
        </div>
      </div>
    </article>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-zinc-950">{value}</dd>
    </div>
  );
}

function TagGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function RoutingSignalCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-md border border-zinc-200 bg-zinc-50 p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {title}
      </p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
    </article>
  );
}

function formatValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
