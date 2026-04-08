import Link from "next/link";
import { BRAND } from "@/config/brand";

export default function MerchantPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-white sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            {BRAND.logoText}
          </Link>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Back to home
          </Link>
        </header>

        <section className="flex flex-1 items-center py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
              Merchant workspace
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
              Create orders and compare local print providers.
            </h1>
            <p className="mt-5 text-lg leading-8 text-zinc-300">
              This placeholder will become the merchant onboarding and order
              creation flow for DTG-first fulfillment.
            </p>
            <div className="mt-8 rounded-md border border-white/15 bg-white/5 p-5 text-sm leading-7 text-zinc-300">
              Planned next: business profile, fulfillment ZIP, blank
              preferences, order intake, and provider recommendations.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
