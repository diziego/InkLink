import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { BRAND } from "@/config/brand";

const howItWorks = [
  "Merchants submit print-ready DTG orders with blank preferences and fulfillment goals.",
  "InkLink compares vetted local providers using transparent marketplace criteria.",
  "The best-fit provider handles production while the order stays easy to track.",
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
      <section className="relative isolate flex min-h-[640px] items-center overflow-hidden px-6 py-8 sm:px-10 lg:px-16">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(9,9,11,0.68),rgba(9,9,11,0.92)),url('/window.svg')] bg-[length:1040px_auto] bg-center opacity-90" />
        <div className="absolute inset-0 -z-10 bg-zinc-950/70" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
          <AppHeader theme="dark" />

          <div className="max-w-3xl py-10">
            <p className="mb-5 inline-flex rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium uppercase tracking-[0.2em] text-zinc-200">
              DTG first. Local by default.
            </p>
            <h1 className="text-5xl font-semibold text-white sm:text-6xl">
              {BRAND.tagline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-200">
              {BRAND.description} Built for premium blank-friendly workflows,
              local routing, and transparent provider scoring.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                Get started
              </Link>
              <Link
                href="/merchant"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
            <dl className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              {proofPoints.map((point) => (
                <div
                  key={point.label}
                  className="rounded-md border border-white/15 bg-white/10 p-4"
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

      <section className="bg-white px-6 py-20 text-zinc-950 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionHeading
            eyebrow="How it works"
            title="A clearer path from order intake to local production."
            level="h2"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {howItWorks.map((step, index) => (
              <Card key={step} tone="subtle" className="shadow-sm">
                <p className="text-sm font-semibold text-zinc-500">
                  0{index + 1}
                </p>
                <p className="mt-4 text-base leading-7 text-zinc-700">{step}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 px-6 py-20 text-zinc-950 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
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
            cta="Open provider workspace"
          />
        </div>
      </section>

      <section className="bg-white px-6 py-20 text-zinc-950 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-6xl rounded-md border border-zinc-200 bg-zinc-950 p-8 text-white sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-400">
            Local-first positioning
          </p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <h2 className="text-3xl font-semibold">
              Premium blanks, vetted print partners, and fulfillment choices
              that favor nearby production when it makes sense.
            </h2>
            <p className="text-base leading-7 text-zinc-300">
              InkLink starts with DTG and is designed to expand into DTF,
              screen print, embroidery, heat transfer, local courier options,
              and split routing. The platform is built to grow alongside your
              fulfillment needs.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 bg-zinc-950 px-6 py-8 text-sm text-zinc-400 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-white">{BRAND.logoText}</span>{" "}
            {BRAND.footerCopy}
          </p>
          <div className="flex gap-5">
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
    <Card className="p-7 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
      <ul className="mt-6 space-y-3 text-base leading-7 text-zinc-700">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex gap-3">
            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-sm bg-zinc-950" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="mt-7 inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
      >
        {cta}
      </Link>
    </Card>
  );
}
