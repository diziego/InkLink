import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  CreditCard,
  PackageCheck,
  PackageOpen,
  Truck,
  XCircle,
} from "lucide-react";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "neutral" | "dark" | "warning" | "brand";
  icon?: React.ReactNode;
};

const toneClassNames = {
  neutral: "border-zinc-200 bg-white text-zinc-700 shadow-sm shadow-zinc-950/5",
  dark: "border-white/15 bg-white/10 text-zinc-100",
  warning: "border-amber-200 bg-amber-50 text-amber-900 shadow-sm shadow-amber-950/5",
  brand: "border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm shadow-indigo-950/5",
};

export function Badge({ children, tone = "neutral", icon }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${toneClassNames[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

// Color-coded badge for merchant_orders.status values
const statusStyles: Record<
  string,
  { className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: {
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
    icon: CircleDashed,
  },
  ready_for_routing: {
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: CircleDashed,
  },
  routed: {
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: CircleDashed,
  },
  provider_selected: {
    className: "border-indigo-200 bg-indigo-100 text-indigo-800",
    icon: CreditCard,
  },
  paid: {
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  accepted: {
    className: "border-blue-200 bg-blue-100 text-blue-800",
    icon: PackageOpen,
  },
  in_production: {
    className: "border-amber-200 bg-amber-100 text-amber-900",
    icon: Clock3,
  },
  ready: {
    className: "border-green-200 bg-green-100 text-green-800",
    icon: PackageCheck,
  },
  shipped: {
    className: "border-violet-200 bg-violet-100 text-violet-800",
    icon: Truck,
  },
  completed: {
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  cancelled: {
    className: "border-red-200 bg-red-100 text-red-700",
    icon: XCircle,
  },
};

export function StatusBadge({ status }: { status: string }) {
  const statusStyle = statusStyles[status] ?? {
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
    icon: CircleDashed,
  };
  const Icon = statusStyle.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm shadow-zinc-950/5 ${statusStyle.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {status.replace(/_/g, " ")}
    </span>
  );
}
