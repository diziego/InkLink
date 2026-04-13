import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BRAND } from "@/config/brand";
import { getCurrentUser, getRoleDashboard } from "@/lib/auth/helpers";
import { setPasswordAction } from "@/actions/auth";

export const metadata: Metadata = {
  title: `Set your password | ${BRAND.name}`,
  description: "Create a password for your PrintPair account.",
};

type SetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SetPasswordPage({
  searchParams,
}: SetPasswordPageProps) {
  const params = searchParams ? await searchParams : {};
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : null;

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // If they already completed password setup, send them onward.
  if (!user.needsPasswordSetup) {
    if (user.role) {
      redirect(getRoleDashboard(user.role));
    }
    redirect("/choose-role");
  }

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
                Create your password
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                You signed in with a magic link. Set a password so you can sign
                in with email and password next time.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <form action={setPasswordAction} className="grid gap-4">
                {next && (
                  <input type="hidden" name="next" value={next} />
                )}
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-zinc-700"
                >
                  New password
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
                  Set password and continue
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-zinc-400">
              Signed in as {user.email}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
