import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BRAND } from "@/config/brand";
import { getCurrentUser, getRoleDashboard } from "@/lib/auth/helpers";
import { chooseRoleAction } from "@/actions/auth";

export const metadata: Metadata = {
  title: `Choose your role | ${BRAND.name}`,
  description: "Tell us how you'll use PrintPair.",
};

export default async function ChooseRolePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Password setup must come before role selection
  if (user.needsPasswordSetup) {
    redirect("/set-password");
  }

  // If they already have a role, skip to dashboard
  if (user.role) {
    redirect(getRoleDashboard(user.role));
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <AppHeader />

        <div className="flex min-h-[70vh] items-center justify-center py-14">
          <div className="w-full max-w-xl text-center">
            <span className="inline-flex rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold tracking-wide text-white">
              {BRAND.logoText}
            </span>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">
              Welcome to {BRAND.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              How will you use PrintPair? You can only choose once.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {/* Provider card */}
              <form action={chooseRoleAction}>
                <input type="hidden" name="role" value="provider" />
                <button
                  type="submit"
                  className="group w-full rounded-xl border border-zinc-200 bg-white p-7 text-left shadow-sm transition hover:border-red-200 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-lg transition group-hover:bg-zinc-950 group-hover:text-white">
                    🖨
                  </div>
                  <h2 className="text-base font-semibold">Print Provider</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    I run a print shop and want to receive orders from local
                    brands.
                  </p>
                </button>
              </form>

              {/* Merchant card */}
              <form action={chooseRoleAction}>
                <input type="hidden" name="role" value="merchant" />
                <button
                  type="submit"
                  className="group w-full rounded-xl border border-zinc-200 bg-white p-7 text-left shadow-sm transition hover:border-red-200 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-lg transition group-hover:bg-zinc-950 group-hover:text-white">
                    👕
                  </div>
                  <h2 className="text-base font-semibold">Merchant / Brand</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    I need garments printed and want to find vetted local shops.
                  </p>
                </button>
              </form>
            </div>

            <p className="mt-8 text-xs text-zinc-400">
              Signed in as {user.email}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
