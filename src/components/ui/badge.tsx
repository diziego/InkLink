type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "dark" | "warning" | "brand";
};

const toneClassNames = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  dark: "border-white/15 bg-white/10 text-zinc-100",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  brand: "border-indigo-200 bg-indigo-50 text-indigo-900",
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

// Color-coded badge for merchant_orders.status values
const statusStyles: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  ready_for_routing: "bg-slate-100 text-slate-700",
  routed: "bg-slate-100 text-slate-700",
  provider_selected: "bg-indigo-100 text-indigo-800",
  accepted: "bg-blue-100 text-blue-800",
  in_production: "bg-amber-100 text-amber-800",
  ready: "bg-green-100 text-green-800",
  shipped: "bg-violet-100 text-violet-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const colorClass = statusStyles[status] ?? "bg-zinc-100 text-zinc-600";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${colorClass}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
