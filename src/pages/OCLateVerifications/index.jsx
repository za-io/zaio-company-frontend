import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { getTutorLateVerifications } from "../../api/company";
import { buildQctoAssessorUrl } from "../OCQctoTrackerPage/qctoAssessorLinks";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function moduleTypeLabel(moduleType) {
  if (moduleType === "qcto_km") return "Knowledge module";
  if (moduleType === "qcto_pm") return "Practical module";
  return moduleType || "—";
}

function verificationStatusLabel(status) {
  if (status === "verified") return "Verified";
  return "Pending";
}

const OCLateVerifications = () => {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [totals, setTotals] = useState({ queueCount: 0, pendingCount: 0 });
  const [cohortId, setCohortId] = useState("");
  const [moduleView, setModuleView] = useState("");
  const [pendingOnly, setPendingOnly] = useState(true);

  const isTutor = user?.role === "TUTOR";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getTutorLateVerifications({
      cohortId: cohortId || undefined,
      view: moduleView || undefined,
      pendingOnly,
    });
    if (!res?.success) {
      setError(res?.message || "Could not load late verifications");
      setItems([]);
      setCohorts([]);
      setTotals({ queueCount: 0, pendingCount: 0 });
    } else {
      const data = res.data || {};
      setItems(data.items || []);
      setCohorts(data.cohorts || []);
      setTotals(
        data.totals || {
          queueCount: 0,
          pendingCount: 0,
        }
      );
      window.dispatchEvent(
        new CustomEvent("zaio-late-verifications-updated", {
          detail: { pendingCount: data.totals?.pendingCount ?? 0 },
        })
      );
    }
    setLoading(false);
  }, [cohortId, moduleView, pendingOnly]);

  useEffect(() => {
    if (isTutor) load();
    else setLoading(false);
  }, [isTutor, load]);

  const filteredCount = useMemo(() => items.length, [items]);

  const openVerification = (row) => {
    const url = buildQctoAssessorUrl(row.assessorRef, row.studentId, false);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("Could not open submission for verification.");
    }
  };

  if (!isTutor) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Late verifications</h1>
          <p className="text-gray-400 text-sm mt-1 max-w-3xl">
            Verification queue for your learners&apos; KM and PM work submitted after the cohort
            deadline. Open each item to tutor sign-off before assessors can mark it.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#161B22] p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cohort</label>
            <select
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm min-w-[200px]"
            >
              <option value="">All cohorts</option>
              {cohorts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Module type</label>
            <select
              value={moduleView}
              onChange={(e) => setModuleView(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm min-w-[160px]"
            >
              <option value="">All (KM & PM)</option>
              <option value="km">Knowledge modules (KM)</option>
              <option value="pm">Practical modules (PM)</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => setPendingOnly(e.target.checked)}
              className="rounded border-gray-600"
            />
            Pending verification only
          </label>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
            <p className="text-gray-400 text-sm">In queue</p>
            <p className="text-3xl font-semibold text-amber-400 mt-1">{filteredCount}</p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-[#161B22] p-4">
            <p className="text-gray-400 text-sm">Pending verification</p>
            <p className="text-3xl font-semibold text-white mt-1">{totals.pendingCount ?? 0}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#161B22] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="px-3 py-3 font-medium">Cohort</th>
                    <th className="px-3 py-3 font-medium">Learner</th>
                    <th className="px-3 py-3 font-medium">Module</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Item</th>
                    <th className="px-3 py-3 font-medium">Submitted</th>
                    <th className="px-3 py-3 font-medium">Deadline</th>
                    <th className="px-3 py-3 font-medium text-right">Days late</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-10 text-center text-gray-500">
                        No late verifications in this filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => (
                      <tr
                        key={`${row.submissionId}-${row.artifactKind}-${row.studentId}-${row.courseId}`}
                        className="border-b border-white/5 hover:bg-white/[0.02]"
                      >
                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{row.cohortName}</td>
                        <td className="px-3 py-2">
                          <div className="text-white font-medium">{row.studentName}</div>
                          <div className="text-gray-500 text-[10px]">{row.studentEmail}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-300">{row.courseName}</td>
                        <td className="px-3 py-2 text-gray-400">{moduleTypeLabel(row.moduleType)}</td>
                        <td className="px-3 py-2 text-gray-300">{row.artifactLabel}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.submittedAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-400">
                          {formatDate(row.deadlineAt)}
                        </td>
                        <td className="px-3 py-2 text-right text-amber-400 font-medium tabular-nums">
                          {row.daysLate}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              row.verificationStatus === "pending"
                                ? "text-amber-300"
                                : "text-emerald-400"
                            }
                          >
                            {verificationStatusLabel(row.verificationStatus)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openVerification(row)}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            Verify
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OCLateVerifications;
