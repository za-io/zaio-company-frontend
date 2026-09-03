import React, { useLayoutEffect, useState } from "react";
import {
  centsToMoneyInput,
  cancellationFeePolicyHint,
  defaultCancellationFeeCents,
  formatCollectionsMoney,
  parseMoneyInputToCents,
  sumCancellationDueCents,
} from "./collectionsViewModel";

function CancellationAmountsTable({ rows, editable = false, onChange }) {
  return (
    <table className="w-full text-[10px] leading-tight text-gray-200">
      <thead>
        <tr className="border-b border-white/10 text-left text-[9px] uppercase tracking-wide text-gray-500">
          <th className="py-1 pr-1.5 font-medium">Line</th>
          <th className="py-1 font-medium text-right">Amount (R)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-white/5">
            <td className="py-1 pr-1.5 align-middle">{row.label}</td>
            <td className="py-1 text-right align-middle">
              {editable && row.editable !== false ? (
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={row.label}
                  value={row.value ?? ""}
                  onChange={(event) => onChange?.(row.key, event.target.value)}
                  className="w-full min-w-[5.5rem] rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-right text-[10px] tabular-nums text-white"
                />
              ) : (
                <span className="tabular-nums">{row.display ?? row.value ?? "—"}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ManualCancellationForm({
  collectionCase,
  disabled = false,
  submitting = false,
  onSubmit,
}) {
  const caseKey = `${collectionCase?.userId}:${collectionCase?.planCode}`;
  const missCycle = collectionCase?.missCycle;
  const isCancelled = missCycle?.status === "cancelled";

  const [arrearsInput, setArrearsInput] = useState("");
  const [feeInput, setFeeInput] = useState("");

  useLayoutEffect(() => {
    setArrearsInput(
      centsToMoneyInput(
        isCancelled && missCycle?.finalArrearsCents != null
          ? missCycle.finalArrearsCents
          : collectionCase?.arrearsCents
      )
    );
    setFeeInput(
      centsToMoneyInput(
        isCancelled && missCycle?.cancellationFeeCents != null
          ? missCycle.cancellationFeeCents
          : defaultCancellationFeeCents(collectionCase)
      )
    );
  }, [
    caseKey,
    collectionCase?.arrearsCents,
    collectionCase?.suggestedCancellationFeeCents,
    isCancelled,
    missCycle?.cancellationFeeCents,
    missCycle?.finalArrearsCents,
  ]);

  if (isCancelled) {
    const totalCents =
      missCycle?.totalDueCents ??
      sumCancellationDueCents(missCycle?.finalArrearsCents, missCycle?.cancellationFeeCents);
    return (
      <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-2">
        <h3 className="text-xs font-semibold text-white">Cancellation confirmed</h3>
        <p className="mt-0.5 text-[10px] text-gray-400">Recorded amounts — case in debt recovery.</p>
        <div className="mt-2">
          <CancellationAmountsTable
            rows={[
              {
                key: "arrears",
                label: "Final arrears",
                display: formatCollectionsMoney(missCycle?.finalArrearsCents),
              },
              {
                key: "fee",
                label: "Cancellation fee",
                display: formatCollectionsMoney(missCycle?.cancellationFeeCents),
              },
              {
                key: "total",
                label: "Total due",
                display: formatCollectionsMoney(totalCents),
              },
            ]}
          />
        </div>
      </div>
    );
  }

  const arrearsCents = parseMoneyInputToCents(arrearsInput);
  const feeCents = parseMoneyInputToCents(feeInput);
  const totalCents = sumCancellationDueCents(arrearsCents, feeCents);
  const canConfirm = arrearsCents != null && feeCents != null && !disabled && !submitting;
  const feePolicyHint = cancellationFeePolicyHint(collectionCase);

  function handleFieldChange(key, value) {
    if (key === "arrears") setArrearsInput(value);
    if (key === "fee") setFeeInput(value);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canConfirm) return;
    onSubmit?.({ finalArrearsCents: arrearsCents, cancellationFeeCents: feeCents });
  }

  return (
    <form
      className="mt-3 rounded-lg border border-red-500/30 bg-red-950/15 p-2"
      onSubmit={handleSubmit}
    >
      <h3 className="text-xs font-semibold text-red-100">Manual cancellation</h3>
      <p className="mt-0.5 text-[10px] leading-snug text-red-200/80">
        Review and edit final arrears and cancellation fee, then confirm to move this case to debt
        recovery. Invoice, Paystack cancel, and write-off are not executed yet.
      </p>
      <div className="mt-2">
        <CancellationAmountsTable
          editable
          rows={[
            { key: "arrears", label: "Final arrears", value: arrearsInput, editable: true },
            { key: "fee", label: "Cancellation fee", value: feeInput, editable: true },
            {
              key: "total",
              label: "Total due",
              editable: false,
              display: totalCents == null ? "—" : formatCollectionsMoney(totalCents),
            },
          ]}
          onChange={handleFieldChange}
        />
        {feePolicyHint ? (
          <p className="mt-1 text-[10px] leading-snug text-gray-400">{feePolicyHint}</p>
        ) : null}
        {totalCents != null ? (
          <p className="mt-1 text-right text-[10px] font-medium tabular-nums text-gray-200">
            Total due: {formatCollectionsMoney(totalCents)}
          </p>
        ) : (
          <p className="mt-1 text-right text-[10px] text-amber-300/90">
            Enter valid amounts for arrears and cancellation fee.
          </p>
        )}
      </div>
      {collectionCase.missCycle?.windowExpired === false ? (
        <p className="mt-1 text-[10px] text-amber-300/90">
          Finance policy: prefer waiting until the 5 business-day window expires.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!canConfirm}
        className="mt-2 w-full rounded border border-red-500/40 bg-red-950/40 px-2 py-1.5 text-[10px] font-medium text-red-100 hover:bg-red-950/60 disabled:opacity-50"
      >
        {submitting ? "Confirming…" : "Confirm cancellation → debt recovery"}
      </button>
    </form>
  );
}
