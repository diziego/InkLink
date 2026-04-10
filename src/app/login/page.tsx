import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BRAND } from "@/config/brand";
import { getCurrentUser, getRoleDashboard } from "@/lib/auth/helpers";
import { sendMagicLinkAction } from "@/actions/auth";

export const metadata: Metadata = {
  title: `Sign in | ${BRAND.name}`,
  description: "Sign in to InkLink with your email.",
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};

  // If already signed in, redirect to dashboard
  const user = await getCurrentUser();
  if (user?.role) {
    redirect(getRoleDashboard(user.role));
  }
  if (user && !user.role) {
    redirect("/choose-role");
  }

  const sent = params.sent === "1";
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader />

        <div className="flex min-h-[60vh] items-center justify-center py-14">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to {BRAND.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Enter your email and we&rsquo;ll send you a magic link to sign in
              — no password needed.
            </p>

            {sent && (
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <strong>Check your email!</strong> We sent a sign-in link. Click
                it to continue.
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {!sent && (
              <form action={sendMagicLinkAction} className="mt-8">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                />
                <button
                  type="submit"
                  className="mt-4 h-11 w-full rounded-md bg-zinc-950 text-sm font-medium text-white transition hover:bg-zinc-800 active:bg-zinc-700"
                >
                  Send magic link
                </button>
              </form>
            )}

            {sent && (
              <form action={sendMagicLinkAction} className="mt-4">
                <input
                  name="email"
                  type="hidden"
                  value=""
                />
                <p className="text-sm text-zinc-500">
                  Didn&rsquo;t get it?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-zinc-950 underline underline-offset-4 transition hover:text-zinc-700"
                  >
                    Try again
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
