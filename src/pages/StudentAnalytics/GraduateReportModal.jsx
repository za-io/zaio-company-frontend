import { useState } from "react";
import { formatDate } from "../../utils/dateUtils";

function formatMade(report) {
  if (report?.paymentsRequired != null) {
    return `${report.paymentsMade ?? 0} of ${report.paymentsRequired}`;
  }
  return String(report?.paymentsMade ?? 0);
}

export default function GraduateReportModal({ report, onClose, onOverride }) {
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideNote, setOverrideNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!report) return null;

  const studentName = report.studentName || report.username || "Student";
  const canGraduate = report.canGraduate;
  const planReports = Array.isArray(report.planReports) ? report.planReports : [];
  const reasons = Array.isArray(report.reasons) ? report.reasons : [];
  const saved = Boolean(report.saved);
  const overridden = Boolean(report.overridden && report.overrideNote);
  const canOverride = !canGraduate && !overridden && typeof onOverride === "function" && report.userId && report.bootcampId;

  const handleOverride = async () => {
    const note = overrideNote.trim();
    if (!note) {
      setError("Add a note for why you are overriding (e.g. B2B program).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await onOverride(note);
      if (!res?.success) {
        setError(res?.message || "Override failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161B22] rounded-xl border border-gray-700 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-800">
          <div>
            <p className="text-[10px] uppercase text-gray-500 font-semibold">
              {saved ? "Graduation eligibility report" : "Grad eligibility check"}
            </p>
            <h3 className="text-sm font-semibold text-white mt-0.5">{studentName}</h3>
            {report.checkedAt && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                Checked {formatDate(report.checkedAt)}
                {report.checkedBy ? ` · ${report.checkedBy}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-white text-xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-3 overflow-y-auto space-y-3">
          <div
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              canGraduate
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-600/40"
                : "bg-red-600/20 text-red-300 border border-red-600/40"
            }`}
          >
            {overridden
              ? "Eligible to graduate (overridden)"
              : canGraduate
              ? "Able to graduate"
              : "Not able to graduate"}
          </div>

          {overridden && (
            <div className="rounded-lg border border-amber-600/40 bg-amber-600/10 px-3 py-2">
              <p className="text-[10px] uppercase text-amber-400 font-semibold mb-0.5">Override note</p>
              <p className="text-xs text-amber-100">{report.overrideNote}</p>
              {(report.overriddenBy || report.overriddenAt) && (
                <p className="text-[11px] text-amber-400/80 mt-1">
                  {report.overriddenBy || "Staff"}
                  {report.overriddenAt ? ` · ${formatDate(report.overriddenAt)}` : ""}
                </p>
              )}
            </div>
          )}

          {planReports.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold mb-1.5">Plan report</p>
              <div className="space-y-2">
                {planReports.map((plan, idx) => (
                  <div
                    key={`${plan.planCode || plan.planName || idx}`}
                    className="rounded-lg border border-gray-800 bg-[#0D1117] px-3 py-2"
                  >
                    <p className="text-xs font-medium text-white">
                      {plan.planName || "Payment plan"}
                      {plan.planCode && plan.planCode !== plan.planName ? (
                        <span className="text-gray-500 font-normal"> ({plan.planCode})</span>
                      ) : null}
                      {plan.type ? <span className="text-gray-500 font-normal"> · {plan.type}</span> : null}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">Payments made: {formatMade(plan)}</p>
                    <p className="text-xs text-gray-300">Bounces: {plan.bounces ?? 0}</p>
                    {plan.late ? <p className="text-xs text-amber-400">Late payments: {plan.late}</p> : null}
                    {plan.overdue ? <p className="text-xs text-orange-400">Overdue now: {plan.overdue}</p> : null}
                    {plan.type === "Manati" && plan.clean === true && (
                      <p className="text-xs text-emerald-400">Statement: clean</p>
                    )}
                    {plan.type === "Manati" && plan.clean === false && (
                      <p className="text-xs text-red-400">Statement: not clean</p>
                    )}
                    {plan.scrapeFailed && (
                      <p className="text-xs text-red-400">
                        Manati scrape failed: {plan.scrapeError || "unknown error"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!canGraduate && reasons.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold mb-1.5">
                Why we can&apos;t graduate
              </p>
              <ul className="list-disc pl-4 space-y-1">
                {reasons.map((reason) => (
                  <li key={reason} className="text-xs text-red-300">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {planReports.length === 0 && report.message && (
            <pre className="whitespace-pre-wrap text-xs text-gray-300 font-sans">{report.message}</pre>
          )}

          {canOverride && !showOverrideForm && (
            <button
              type="button"
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
              onClick={() => setShowOverrideForm(true)}
            >
              Override
            </button>
          )}

          {canOverride && showOverrideForm && (
            <div className="rounded-lg border border-amber-600/40 bg-[#0D1117] px-3 py-3 space-y-2">
              <label className="block text-[10px] uppercase text-amber-400 font-semibold">
                Why are you overriding?
              </label>
              <textarea
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="e.g. B2B program"
                rows={3}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-700 bg-[#161B22] text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
                  onClick={handleOverride}
                >
                  {saving ? "Saving…" : "Save override"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600"
                  onClick={() => {
                    setShowOverrideForm(false);
                    setError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
