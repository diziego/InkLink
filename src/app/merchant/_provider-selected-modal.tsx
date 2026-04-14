"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  providerName: string;
  priceLabel: string;
  isManualQuote: boolean;
  turnaroundDays: number;
  orderId: string;
  checkoutHref: string | null;
};

export function ProviderSelectedModal({
  providerName,
  priceLabel,
  isManualQuote,
  turnaroundDays,
  orderId,
  checkoutHref,
}: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    router.replace(`/merchant?orderId=${orderId}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ps-modal-title"
        className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="rounded-t-xl bg-indigo-950 px-6 py-5 text-white">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-400/20 text-sm">
              ✓
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
              Provider selected
            </p>
          </div>
          <h2
            id="ps-modal-title"
            className="mt-2 text-2xl font-semibold leading-tight"
          >
            Provider selected!
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-5">
          <p className="text-base text-zinc-800">
            You&apos;ve selected{" "}
            <span className="font-semibold text-zinc-950">{providerName}</span>{" "}
            for this order.
          </p>

          {/* Summary row */}
          <dl className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-zinc-50 text-sm">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-zinc-500">Estimated total</dt>
              <dd className="font-semibold text-zinc-900">
                {isManualQuote ? "Manual quote required" : priceLabel}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-zinc-500">Turnaround</dt>
              <dd className="font-semibold text-zinc-900">
                {turnaroundDays} days
              </dd>
            </div>
          </dl>

          {/* Status notice */}
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm leading-6 text-amber-900">
              <span className="font-semibold">
                Your provider has been reserved as your current match,
              </span>{" "}
              but your order won&apos;t enter their active queue until payment
              is completed.
            </p>
            <p className="mt-2 text-sm leading-5 text-amber-800">
              If any additional artwork, details, or clarification are needed,
              that can happen after payment confirms the order.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2">
            {checkoutHref ? (
              <a
                href={checkoutHref}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-indigo-950 px-5 text-sm font-semibold text-white transition hover:bg-indigo-900"
              >
                Continue to payment
              </a>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                {isManualQuote
                  ? "This provider requires a manual quote before payment can begin."
                  : "Payment is not available for this provider selection yet."}
              </div>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Pay later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
