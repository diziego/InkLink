type FieldMetricProps = {
  label: string;
  value: string;
  muted?: boolean;
  icon?: React.ReactNode;
};

export function FieldMetric({
  label,
  value,
  muted = false,
  icon,
}: FieldMetricProps) {
  return (
    <div className="flex gap-3">
      {icon ? (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm shadow-zinc-950/5">
          {icon}
        </div>
      ) : null}
      <div>
        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {label}
        </dt>
        <dd
          className={`mt-1 text-sm font-semibold leading-6 ${
            muted ? "text-zinc-700" : "text-zinc-950"
          }`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
