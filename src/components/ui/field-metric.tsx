type FieldMetricProps = {
  label: string;
  value: string;
  muted?: boolean;
};

export function FieldMetric({ label, value, muted = false }: FieldMetricProps) {
  return (
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
  );
}
