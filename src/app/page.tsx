import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/config/brand";

const howItWorksSteps = [
  {
    step: "01",
    title: "Post an order",
    body: "Submit your garment type, quantity, blank preferences, and fulfillment goal. InkLink builds a structured order in seconds.",
  },
  {
    step: "02",
    title: "Get matched",
    body: "The routing engine scores every verified provider against your order — by capability, location, quality, capacity, and turnaround.",
  },
  {
    step: "03",
    title: "Track fulfillment",
    body: "Your matched provider accepts the job and advances it through production stages. You see status updates the whole way through.",
  },
];

const merchantBenefits = [
  "Route orders to providers near your customers.",
  "Support premium blanks without burying the sourcing details.",
  "Compare quality, turnaround, capacity, and local pickup signals.",
];

const providerBenefits = [
  "Receive work that fits your print methods and shop capacity.",
  "Show merchants where your quality, speed, and specialties stand out.",
  "Build a local fulfillment reputation beyond commodity print-on-demand.",
];

const proofPoints = [
  { label: "Routing", value: "Transparent" },
  { label: "Print method", value: "DTG first" },
  { label: "Market", value: "Southern California" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <section className="relative isolate flex min-h-[680px] items-center overflow-hidden px-6 py-8 sm:px-10 lg:px-16">
        {/* Background layers */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(9,9,11,0.72),rgba(9,9,11,0.95)),url('/window.svg')] bg-[length:1040px_auto] bg-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-red-950/20 via-transparent to-transparent" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
          <AppHeader theme="dark" />

          <div className="max-w-3xl py-10">
            <p className="mb-5 inline-flex rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-medium uppercase tracking-[0.2em] text-red-400">
              DTG first. Local by default.
            </p>
            <h1 className="text-5xl font-bold text-white sm:text-6xl lg:text-7xl">
              {BRAND.tagline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              {BRAND.description}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Get started free
              </Link>
              <Link
                href="/merchant"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/25 px-6 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
            <dl className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              {proofPoints.map((point) => (
                <div
                  key={point.label}
                  className="rounded-md border border-white/10 bg-white/5 p-4"
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    {point.label}
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-white">
                    {point.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white px-6 py-20 text-zinc-950 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              A clearer path from order intake to local production.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {howItWorksSteps.map((step) => (
              <div
                key={step.step}
                className="rounded-xl border border-zinc-100 bg-zinc-50 p-7 shadow-sm"
              >
                <p className="text-4xl font-bold text-zinc-950/10">
                  {step.step}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-zinc-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For merchants + providers */}
      <section className="bg-zinc-50 px-6 py-20 text-zinc-950 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <BenefitPanel
            eyebrow="For merchants"
            title="Fulfillment decisions with the scoring out in the open."
            benefits={merchantBenefits}
            href="/merchant"
            cta="Open merchant workspace"
          />
          <BenefitPanel
            eyebrow="For providers"
            title="Local demand that fits your equipment and standards."
            benefits={providerBenefits}
            href="/provider"
            cta="Join as a provider"
          />
        </div>
      </section>

      {/* Positioning */}
      <section className="bg-white px-6 py-20 text-zinc-950 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 p-8 text-white sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Local-first positioning
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Premium blanks, vetted print partners, and fulfillment choices
              that favor nearby production when it makes sense.
            </h2>
            <div>
              <p className="text-base leading-7 text-zinc-300">
                InkLink starts with DTG and is designed to expand into DTF,
                screen print, embroidery, heat transfer, local courier options,
                and split routing. The platform is built to grow alongside your
                fulfillment needs.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-10 text-sm text-zinc-400 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-bold text-white">{BRAND.logoText}</p>
              <p className="mt-1 max-w-xs text-sm text-zinc-400">
                {BRAND.footerCopy}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <Link href="/merchant" className="transition hover:text-white">
                Merchant
              </Link>
              <Link href="/provider" className="transition hover:text-white">
                Provider
              </Link>
              <Link href="/admin" className="transition hover:text-white">
                Admin
              </Link>
              <Link href="/login" className="transition hover:text-white">
                Sign in
              </Link>
            </div>
          </div>
          <div className="mt-8 border-t border-zinc-800 pt-6 text-xs text-zinc-600">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}

function BenefitPanel({
  eyebrow,
  title,
  benefits,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  benefits: string[];
  href: string;
  cta: string;
}) {
  return (
    <Card className="p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-bold">{title}</h2>
      <ul className="mt-6 space-y-3 text-sm leading-7 text-zinc-600">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex gap-3">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-red-600" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        {cta}
      </Link>
    </Card>
  );
}
