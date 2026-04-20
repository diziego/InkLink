"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOutAction } from "@/actions/auth";

type UserRole = "merchant" | "provider" | "admin" | null;

type AppHeaderNavProps = {
  role: UserRole;
  isSignedIn: boolean;
  theme?: "dark" | "light";
};

const workspaceNavItems = {
  merchant: [{ href: "/merchant", label: "Merchant" }],
  provider: [{ href: "/provider", label: "Provider" }],
  admin: [{ href: "/admin", label: "Admin" }],
} satisfies Record<Exclude<UserRole, null>, Array<{ href: string; label: string }>>;

const merchantSubnavItems = [
  { href: "/merchant", label: "Dashboard", view: "" },
  { href: "/merchant?view=new", label: "New order", view: "new" },
  { href: "/merchant?view=history", label: "Order history", view: "history" },
];

export function AppHeaderNav({
  role,
  isSignedIn,
  theme = "light",
}: AppHeaderNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDark = theme === "dark";
  const navItems = role ? workspaceNavItems[role] : [];
  const showMerchantSubnav = role === "merchant" && pathname.startsWith("/merchant");

  return (
    <div className="flex flex-col items-end gap-3">
      <nav
        aria-label="Primary navigation"
        className="flex flex-wrap items-center justify-end gap-2 text-sm"
      >
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={getTopNavClassName(isActive, isDark)}
            >
              {item.label}
            </Link>
          );
        })}

        {isSignedIn ? (
          <form action={signOutAction}>
            <button
              type="submit"
              className={
                isDark
                  ? "rounded-md px-3 py-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                  : "rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
              }
            >
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Sign in
          </Link>
        )}
      </nav>

      {showMerchantSubnav ? (
        <nav
          aria-label="Merchant navigation"
          className="flex flex-wrap justify-end gap-2"
        >
          {merchantSubnavItems.map((item) => {
            const isActive = isMerchantSubnavActive(
              item.view,
              searchParams.get("view") ?? "",
              searchParams.get("orderId") ?? "",
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-semibold shadow-sm transition ${
                  isActive
                    ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

function getTopNavClassName(isActive: boolean, isDark: boolean) {
  if (isActive) {
    return isDark
      ? "rounded-md bg-white px-3 py-1.5 font-semibold text-zinc-950 transition"
      : "rounded-md bg-zinc-950 px-3 py-1.5 font-semibold text-white transition";
  }

  return isDark
    ? "rounded-md px-3 py-1.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
    : "rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950";
}

function isMerchantSubnavActive(
  itemView: string,
  currentView: string,
  orderId: string,
) {
  if (orderId) {
    return false;
  }

  return itemView === currentView;
}
