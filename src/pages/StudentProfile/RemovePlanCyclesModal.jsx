import React from "react";

export function suggestedMissCycleIds(thisPlan = [], otherCycles = []) {
  return [...thisPlan, ...otherCycles]
    .filter((row) => row?.suggested && row?.id)
    .map((row) => row.id);
}

function formatCycleDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

function cycleKindLabel(cycleKind) {
  return cycleKind === "second_miss" ? "Second miss" : "First miss";
}

function CycleRow({ row, checked, onToggle, disabled }) {
  return (
    <label className="flex items-start gap-3 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(row.id)}
      />
      <span className="min-w-0 text-sm text-gray-800">
        <span className="font-medium">{row.planCode || "—"}</span>
        <span className="text-gray-500"> · {cycleKindLabel(row.cycleKind)} · {row.status || "—"}</span>
        {!row.planExists ? <span className="ml-2 text-xs font-medium text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Leftover plan</span> : null}
        <span className="block text-xs text-gray-500 mt-0.5">
          Triggers {Array.isArray(row.triggerInstallmentNumbers) && row.triggerInstallmentNumbers.length ? row.triggerInstallmentNumbers.join(", ") : "—"}
          {row.startedAt ? ` · started ${formatCycleDate(row.startedAt)}` : ""}
        </span>
      </span>
    </label>
  );
}

export default function RemovePlanCyclesModal({
  open,
  title,
  warning,
  thisPlan = [],
  otherCycles = [],
  selectedIds = [],
  loading = false,
  confirming = false,
  error = null,
  onToggle,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  const selected = new Set(selectedIds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title || "Remove plan"}</h3>
          {warning ? <p className="mt-2 text-sm text-gray-600">{warning}</p> : null}
          <p className="mt-2 text-sm text-gray-600">
            Tick the collection cycles to delete. Active leftover cycles keep the student blocked if you leave them.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {loading ? <p className="text-sm text-gray-500">Loading collection cycles…</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {!loading ? (
            <>
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">This plan</h4>
                {thisPlan.length ? (
                  <div className="space-y-2">
                    {thisPlan.map((row) => (
                      <CycleRow
                        key={row.id}
                        row={row}
                        checked={selected.has(row.id)}
                        disabled={confirming}
                        onToggle={onToggle}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No collection cycle on this plan.</p>
                )}
              </section>
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Other cycles on this student</h4>
                {otherCycles.length ? (
                  <div className="space-y-2">
                    {otherCycles.map((row) => (
                      <CycleRow
                        key={row.id}
                        row={row}
                        checked={selected.has(row.id)}
                        disabled={confirming}
                        onToggle={onToggle}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No other collection cycles.</p>
                )}
              </section>
            </>
          ) : null}
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            disabled={confirming}
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || confirming}
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50"
          >
            {confirming ? "Removing…" : "Remove plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
