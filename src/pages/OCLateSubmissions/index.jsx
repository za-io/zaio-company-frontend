import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAssessorLateSubmissions } from "../../api/company";
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

function assessmentStatusLabel(status) {
  if (status === "pass") return "Pass";
  if (status === "fail") return "Fail";
  if (status === "retry") return "Retry";
  return "Pending";
}

function formatZar(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const OCLateSubmissions = () => {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [totals, setTotals] = useState({
    queueCount: 0,
    pendingCount: 0,
    potentialEarningsZar: 0,
    potentialEarningUnits: 0,
  });
  const [ratePerCredit, setRatePerCredit] = useState(null);
  const [cohortId, setCohortId] = useState("");
  const [moduleView, setModuleView] = useState("");
  const [pendingOnly, setPendingOnly] = useState(true);

  const isAssessor = user?.role === "ASSESSOR";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getAssessorLateSubmissions({
      cohortId: cohortId || undefined,
      view: moduleView || undefined,
      pendingOnly,
    });
    if (!res?.success) {
      setError(res?.message || "Could not load late submissions");
      setItems([]);
      setCohorts([]);
      setTotals({
        queueCount: 0,
        pendingCount: 0,
        potentialEarningsZar: 0,
        potentialEarningUnits: 0,
      });
      setRatePerCredit(null);
    } else {
      const data = res.data || {};
      setItems(data.items || []);
      setCohorts(data.cohorts || []);
      setTotals(
        data.totals || {
          queueCount: 0,
          pendingCount: 0,
          potentialEarningsZar: 0,
          potentialEarningUnits: 0,
        }
      );
      setRatePerCredit(data.ratePerCredit ?? null);
      window.dispatchEvent(
        new CustomEvent("zaio-late-submissions-updated", {
          detail: { pendingCount: data.totals?.pendingCount ?? 0 },
        })
      );
    }
    setLoading(false);
  }, [cohortId, moduleView, pendingOnly]);

  useEffect(() => {
    if (isAssessor) load();
    else setLoading(false);
  }, [isAssessor, load]);

  const filteredCount = useMemo(() => items.length, [items]);

  const openAssessment = (row) => {
    if (row.artifactKind === "qcto_pm_module") {
      const params = new URLSearchParams({
        view: "pm",
        highlightStudent: row.studentId,
        highlightCourse: row.courseId,
        openPmt: "1",
      });
      const path = row.moduleTrackerPath?.split("?")[0]
        || `/oc-programs/${row.cohortId}/module-tracker`;
      window.open(`${path}?${params.toString()}`, "_blank", "noopener,noreferrer");
      return;
    }
    const url = buildQctoAssessorUrl(row.assessorRef, row.studentId, false);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("Could not open assessor view for this submission.");
    }
  };

  if (!isAssessor) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Late submissions</h1>
          <p className="text-gray-400 text-sm mt-1 max-w-3xl">
            Assessment queue for KM and PM work submitted after the cohort deadline. Open each item
            in the assessor app to mark it.
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
            Pending assessment only
          </label>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
            <p className="text-gray-400 text-sm">In queue</p>
            <p className="text-3xl font-semibold text-amber-400 mt-1">{filteredCount}</p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-[#161B22] p-4">
            <p className="text-gray-400 text-sm">Pending assessment</p>
            <p className="text-3xl font-semibold text-white mt-1">{totals.pendingCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <p className="text-gray-400 text-sm">Possible earnings (if all pass)</p>
            <p className="text-3xl font-semibold text-emerald-400 mt-1">
              {formatZar(totals.potentialEarningsZar)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              {totals.potentialEarningUnits ?? 0} module
              {(totals.potentialEarningUnits ?? 0) === 1 ? "" : "s"} · excludes already paid
            </p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-[#161B22] p-4">
            <p className="text-gray-400 text-sm">Your rate</p>
            <p className="text-3xl font-semibold text-white mt-1">
              {ratePerCredit != null ? formatZar(ratePerCredit) : "Not set"}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">per credit</p>
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
                    <th className="px-3 py-3 font-medium">Tutor ✓</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium text-right">If pass</th>
                    <th className="px-3 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-10 text-center text-gray-500">
                        No late submissions in this filter.
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
                          {row.tutorVerified ? (
                            <span className="text-emerald-400">Yes</span>
                          ) : (
                            <span className="text-gray-500">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              row.assessmentStatus === "pending"
                                ? "text-amber-300"
                                : "text-gray-400"
                            }
                          >
                            {assessmentStatusLabel(row.assessmentStatus)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {row.potentialEarningZar > 0 ? (
                            <span className="text-emerald-400 font-medium" title={row.potentialEarningShared ? "KM module earning (LWB + SA both pass)" : undefined}>
                              {formatZar(row.potentialEarningZar)}
                              {row.potentialCredits ? (
                                <span className="block text-[10px] text-gray-500 font-normal">
                                  {row.potentialCredits} cr
                                  {row.potentialEarningShared ? " · module" : ""}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openAssessment(row)}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            {row.artifactKind === "qcto_pm_module" ? "Open PM tracker" : "Assess"}
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

export default OCLateSubmissions;
