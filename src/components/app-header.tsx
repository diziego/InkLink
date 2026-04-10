import Link from "next/link";
import { BRAND } from "@/config/brand";
import { getCurrentUser } from "@/lib/auth/helpers";
import { signOutAction } from "@/actions/auth";

type AppHeaderProps = {
  theme?: "dark" | "light";
};

const navItems = [
  { href: "/merchant", label: "Merchant" },
  { href: "/provider", label: "Provider" },
  { href: "/admin", label: "Admin" },
];

export async function AppHeader({ theme = "light" }: AppHeaderProps) {
  const user = await getCurrentUser();

  const isDark = theme === "dark";
  const linkClassName = isDark
    ? "text-zinc-300 hover:text-white"
    : "text-zinc-600 hover:text-zinc-950";

  return (
    <header className="flex items-center justify-between gap-6">
      <Link
        href="/"
        className={isDark ? "text-lg font-semibold text-white" : "text-lg font-semibold text-zinc-950"}
      >
        {BRAND.logoText}
      </Link>
      <nav
        aria-label="Primary navigation"
        className={`flex flex-wrap items-center justify-end gap-4 text-sm ${linkClassName}`}
      >
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="transition">
            {item.label}
          </Link>
        ))}

        {user ? (
          <form action={signOutAction}>
            <button
              type="submit"
              className={`transition ${linkClassName}`}
            >
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
