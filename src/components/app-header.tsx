import Link from "next/link";
import { BRAND } from "@/config/brand";
import { getCurrentUser } from "@/lib/auth/helpers";
import { AppHeaderNav } from "@/components/app-header-nav";

type AppHeaderProps = {
  theme?: "dark" | "light";
};

export async function AppHeader({ theme = "light" }: AppHeaderProps) {
  const user = await getCurrentUser();

  const isDark = theme === "dark";

  return (
    <header className="flex items-center justify-between gap-6">
      <Link
        href="/"
        className={isDark ? "text-lg font-semibold text-white" : "text-lg font-semibold text-zinc-950"}
      >
        {BRAND.logoText}
      </Link>
      <AppHeaderNav
        role={user?.role ?? null}
        isSignedIn={Boolean(user)}
        theme={theme}
      />
    </header>
  );
}
