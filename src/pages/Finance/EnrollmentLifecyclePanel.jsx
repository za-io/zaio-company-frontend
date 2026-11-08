import React, { useCallback, useEffect, useState } from "react";
import {
  getEnrollmentLifecycleFinanceQueue,
  postEnrollmentLifecycleFinanceApprove,
  postEnrollmentLifecycleFinanceReject,
  postEnrollmentLifecycleFinanceReturn,
  postEnrollmentLifecycleFinanceConfirmTransfer,
  postEnrollmentLifecycleCompleteTransfer,
} from "../../api/enrollmentLifecycle";
import { formatLifecycleEnrolmentStatus } from "../../utils/enrollmentLifecycleDisplay";

const FILTERS = [
  ["all", "All"],
  ["cancellation", "Cancellation review"],
  ["transfer", "Transfer review"],
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function FinanceReviewModal({ item, onClose, onUpdated }) {
  const [auditNotes, setAuditNotes] = useState("");
  const [proposedRefundCents, setProposedRefundCents] = useState(
    item?.proposedRefundCents != null ? String(item.proposedRefundCents) : ""
  );
  const [balanceCentsAtReview, setBalanceCentsAtReview] = useState(
    item?.balanceCentsAtReview != null ? String(item.balanceCentsAtReview) : ""
  );
  const [proposedCreditCents, setProposedCreditCents] = useState(
    item?.proposedCreditCents != null ? String(item.proposedCreditCents) : ""
  );
  const [priceDifferenceCents, setPriceDifferenceCents] = useState(
    item?.priceDifferenceCents != null ? String(item.priceDifferenceCents) : ""
  );
  const [paymentsReceivedSummary, setPaymentsReceivedSummary] = useState(item?.paymentsReceivedSummary || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!item) return null;
  const isTransfer = item.kind === "transfer";
  const isCancellation = item.kind === "cancellation";

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.success) {
      onUpdated?.();
      onClose();
      return;
    }
    setError(res.message || "Action failed");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#111827] border border-white/10 rounded-xl max-w-xl w-full p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">
            {isTransfer ? "Transfer review" : "Cancellation review"}
          </h2>
          <button type="button" className="text-gray-400" onClick={onClose}>
            ×
          </button>
        </div>
        <dl className="text-sm space-y-2 text-gray-300 mb-4">
          <Row label="Student" value={item.studentEmail} />
          <Row label="Current enrolment" value={item.bootcampName} />
          {isTransfer && <Row label="Requested enrolment" value={item.destinationBootcampName || "—"} />}
          <Row
            label="Enrolment status (source)"
            value={formatLifecycleEnrolmentStatus(item.sourceEnrollmentStatus)}
          />
          {isTransfer && (
            <Row
              label="Destination enrolment status"
              value={formatLifecycleEnrolmentStatus(item.destinationEnrollmentStatus)}
            />
          )}
          {item.transferLinks && (
            <>
              <Row label="Source enrolment ID" value={item.transferLinks.sourceEnrollmentId || "—"} />
              {isTransfer && (
                <>
                  <Row label="Source bootcamp ID" value={item.transferLinks.sourceBootcampId || "—"} />
                  <Row label="Destination bootcamp ID" value={item.transferLinks.destinationBootcampId || "—"} />
                  <Row label="Destination enrolment ID" value={item.transferLinks.destinationEnrollmentId || "—"} />
                </>
              )}
            </>
          )}
          <Row label="Reason" value={item.reasonLabel} />
          <Row label="Suhana's notes" value={item.triageNotes || "—"} />
          <Row label="Orientation" value={formatDate(item.orientationDateResolved)} />
          <Row
            label="Refund window"
            value={
              item.refundWindowManualReview
                ? "Manual review required"
                : item.withinRefundWindow == null
                  ? "—"
                  : item.withinRefundWindow
                    ? "Within 30-day window"
                    : "Outside window"
            }
          />
          <Row label="Payments received" value={item.paymentsReceivedSummary || "—"} />
        </dl>
        {!isTransfer && (
          <>
            <Field label="Proposed refund (cents)" value={proposedRefundCents} onChange={setProposedRefundCents} />
            <Field label="Balance at review (cents)" value={balanceCentsAtReview} onChange={setBalanceCentsAtReview} />
          </>
        )}
        {isTransfer && (
          <>
            <Field label="Proposed credit (cents)" value={proposedCreditCents} onChange={setProposedCreditCents} />
            <Field label="Price difference (cents)" value={priceDifferenceCents} onChange={setPriceDifferenceCents} />
            <Field label="Balance at review (cents)" value={balanceCentsAtReview} onChange={setBalanceCentsAtReview} />
            <label className="block text-xs text-gray-400 mb-1 mt-2">Payments received summary</label>
            <textarea
              className="w-full min-h-[60px] rounded-lg bg-[#0b1120] border border-white/10 text-sm text-white p-2 mb-2"
              value={paymentsReceivedSummary}
              onChange={(e) => setPaymentsReceivedSummary(e.target.value)}
            />
          </>
        )}
        <label className="block text-xs text-gray-400 mb-1">Finance audit notes</label>
        <textarea
          className="w-full min-h-[72px] rounded-lg bg-[#0b1120] border border-white/10 text-sm text-white p-2 mb-2"
          value={auditNotes}
          onChange={(e) => setAuditNotes(e.target.value)}
        />
        <p className="text-[11px] text-gray-500 mb-3">
          {isTransfer
            ? "Transfer review does not mark the student withdrawn. Financial review only — no enrolment move, charge or refund happens here."
            : "Approval withdraws only this bootcamp enrolment. No automatic refund settlement."}
        </p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex flex-wrap gap-2 justify-between mt-3">
          <button
            type="button"
            disabled={busy}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/20 text-gray-200"
            onClick={() => run(() => postEnrollmentLifecycleFinanceReturn(item._id, { notes: auditNotes }))}
          >
            Return to Suhana
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="px-3 py-1.5 text-xs rounded-lg border border-red-400/40 text-red-200"
              onClick={() => run(() => postEnrollmentLifecycleFinanceReject(item._id, { auditNotes }))}
            >
              Reject
            </button>
            {isCancellation && (
              <button
                type="button"
                disabled={busy}
                className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white font-semibold"
                onClick={() =>
                  run(() =>
                    postEnrollmentLifecycleFinanceApprove(item._id, {
                      auditNotes,
                      proposedRefundCents: proposedRefundCents ? Number(proposedRefundCents) : undefined,
                      balanceCentsAtReview: balanceCentsAtReview ? Number(balanceCentsAtReview) : undefined,
                    })
                  )
                }
              >
                Approve withdrawal
              </button>
            )}
            {isTransfer && item.status === "finance_transfer_review" && (
              <button
                type="button"
                disabled={busy}
                className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white font-semibold"
                onClick={() =>
                  run(() =>
                    postEnrollmentLifecycleFinanceConfirmTransfer(item._id, {
                      auditNotes,
                      proposedCreditCents: proposedCreditCents ? Number(proposedCreditCents) : undefined,
                      priceDifferenceCents: priceDifferenceCents ? Number(priceDifferenceCents) : undefined,
                      balanceCentsAtReview: balanceCentsAtReview ? Number(balanceCentsAtReview) : undefined,
                      paymentsReceivedSummary,
                    })
                  )
                }
              >
                Confirm adjustment
              </button>
            )}
            {isTransfer && item.status === "transfer_adjustment_confirmed" && (
              <button
                type="button"
                disabled={busy}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white font-semibold"
                onClick={() => run(() => postEnrollmentLifecycleCompleteTransfer(item._id))}
              >
                Complete transfer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        className="w-full rounded-lg bg-[#0b1120] border border-white/10 text-sm text-white p-2 mb-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

export default function EnrollmentLifecyclePanel() {
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const kind = filter === "all" ? undefined : filter;
    const res = await getEnrollmentLifecycleFinanceQueue(kind);
    if (res.success) setRows(res.data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="mt-4">
      <h2 className="text-lg font-semibold text-white mb-2">Requests from Suhana</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              filter === id ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300 border border-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading && <p className="text-gray-500 text-sm">Loading…</p>}
      {!loading && !rows.length && (
        <p className="text-gray-500 text-sm border border-dashed border-white/10 rounded-lg p-6 text-center">
          Escalated requests appear here.
        </p>
      )}
      {!loading && rows.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[720px]">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Student / enrolment</th>
                <th className="px-4 py-3">Suhana&apos;s notes</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-t border-white/5 text-gray-200">
                  <td className="px-4 py-3 capitalize">{row.kind}</td>
                  <td className="px-4 py-3">
                    <div>{row.studentEmail}</div>
                    <div className="text-gray-500 text-xs">{row.bootcampName}</div>
                    {row.sourceEnrollmentStatus && (
                      <div className="text-gray-500 text-xs">
                        Enrolment: {formatLifecycleEnrolmentStatus(row.sourceEnrollmentStatus)}
                      </div>
                    )}
                    {row.transferLinks?.destinationEnrollmentId && (
                      <div className="text-gray-500 text-xs">
                        Dest enrolment: {row.transferLinks.destinationEnrollmentId}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{row.triageNotes || "—"}</td>
                  <td className="px-4 py-3">{formatDate(row.escalatedAt || row.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-violet-300 text-xs font-semibold"
                      onClick={() => setSelected(row)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FinanceReviewModal item={selected} onClose={() => setSelected(null)} onUpdated={load} />
    </section>
  );
}
