type StatCardProps = {
  label: string;
  value: string;
  description?: string;
  tone?: "light" | "dark";
};

export function StatCard({
  label,
  value,
  description,
  tone = "light",
}: StatCardProps) {
  const isDark = tone === "dark";

  return (
    <article
      className={`rounded-md border p-5 ${
        isDark
          ? "border-white/15 bg-white/10 text-white"
          : "border-zinc-200 bg-zinc-50 text-zinc-950"
      }`}
    >
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
