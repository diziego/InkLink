type StatCardProps = {
  label: string;
  value: string;
  description?: string;
  tone?: "light" | "dark";
  icon?: React.ReactNode;
};

export function StatCard({
  label,
  value,
  description,
  tone = "light",
  icon,
}: StatCardProps) {
  const isDark = tone === "dark";

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm ${
        isDark
          ? "border-white/15 bg-white/10 text-white shadow-black/10"
          : "border-zinc-200 bg-white text-zinc-950 shadow-zinc-950/5"
      }`}
    >
      {icon ? (
        <div
          className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full border ${
            isDark
              ? "border-white/15 bg-white/10 text-white"
              : "border-zinc-200 bg-zinc-50 text-zinc-700"
          }`}
        >
          {icon}
        </div>
      ) : null}
      <p
        className={`text-sm font-semibold uppercase tracking-[0.16em] ${
          isDark ? "text-zinc-400" : "text-zinc-500"
        }`}
      >
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {description ? (
        <p
          className={`mt-3 text-sm leading-6 ${
            isDark ? "text-zinc-300" : "text-zinc-600"
          }`}
        >
          {description}
        </p>
      ) : null}
    </article>
  );
}
