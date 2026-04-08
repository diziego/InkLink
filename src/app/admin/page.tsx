import Link from "next/link";
import { BRAND } from "@/config/brand";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            {BRAND.logoText}
          </Link>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-950">
            Back to home
          </Link>
        </header>

        <section className="flex flex-1 items-center py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Admin workspace
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
              Review providers before they enter the marketplace.
            </h1>
            <p className="mt-5 text-lg leading-8 text-zinc-700">
              This placeholder will become the admin verification and quality
              review surface for keeping the marketplace credible.
            </p>
            <div className="mt-8 rounded-md border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-700">
              Planned next: provider review queue, verification status, tier
              assignment, and quality metric oversight.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
