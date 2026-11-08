import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getEnrollmentLifecycleTriageQueue,
  postEnrollmentLifecycleRetain,
  postEnrollmentLifecycleEscalate,
  postEnrollmentLifecycleTransferHandoff,
} from "../../api/enrollmentLifecycle";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function statusBadge(status) {
  if (status === "awaiting_triage" || status === "returned_to_triage") {
    return (
      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40">
        Awaiting triage
      </span>
    );
  }
  return (
    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
      {String(status).replace(/_/g, " ")}
    </span>
  );
}

function ReviewModal({ item, bootcamps, onClose, onUpdated }) {
  const [notes, setNotes] = useState("");
  const [destinationBootcampId, setDestinationBootcampId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!item) return null;

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
      <div className="bg-[#111827] border border-white/10 rounded-xl max-w-lg w-full p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Cancellation request — review</h2>
            {statusBadge(item.status)}
          </div>
          <button type="button" className="text-gray-400 hover:text-white" onClick={onClose}>
            ×
          </button>
        </div>
        <dl className="text-sm space-y-2 text-gray-300 mb-4">
          <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
            <dt className="text-gray-500">Student</dt>
            <dd className="text-right">{item.studentName || item.studentEmail}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
            <dt className="text-gray-500">Enrolment</dt>
            <dd className="text-right">{item.bootcampName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
            <dt className="text-gray-500">Reason</dt>
            <dd className="text-right">{item.reasonLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
            <dt className="text-gray-500">Request date</dt>
            <dd className="text-right">{formatDate(item.submittedAt)}</dd>
          </div>
        </dl>
        <label className="block text-xs text-gray-400 mb-1">Contact / discussion notes</label>
        <textarea
          className="w-full min-h-[96px] rounded-lg bg-[#0b1120] border border-white/10 text-sm text-white p-2 mb-3"
          placeholder="Record the call or chat with the student…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="text-[11px] text-gray-500 mb-3">
          Escalation sends this request and notes to Finance for a decision.
        </p>
        {item.kind === "cancellation" && (
          <label className="block text-xs text-gray-400 mb-1">Transfer handoff — destination bootcamp</label>
        )}
        {item.kind === "cancellation" && (
          <select
            className="w-full rounded-lg bg-[#0b1120] border border-white/10 text-sm text-white p-2 mb-3"
            value={destinationBootcampId}
            onChange={(e) => setDestinationBootcampId(e.target.value)}
          >
            <option value="">Choose destination (transfer only)</option>
            {(bootcamps || []).map((b) => (
              <option key={b._id} value={b._id}>
                {b.bootcampName || b.name}
              </option>
            ))}
          </select>
        )}
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            disabled={busy}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/20 text-gray-200"
            onClick={() => run(() => postEnrollmentLifecycleRetain(item._id, { notes }))}
          >
            Retained — close request
          </button>
          <button
            type="button"
            disabled={busy || !destinationBootcampId}
            className="px-3 py-1.5 text-xs rounded-lg border border-indigo-400/40 text-indigo-200"
            onClick={() =>
              run(() =>
                postEnrollmentLifecycleTransferHandoff(item._id, {
                  notes,
                  destinationBootcampId,
                })
              )
            }
          >
            Transfer handoff
          </button>
          <button
            type="button"
            disabled={busy}
            className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 text-white font-semibold"
            onClick={() => run(() => postEnrollmentLifecycleEscalate(item._id, { notes }))}
          >
            Escalate to Finance →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CancellationsTriagePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [bootcamps, setBootcamps] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getEnrollmentLifecycleTriageQueue();
    if (res.success) setRows(res.data || []);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    import("../../api/student").then(({ getAllBootcamps }) => {
      getAllBootcamps().then((list) => {
        if (Array.isArray(list)) setBootcamps(list);
        else if (list?.data) setBootcamps(list.data);
      });
    });
  }, [load]);

  return (
    <div className="px-8 lg:px-24 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link to="/" className="text-xs text-blue-400 hover:underline">
            ← Student Management
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">Cancellations — triage queue</h1>
          <p className="text-gray-400 text-sm mt-1">Awaiting triage, escalated to Finance, and returned items.</p>
        </div>
      </div>
      {loading && <p className="text-gray-400 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !rows.length && <p className="text-gray-500 text-sm">No requests awaiting triage.</p>}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Enrolment</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-t border-white/5 text-gray-200">
                <td className="px-4 py-3">{row.studentEmail}</td>
                <td className="px-4 py-3">{row.bootcampName}</td>
                <td className="px-4 py-3">{row.reasonLabel}</td>
                <td className="px-4 py-3">{formatDate(row.submittedAt)}</td>
                <td className="px-4 py-3">{statusBadge(row.status)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-violet-300 hover:text-violet-200 text-xs font-semibold"
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
      <ReviewModal
        item={selected}
        bootcamps={bootcamps}
        onClose={() => setSelected(null)}
        onUpdated={load}
      />
    </div>
  );
}
