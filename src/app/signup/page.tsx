import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BRAND } from "@/config/brand";
import { getCurrentUser, getRoleDashboard } from "@/lib/auth/helpers";
import { signUpWithPasswordAction } from "@/actions/auth";

export const metadata: Metadata = {
  title: `Create account | ${BRAND.name}`,
  description: "Create a PrintPair account.",
};

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = searchParams ? await searchParams : {};

  const user = await getCurrentUser();
  if (user?.role) {
    redirect(getRoleDashboard(user.role));
  }
  if (user?.needsPasswordSetup) {
    redirect("/set-password");
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

        <div className="flex min-h-[70vh] items-center justify-center py-14">
          <div className="w-full max-w-md">
            {/* Brand mark */}
            <div className="mb-8 text-center">
              <span className="inline-flex rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold tracking-wide text-white">
                {BRAND.logoText}
              </span>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-950">
                Create your account
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Already have one?{" "}
                <Link
                  href="/login?mode=password"
                  className="font-medium text-zinc-950 underline underline-offset-4 transition hover:text-zinc-700"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {sent ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <strong>Check your email!</strong> We sent a confirmation link.
                  Click it to activate your account and choose your role.
                </div>
              ) : (
                <form action={signUpWithPasswordAction} className="grid gap-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-zinc-700"
                  >
                    Email address
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-normal outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                    />
                  </label>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-zinc-700"
                  >
                    Password
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="8+ characters"
                      className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-normal outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                    />
                  </label>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-zinc-700"
                  >
                    Confirm password
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-normal outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-1 h-11 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
                  >
                    Create account
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
