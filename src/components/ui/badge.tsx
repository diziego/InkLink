type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "dark" | "warning";
};

const toneClassNames = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  dark: "border-white/15 bg-white/10 text-zinc-100",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-md border px-3 py-1 text-sm ${toneClassNames[tone]}`}
    >
      {children}
    </span>
  );
}
