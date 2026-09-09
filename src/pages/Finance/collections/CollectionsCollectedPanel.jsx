import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  getFinanceCollectionCollected,
  postFinanceCollectionCollectedApprove,
} from "../../../api/company";
import { toCollectionsApiError } from "./collectionsViewModel";

function formatCollectedAt(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function triggerLabel(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return "—";
  return numbers.join(", ");
}

export default function CollectionsCollectedPanel({ onCountChange, onOpenCase }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cases, setCases] = useState([]);
  const [actionKey, setActionKey] = useState("");
  const generationRef = useRef(0);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const load = useCallback(() => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError("");
    getFinanceCollectionCollected().then((result) => {
      if (generation !== generationRef.current) return;
      if (!result?.success) {
        setError(result?.message || "Failed to load collected cases");
        setCases([]);
        onCountChangeRef.current?.(0);
        setLoading(false);
        return;
      }
      const next = Array.isArray(result.cases) ? result.cases : [];
      setCases(next);
      onCountChangeRef.current?.(next.length);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  async function handleApprove(row) {
    const key = `${row.userId}:${row.planCode}`;
    setActionKey(key);
    setError("");
    try {
      const result = await postFinanceCollectionCollectedApprove(row.userId, row.planCode);
      if (!result?.success) {
        setError(result?.message || "Failed to approve collected case");
        return;
      }
      load();
    } catch (err) {
      setError(toCollectionsApiError(err, "Failed to approve collected case").message);
    } finally {
      setActionKey("");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-gray-400">
        Paid miss-cycle cases stay here until finance approves close. The student is already unblocked.
      </p>

      {error ? (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-gray-400" role="status">
          Loading collected cases…
        </p>
      ) : cases.length === 0 ? (
        <p className="text-xs text-gray-500">No collected cases waiting for approval.</p>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 text-[10px] leading-tight text-left">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="px-2 py-1 font-medium">Collected</th>
                  <th className="px-2 py-1 font-medium">Student</th>
                  <th className="px-2 py-1 font-medium">Plan</th>
                  <th className="px-2 py-1 font-medium">Triggers</th>
                  <th className="px-2 py-1 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((row) => {
                  const key = row.caseKey || `${row.userId}:${row.planCode}`;
                  const approving = actionKey === key;
                  return (
                    <tr key={key} className="border-b border-white/5">
                      <td className="px-2 py-1.5 text-gray-300 whitespace-nowrap">
                        {formatCollectedAt(row.collectedAt)}
                      </td>
                      <td className="px-2 py-1.5 text-white">
                        <div>{row.student?.username || "Student"}</div>
                        {row.student?.email ? (
                          <div className="text-gray-500">{row.student.email}</div>
                        ) : null}
                      </td>
                      <td className="px-2 py-1.5 text-gray-300">
                        <div>{row.planName || row.planCode}</div>
                        <div className="text-gray-500">{row.planCode}</div>
                      </td>
                      <td className="px-2 py-1.5 text-gray-300 tabular-nums">
                        {triggerLabel(row.triggerInstallmentNumbers)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => onOpenCase?.(row)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          disabled={approving}
                          onClick={() => handleApprove(row)}
                          className="px-2 py-0.5 rounded text-[10px] font-medium border bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500 disabled:opacity-60"
                        >
                          {approving ? "Approving…" : "Approve close"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
