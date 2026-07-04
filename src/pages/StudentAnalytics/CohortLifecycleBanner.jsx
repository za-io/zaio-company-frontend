import React, { useState } from "react";
import { updateCohortLifecycleStatus } from "../../api/company";
import { formatDate } from "../../utils/dateUtils";

const STATUS_STYLES = {
  "On Going": "bg-emerald-600/20 text-emerald-400 border-emerald-600/40",
  Resolve: "bg-violet-600/20 text-violet-300 border-violet-500/40",
  "2 Month Grace Period": "bg-orange-600/20 text-orange-400 border-orange-600/40",
  Deferred: "bg-yellow-600/20 text-yellow-400 border-yellow-600/40",
  Completed: "bg-blue-600/20 text-blue-400 border-blue-600/40",
};

export default function CohortLifecycleBanner({ bootcampDetails, onUpdated }) {
  const lifecycle = bootcampDetails?.cohortLifecycle;
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  if (!lifecycle?.usesNewLifecycleProgram) return null;

  const status = lifecycle.status || "On Going";
  const statusClass = STATUS_STYLES[status] || STATUS_STYLES["On Going"];
  const bootcampId = bootcampDetails?._id;
  const bootcampName = bootcampDetails?.bootcampName || "Bootcamp";

  const handleAdvance = async (nextStatus) => {
    if (!nextStatus || !bootcampId) return;
    setUpdating(true);
    setMessage(null);
    try {
      const res = await updateCohortLifecycleStatus(bootcampId, nextStatus);
      if (res.success) {
        setMessage({ type: "success", text: res.message || `Status updated to ${nextStatus}.` });
        onUpdated?.();
      } else {
        setMessage({ type: "error", text: res.message || "Could not update cohort status." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Could not update cohort status." });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-700 bg-[#161B22] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Cohort lifecycle
          </p>
          <h2 className="text-lg font-semibold text-white mb-2">{bootcampName}</h2>
          <div className="flex flex-col gap-1 text-sm">
            {lifecycle.completionDate && (
              <span className="text-gray-400">Completion: {formatDate(lifecycle.completionDate)}</span>
            )}
            {lifecycle.gracePeriodEndDate && (
              <span className={status === "2 Month Grace Period" ? "text-orange-400 font-medium" : "text-gray-300"}>
                Grace period ends: {formatDate(lifecycle.gracePeriodEndDate)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 min-w-[200px]">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusClass}`}>
            {status}
          </span>

          {status === "Resolve" && (
            <>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                Set each student&apos;s enrollment status below, then advance the cohort to Grace Period or
                Completed.
              </p>
              <select
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm"
                defaultValue=""
                disabled={updating}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) handleAdvance(value);
                  e.target.value = "";
                }}
              >
                <option value="">Advance cohort to…</option>
                <option value="2 Month Grace Period">Grace Period</option>
                <option value="Completed">Completed</option>
              </select>
            </>
          )}
        </div>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.type === "error" ? "text-red-400" : "text-green-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
