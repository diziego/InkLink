import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BRAND } from "@/config/brand";
import { getCurrentUser, getRoleDashboard } from "@/lib/auth/helpers";
import { sendMagicLinkAction, signInWithPasswordAction } from "@/actions/auth";

export const metadata: Metadata = {
  title: `Sign in | ${BRAND.name}`,
  description: "Sign in to PrintPair with your email.",
};

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
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

  const mode = params.mode === "password" ? "password" : "magic";
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
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Sign in to your {BRAND.name} account
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex rounded-lg border border-zinc-200 bg-zinc-100 p-1">
                <Link
                  href="/login"
                  className={`flex-1 rounded-md py-2 text-center text-sm font-medium transition ${
                    mode === "magic"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  Magic link
                </Link>
                <Link
                  href="/login?mode=password"
                  className={`flex-1 rounded-md py-2 text-center text-sm font-medium transition ${
                    mode === "password"
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  Password
                </Link>
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {mode === "magic" && (
                <>
                  <p className="mt-4 text-sm text-zinc-500">
                    Enter your email and we&rsquo;ll send you a magic link — no
                    password needed.
                  </p>

                  {sent ? (
                    <>
                      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <strong>Check your email!</strong> We sent a sign-in
                        link. Click it to continue.
                      </div>
                      <p className="mt-4 text-sm text-zinc-500">
                        Didn&rsquo;t get it?{" "}
                        <Link
                          href="/login"
                          className="font-medium text-zinc-950 underline underline-offset-4 transition hover:text-zinc-700"
                        >
                          Try again
                        </Link>
                      </p>
                    </>
                  ) : (
                    <form action={sendMagicLinkAction} className="mt-5">
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
                        className="mt-4 h-11 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
                      >
                        Send magic link
                      </button>
                    </form>
                  )}
                </>
              )}

              {mode === "password" && (
                <form action={signInWithPasswordAction} className="mt-5 grid gap-4">
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
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-normal outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
                    />
                  </label>
                  <button
                    type="submit"
                    className="h-11 w-full rounded-md bg-zinc-950 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700"
                  >
                    Sign in
                  </button>
                  <p className="text-center text-sm text-zinc-500">
                    Don&rsquo;t have an account?{" "}
                    <Link
                      href="/signup"
                      className="font-medium text-zinc-950 underline underline-offset-4 transition hover:text-zinc-700"
                    >
                      Create one
                    </Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
