import { useCallback, useEffect, useMemo, useState } from "react";
import Loader from "../../components/loader/loader";
import { getAssessorEarnings, getModeratorEarnings, getAssessorEarningPaymentProofUrl } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";

function formatMonthValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatZar(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "R 0.00";
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function moduleTypeLabel(moduleType) {
  if (moduleType === "qcto_km") return "Knowledge Module";
  if (moduleType === "qcto_pm") return "Practical Module";
  return moduleType || "—";
}

function buildFilterParams(mode, monthValue, rangeStart, rangeEnd, cohortId, allTime) {
  if (allTime) {
    return {
      allTime: true,
      ...(cohortId ? { cohortId } : {}),
    };
  }
  return {
    ...(mode === "month"
      ? { mode: "month", month: monthValue }
      : { mode: "range", rangeStart, rangeEnd }),
    ...(cohortId ? { cohortId } : {}),
  };
}

const AssessorEarnings = () => {
  const { user } = useUserStore();
  const [mode, setMode] = useState("month");
  const [monthValue, setMonthValue] = useState(() => formatMonthValue(new Date()));
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
  });
  const [cohortId, setCohortId] = useState("");
  const [allTime, setAllTime] = useState(true);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [ratePerCredit, setRatePerCredit] = useState(null);
  const [totalEarningsZar, setTotalEarningsZar] = useState(0);
  const [totalPaidZar, setTotalPaidZar] = useState(0);
  const [outstandingZar, setOutstandingZar] = useState(0);
  const [filteredEarningsZar, setFilteredEarningsZar] = useState(0);
  const [filteredPaidZar, setFilteredPaidZar] = useState(0);
  const [periodLabel, setPeriodLabel] = useState("All time");
  const [cohorts, setCohorts] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [proofLoadingId, setProofLoadingId] = useState(null);

  const isAssessor = user?.role === "ASSESSOR";
  const isModerator = user?.role === "MODERATOR";
  const canViewEarnings = isAssessor || isModerator;

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const fetchEarnings = isModerator ? getModeratorEarnings : getAssessorEarnings;
    const res = await fetchEarnings(
      buildFilterParams(mode, monthValue, rangeStart, rangeEnd, cohortId, allTime)
    );
    if (!res?.success) {
      setMessage(res?.message || "Could not load earnings");
      setLoading(false);
      return;
    }
    const data = res.data || {};
    setRatePerCredit(data.ratePerCredit ?? null);
    setTotalEarningsZar(data.totalEarningsZar ?? 0);
    setTotalPaidZar(data.totalPaidZar ?? 0);
    setOutstandingZar(data.outstandingZar ?? 0);
    setFilteredEarningsZar(data.filteredEarningsZar ?? 0);
    setFilteredPaidZar(data.filteredPaidZar ?? 0);
    setPeriodLabel(data.periodLabel || (allTime ? "All time" : ""));
    setCohorts(data.cohorts || []);
    setEarnings(data.earnings || []);
    setPayments(data.payments || []);
    setLoading(false);
  }, [mode, monthValue, rangeStart, rangeEnd, cohortId, allTime, isModerator]);

  useEffect(() => {
    if (canViewEarnings) {
      loadEarnings();
    } else {
      setLoading(false);
    }
  }, [canViewEarnings, loadEarnings]);

  const hasRate = useMemo(
    () => ratePerCredit != null && Number(ratePerCredit) > 0,
    [ratePerCredit]
  );

  const handleViewProof = async (paymentId) => {
    setProofLoadingId(paymentId);
    const res = await getAssessorEarningPaymentProofUrl(paymentId);
    setProofLoadingId(null);
    if (res?.success && res.data?.url) {
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } else {
      setMessage(res?.message || "Could not open proof of payment");
    }
  };

  if (!canViewEarnings) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-white p-6">
        <p className="text-gray-400">Earnings are only available for assessors and moderators.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Earnings</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isModerator
              ? "Moderation earnings and bank payments recorded by Zaio finance."
              : "Assessment earnings and bank payments recorded by Zaio finance."}
          </p>
        </div>

        {message && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
            {message}
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-[#161B22] p-4 flex flex-wrap items-end gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAllTime(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                allTime ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-300"
              }`}
            >
              All time
            </button>
            <button
              type="button"
              onClick={() => setAllTime(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                !allTime ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-300"
              }`}
            >
              By period
            </button>
          </div>
          {!allTime && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("month")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    mode === "month" ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-300"
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setMode("range")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    mode === "range" ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-300"
                  }`}
                >
                  Date range
                </button>
              </div>
              {mode === "month" ? (
                <input
                  type="month"
                  value={monthValue}
                  onChange={(e) => setMonthValue(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm"
                />
              ) : (
                <>
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm"
                  />
                </>
              )}
            </>
          )}
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm min-w-[180px]"
          >
            <option value="">All cohorts</option>
            {cohorts.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadEarnings}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
          >
            Apply
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-700 bg-[#161B22] p-5">
            <p className="text-gray-400 text-sm">Rand per credit</p>
            <p className="text-3xl font-semibold text-emerald-400 mt-1">
              {hasRate ? formatZar(ratePerCredit) : "Not set"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-[#161B22] p-5">
            <p className="text-gray-400 text-sm">Total earned (all time)</p>
            <p className="text-3xl font-semibold text-white mt-1">{formatZar(totalEarningsZar)}</p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-[#161B22] p-5">
            <p className="text-gray-400 text-sm">Total paid (all time)</p>
            <p className="text-3xl font-semibold text-blue-400 mt-1">{formatZar(totalPaidZar)}</p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-[#161B22] p-5">
            <p className="text-gray-400 text-sm">Outstanding</p>
            <p className="text-3xl font-semibold text-amber-400 mt-1">{formatZar(outstandingZar)}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-700 bg-[#161B22] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Payments received</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Bank transfers recorded by finance, with proof of payment where provided.
                  </p>
                </div>
                <p className="text-sm text-blue-400 font-medium">
                  {periodLabel} · {formatZar(filteredPaidZar)}
                </p>
              </div>
              {payments.length === 0 ? (
                <p className="px-5 py-8 text-gray-500 text-sm">No payments in this filter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-800">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                        <th className="px-4 py-3 font-medium">Comments</th>
                        <th className="px-4 py-3 font-medium">Recorded by</th>
                        <th className="px-4 py-3 font-medium">Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((row) => (
                        <tr key={row._id} className="border-b border-gray-800/80 hover:bg-gray-800/30">
                          <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{formatDate(row.paidAt)}</td>
                          <td className="px-4 py-3 text-right text-blue-400 font-medium">
                            {formatZar(row.amountZar)}
                          </td>
                          <td className="px-4 py-3 text-gray-400">{row.comments || "—"}</td>
                          <td className="px-4 py-3 text-gray-300">{row.recordedByName || "—"}</td>
                          <td className="px-4 py-3">
                            {row.hasProof ? (
                              <button
                                type="button"
                                onClick={() => handleViewProof(row._id)}
                                disabled={proofLoadingId === row._id}
                                className="text-cyan-400 hover:text-cyan-300 text-sm disabled:opacity-50"
                              >
                                {proofLoadingId === row._id ? "Opening…" : "View proof"}
                              </button>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-700 bg-[#161B22] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">
                    {isModerator ? "Moderation earnings" : "Assessment earnings"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {isModerator
                      ? "Paid when a KM or PM moderation batch is fully completed."
                      : "KM: paid when Learner Workbook and Summative are both Pass. PM: paid when all PMT tasks are Pass."}
                  </p>
                </div>
                <p className="text-sm text-emerald-400 font-medium">
                  {periodLabel}
                  {cohortId && cohorts.find((c) => c._id === cohortId)?.name
                    ? ` · ${cohorts.find((c) => c._id === cohortId)?.name}`
                    : ""}{" "}
                  · {formatZar(filteredEarningsZar)}
                </p>
              </div>
              {earnings.length === 0 ? (
                <p className="px-5 py-8 text-gray-500 text-sm">No earnings in this filter.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-800">
                        <th className="px-4 py-3 font-medium">Date</th>
                        {!isModerator && <th className="px-4 py-3 font-medium">Learner</th>}
                        <th className="px-4 py-3 font-medium">Cohort</th>
                        <th className="px-4 py-3 font-medium">Module</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium text-right">Credits</th>
                        <th className="px-4 py-3 font-medium text-right">Rate</th>
                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.map((row) => (
                        <tr key={row._id} className="border-b border-gray-800/80 hover:bg-gray-800/30">
                          <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{formatDate(row.earnedAt)}</td>
                          {!isModerator && (
                            <td className="px-4 py-3 text-white">{row.studentName || "—"}</td>
                          )}
                          <td className="px-4 py-3 text-gray-300">{row.cohortName || "—"}</td>
                          <td className="px-4 py-3 text-gray-300">{row.courseName || "—"}</td>
                          <td className="px-4 py-3 text-gray-400">{moduleTypeLabel(row.moduleType)}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{row.credits}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{formatZar(row.ratePerCredit)}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                            {formatZar(row.amountZar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AssessorEarnings;
