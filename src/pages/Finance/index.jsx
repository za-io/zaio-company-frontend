import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  getFinanceSummaryWithPolling,
  getFinanceSummary,
  getFinanceAttentionRejected,
  getFinancePendingEftSubmissions,
} from "../../api/company";
import {
  updateStudentFinanceExclude,
  blockUser,
  unblockUser,
  getEftSubmissionProofUrl,
  approveEftSubmission,
  rejectEftSubmission,
} from "../../api/student";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import CopyableEmailCell from "../../components/CopyableEmailCell";

const FINANCE_ROLES = ["SUPER_STUDENT_ADMIN", "SUPER_ADMIN", "COMPANY_ADMIN"];
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function formatMonthValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function centsToZAR(cents) {
  if (cents == null || Number.isNaN(Number(cents))) return "—";
  return `R ${(Number(cents) / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/** Sum installment amounts in cents (API stores amounts as cents; backend uses Math.round). */
function sumRowAmountsCents(rows) {
  return (rows || []).reduce((acc, r) => {
    const n = Math.round(Number(r.amount) || 0);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** Sum amounts for rows with status paid only */
function sumPaidRowAmountsCents(rows) {
  return (rows || []).reduce((acc, r) => {
    if (r.status !== "paid") return acc;
    const n = Math.round(Number(r.amount) || 0);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** Sum amounts for rows that are not paid (matches backend pendingCents) */
function sumPendingRowAmountsCents(rows) {
  return (rows || []).reduce((acc, r) => {
    if (r.status === "paid") return acc;
    const n = Math.round(Number(r.amount) || 0);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function sumHighChanceToPayAmountsCents(rows) {
  return (rows || []).reduce((acc, r) => {
    const highChance = !!r?.recentLearningActivity || !!r?.paidPreviousMonth;
    if (!highChance) return acc;
    if (r?.status === "paid") return acc;
    const n = Math.round(Number(r.amount) || 0);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map((v) => parseInt(v, 10));
  if (!year || !month) return "Unknown";
  return new Date(year, month - 1, 1).toLocaleDateString("en-ZA", {
    month: "short",
    year: "numeric",
  });
}

function getRollingMonths(count = 12) {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return months;
}

/** Run async work on items with limited concurrency (avoids N parallel full finance-summary calls). */
async function mapPool(items, concurrency, fn) {
  if (!items.length) return [];
  const n = Math.min(Math.max(1, concurrency), items.length);
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

const InstallmentTable = ({
  rows,
  title,
  description,
  emptyMessage = "No rows for this view.",
  footerCaption,
  onToggleTest,
  savingUserId,
  embedded,
  showAccountActions = false,
  onBlockToggle,
  blockLoadingUserId,
  highlightRecentLikelyPayers = false,
}) => (
  <div
    className={
      embedded
        ? "bg-white/[0.02]"
        : "rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]"
    }
  >
    <div className="px-4 py-2.5 border-b border-white/10">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>}
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs text-left">
        <thead>
          <tr className="text-gray-400 border-b border-white/10">
            <th className="px-3 py-2 font-medium">Student</th>
            <th className="px-3 py-2 font-medium min-w-[200px]">Email</th>
            <th className="px-3 py-2 font-medium">Student #</th>
            <th className="px-3 py-2 font-medium">Plan</th>
            <th className="px-3 py-2 font-medium max-w-[140px]" title="Operational cohort (OC)">
              OC
            </th>
            <th className="px-3 py-2 font-medium">Inst.</th>
            <th className="px-3 py-2 font-medium">Due</th>
            <th className="px-3 py-2 font-medium">Method</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Status</th>
            {showAccountActions && (
              <th className="px-3 py-2 font-medium min-w-[120px]" title="Login access (company block)">
                Account
              </th>
            )}
            <th className="px-3 py-2 font-medium">Paid</th>
            <th className="px-3 py-2 font-medium w-[90px]" title="Exclude from Finance (test / demo)">
              Test
            </th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody className="text-gray-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showAccountActions ? 14 : 13} className="px-3 py-6 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => {
              const atRiskDeregistration = Number(row.rejectedBillingCount) > 2;
              const paymentStress =
                Number(row.pendingInstallmentCount) > 2 ||
                Number(row.globalUnpaidInstallmentCount) > 2 ||
                Number(row.rejectedBillingCount) > 2;
              const accountPaymentDelinquent =
                showAccountActions &&
                Number(row.bootcampMaxCompletedPct) >= 90 &&
                paymentStress;
              const highChanceLikelyPayer =
                highlightRecentLikelyPayers && (!!row.recentLearningActivity || !!row.paidPreviousMonth);
              const rowTitleParts = [];
              if (atRiskDeregistration) {
                rowTitleParts.push(
                  `At risk of de-registration (${row.rejectedBillingCount} failed payments)`
                );
              }
              if (accountPaymentDelinquent) {
                rowTitleParts.push(
                  `Bootcamp ~${row.bootcampMaxCompletedPct}% complete — payment stress: ${row.globalUnpaidInstallmentCount ?? 0} unpaid on plan(s), ${row.pendingInstallmentCount ?? 0} unpaid in this period, ${row.rejectedBillingCount ?? 0} rejected billing rows.`
                );
              }
              if (highChanceLikelyPayer) {
                rowTitleParts.push(
                  `High chance payer: ${
                    row.recentLearningActivity
                      ? `recent learner activity (~1.5 weeks, ${formatDate(row.recentLearningActivityAt)})`
                      : ""
                  }${row.recentLearningActivity && row.paidPreviousMonth ? " + " : ""}${
                    row.paidPreviousMonth ? "paid in previous month" : ""
                  }.`
                );
              }
              return (
              <tr
                key={`${row.userId}-${row.keySuffix}-${idx}`}
                title={rowTitleParts.length ? rowTitleParts.join(" · ") : undefined}
                className={`border-b border-white/5 ${
                  accountPaymentDelinquent
                    ? `animate-pulse ring-2 ring-inset ring-amber-400/55 ${
                        atRiskDeregistration
                          ? "bg-red-500/10 hover:bg-red-500/[0.14]"
                          : "bg-amber-500/12 hover:bg-amber-500/[0.16]"
                      }`
                    : atRiskDeregistration
                      ? "bg-red-500/10 hover:bg-red-500/[0.14]"
                      : highChanceLikelyPayer
                        ? "bg-yellow-500/10 hover:bg-yellow-500/[0.16]"
                      : "hover:bg-white/[0.04]"
                }`}
              >
                <td className="px-3 py-2 whitespace-nowrap">{row.username || "—"}</td>
                <td className="px-3 py-2 max-w-[220px]">
                  <CopyableEmailCell email={row.email} textClassName="text-xs" />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{row.studentNumber || "—"}</td>
                <td className="px-3 py-2 max-w-[160px] truncate" title={row.planName}>
                  {row.planName || row.planCode}
                </td>
                <td className="px-3 py-2 max-w-[140px] text-gray-400 truncate" title={row.ocCohortNames || ""}>
                  {row.ocCohortNames || "—"}
                </td>
                <td className="px-3 py-2">{row.installmentNumber}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.dueDate)}</td>
                <td className="px-3 py-2 capitalize">{row.paymentMethod}</td>
                <td className="px-3 py-2 whitespace-nowrap">{centsToZAR(row.amount)}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      row.status === "paid"
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {row.status}
                  </span>
                </td>
                {showAccountActions && (
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1 min-w-[108px]">
                      <span
                        className={`inline-flex w-fit px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          row.accBlocked ? "bg-red-500/25 text-red-300" : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {row.accBlocked ? "Blocked" : "Active"}
                      </span>
                      <button
                        type="button"
                        disabled={blockLoadingUserId === row.userId || !onBlockToggle}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBlockToggle?.(row.userId, !!row.accBlocked);
                        }}
                        title={blockLoadingUserId === row.userId ? "Saving…" : undefined}
                        className="text-left text-[10px] text-cyan-400 hover:text-cyan-300 disabled:opacity-40 underline-offset-2 hover:underline"
                      >
                        {row.accBlocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                  </td>
                )}
                <td className="px-3 py-2 whitespace-nowrap text-gray-400">
                  {formatDate(row.paidAt)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <input
                    type="checkbox"
                    checked={!!row.excludeFromFinanceReports}
                    disabled={savingUserId === row.userId}
                    onChange={(e) => onToggleTest(row.userId, e.target.checked)}
                    title="Exclude from Finance reports (test / demo)"
                    className="rounded border-white/30 bg-white/10 cursor-pointer disabled:opacity-50"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link
                    to={`/student-profile/${row.userId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Profile
                  </Link>
                </td>
              </tr>
              );
            })
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t border-white/20 bg-white/[0.06]">
              <td colSpan={8} className="px-3 py-2 text-right font-medium text-gray-400">
                Total (this view)
              </td>
              <td className="px-3 py-2 whitespace-nowrap font-semibold text-emerald-300/95 tabular-nums">
                {centsToZAR(sumRowAmountsCents(rows))}
              </td>
              {highlightRecentLikelyPayers && (
                <>
                  <td
                    colSpan={showAccountActions ? 2 : 1}
                    className="px-3 py-2 text-right font-medium text-yellow-300/90 whitespace-nowrap"
                    title="Rows highlighted yellow as recent learner activity in the last ~1.5 weeks"
                  >
                    High chance to pay total
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold text-yellow-300 tabular-nums">
                    {centsToZAR(sumHighChanceToPayAmountsCents(rows))}
                  </td>
                </>
              )}
              <td
                colSpan={highlightRecentLikelyPayers ? 2 : showAccountActions ? 5 : 4}
                className="px-3 py-2"
              />
            </tr>
          </tfoot>
        )}
      </table>
      {footerCaption && (
        <p className="px-4 py-2 text-[10px] text-gray-500 border-t border-white/5 leading-relaxed">{footerCaption}</p>
      )}
    </div>
  </div>
);

function flattenUsers(users) {
  const rows = [];
  for (const u of users || []) {
    for (const inst of u.installments || []) {
      rows.push({
        userId: u.userId,
        username: u.username,
        email: u.email,
        studentNumber: u.studentNumber,
        ocCohortNames: u.ocCohortNames || "",
        rejectedBillingCount: Number(u.rejectedBillingCount) || 0,
        bootcampMaxCompletedPct: Number(u.bootcampMaxCompletedPct) || 0,
        pendingInstallmentCount: Number(u.pendingInstallmentCount) || 0,
        globalUnpaidInstallmentCount: Number(u.globalUnpaidInstallmentCount) || 0,
        recentLearningActivity: !!u.recentLearningActivity,
        recentLearningActivityAt: u.recentLearningActivityAt || null,
        paidPreviousMonth: !!u.paidPreviousMonth,
        excludeFromFinanceReports: !!u.excludeFromFinanceReports,
        accBlocked: !!u.accBlocked,
        planCode: inst.planCode,
        planName: inst.planName,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        paymentMethod: inst.paymentMethod,
        amount: inst.amount,
        status: inst.status,
        paidAt: inst.paidAt,
        keySuffix: `${inst.planCode}-${inst.installmentNumber}`,
      });
    }
  }
  return rows;
}

const Finance = () => {
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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  /** Shown under spinner while async finance job is building (Heroku-safe polling). */
  const [financeLoadHint, setFinanceLoadHint] = useState("");
  /** When true, include students marked as test / excluded from Finance */
  const [includeExcluded, setIncludeExcluded] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [blockLoadingUserId, setBlockLoadingUserId] = useState(null);
  /** upcoming | paid | unpaid */
  const [financeTab, setFinanceTab] = useState("upcoming");
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [attentionStudents, setAttentionStudents] = useState([]);
  const [attentionError, setAttentionError] = useState(null);
  /** EFT proof submissions pending approval (loaded with Finance summary) */
  const [eftPending, setEftPending] = useState([]);
  const [eftActionKey, setEftActionKey] = useState(null);
  const [allMonthsCollectedSeries, setAllMonthsCollectedSeries] = useState([]);
  const [allMonthsCollectedLoading, setAllMonthsCollectedLoading] = useState(false);
  /** Incremented when main Apply/load finishes so the 12-month chart loads after (never 12× parallel with primary summary). */
  const [financeMainLoadId, setFinanceMainLoadId] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFinanceLoadHint("");
    let params = {};
    if (mode === "month") {
      const [y, m] = monthValue.split("-").map((x) => parseInt(x, 10));
      if (!y || !m) {
        setError("Pick a valid month");
        setLoading(false);
        return;
      }
      params = { year: y, month: m };
    } else {
      if (!rangeStart || !rangeEnd) {
        setError("Start and end dates required");
        setLoading(false);
        return;
      }
      const a = new Date(rangeStart);
      const b = new Date(rangeEnd);
      if (a > b) {
        setError("Start date must be before end date");
        setLoading(false);
        return;
      }
      params = { start: rangeStart, end: rangeEnd };
    }
    if (includeExcluded) params.includeExcluded = true;
    let pollHintSet = false;
    const [summaryRes, eftRes] = await Promise.all([
      getFinanceSummaryWithPolling(params, {
        onPoll: () => {
          if (!pollHintSet) {
            pollHintSet = true;
            setFinanceLoadHint(
              "Building the finance report… This can take a few minutes on Heroku (short requests avoid gateway timeouts)."
            );
          }
        },
      }),
      getFinancePendingEftSubmissions({ includeExcluded }),
    ]);
    if (!summaryRes?.success) {
      setError(summaryRes?.message || "Failed to load");
      setData(null);
    } else {
      setData(summaryRes);
    }
    if (eftRes?.success && Array.isArray(eftRes.submissions)) {
      setEftPending(eftRes.submissions);
    } else {
      setEftPending([]);
    }
    setFinanceLoadHint("");
    setLoading(false);
    setFinanceMainLoadId((x) => x + 1);
  }, [mode, monthValue, rangeStart, rangeEnd, includeExcluded]);

  const handleTableToggleTest = async (userId, checked) => {
    setSavingUserId(userId);
    try {
      await updateStudentFinanceExclude(userId, checked);
    } finally {
      await load();
      setSavingUserId(null);
    }
  };

  const handleBlockToggle = async (userId, currentlyBlocked) => {
    const nextBlocked = !currentlyBlocked;
    setData((prev) => {
      if (!prev) return prev;
      const patchUser = (u) =>
        String(u.userId) === String(userId) ? { ...u, accBlocked: nextBlocked } : u;
      return {
        ...prev,
        upcoming: (prev.upcoming || []).map(patchUser),
        paid: (prev.paid || []).map(patchUser),
        unpaid: (prev.unpaid || []).map(patchUser),
      };
    });
    setBlockLoadingUserId(userId);
    try {
      if (currentlyBlocked) {
        await unblockUser({ userid: userId });
      } else {
        await blockUser({ userid: userId });
      }
    } catch (e) {
      console.error(e);
      setData((prev) => {
        if (!prev) return prev;
        const revert = (u) =>
          String(u.userId) === String(userId) ? { ...u, accBlocked: currentlyBlocked } : u;
        return {
          ...prev,
          upcoming: (prev.upcoming || []).map(revert),
          paid: (prev.paid || []).map(revert),
          unpaid: (prev.unpaid || []).map(revert),
        };
      });
    } finally {
      setBlockLoadingUserId(null);
    }
  };

  const handleEftViewProof = async (userId, submissionId) => {
    setEftActionKey(`proof-${submissionId}`);
    const res = await getEftSubmissionProofUrl(userId, submissionId);
    setEftActionKey(null);
    if (res.success && res.data?.url) window.open(res.data.url, "_blank", "noopener,noreferrer");
    else alert(res.message || "Could not open proof");
  };

  const handleEftApprove = async (userId, submissionId) => {
    setEftActionKey(`app-${submissionId}`);
    const res = await approveEftSubmission(userId, submissionId);
    setEftActionKey(null);
    if (res.success) await load();
    else alert(res.message || "Approve failed");
  };

  const handleEftReject = async (userId, submissionId) => {
    const reason = window.prompt("Rejection reason (optional):", "");
    if (reason === null) return;
    setEftActionKey(`rej-${submissionId}`);
    const res = await rejectEftSubmission(userId, submissionId, reason);
    setEftActionKey(null);
    if (res.success) await load();
    else alert(res.message || "Reject failed");
  };

  const openAttentionModal = async () => {
    setAttentionOpen(true);
    setAttentionLoading(true);
    setAttentionStudents([]);
    setAttentionError(null);
    const res = await getFinanceAttentionRejected({ includeExcluded });
    setAttentionLoading(false);
    if (res?.success) {
      setAttentionStudents(res.students || []);
    } else {
      setAttentionError(res?.message || "Failed to load list");
    }
  };

  useEffect(() => {
    load();
    // Refetch when toggling test/excluded accounts; date changes use Apply
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeExcluded]);

  useEffect(() => {
    if (financeMainLoadId === 0) return;
    let cancelled = false;
    const loadAllMonthsCollected = async () => {
      setAllMonthsCollectedLoading(true);
      setAllMonthsCollectedSeries([]);
      const months = getRollingMonths(12);
      const CHART_CONCURRENCY = 2;
      try {
        const series = await mapPool(months, CHART_CONCURRENCY, async (m) => {
          const res = await getFinanceSummary({ year: m.year, month: m.month, includeExcluded });
          if (cancelled) return { monthKey: m.monthKey, collectedCents: 0 };
          return {
            monthKey: m.monthKey,
            collectedCents:
              res?.success && Number.isFinite(Number(res?.stats?.amounts?.collectedCents))
                ? Number(res.stats.amounts.collectedCents)
                : 0,
          };
        });
        if (!cancelled) setAllMonthsCollectedSeries(series);
      } finally {
        if (!cancelled) setAllMonthsCollectedLoading(false);
      }
    };
    loadAllMonthsCollected();
    return () => {
      cancelled = true;
    };
  }, [includeExcluded, financeMainLoadId]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!FINANCE_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const stats = data?.stats;
  const upcomingRows = flattenUsers(data?.upcoming ?? []);
  const paidRows = flattenUsers(data?.paid);
  const unpaidRows = flattenUsers(data?.unpaid);
  const allMonthsCollectedChartData = {
    labels: allMonthsCollectedSeries.map((item) => formatMonthLabel(item.monthKey)),
    datasets: [
      {
        label: "Collected",
        data: allMonthsCollectedSeries.map((item) => Number((item.collectedCents / 100).toFixed(2))),
        borderColor: "rgba(16, 185, 129, 1)",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 5,
        pointBackgroundColor: "rgba(16, 185, 129, 1)",
        tension: 0.3,
        fill: false,
      },
    ],
  };
  const allMonthsCollectedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#e5e7eb" },
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: R ${Number(ctx.parsed.y || 0).toLocaleString("en-ZA", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#9ca3af" },
        grid: { color: "rgba(255,255,255,0.08)" },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#9ca3af",
          callback: (value) => `R ${Number(value).toLocaleString("en-ZA")}`,
        },
        grid: { color: "rgba(255,255,255,0.08)" },
      },
    },
  };

  /** Collected = paid lines across all three tabs (matches backend collectedCents). */
  const collectedSlicePaidTab = sumRowAmountsCents(paidRows);
  const collectedSliceOutstandingPaid = sumPaidRowAmountsCents(unpaidRows);
  const collectedSliceUpcomingPaid = sumPaidRowAmountsCents(upcomingRows);
  const collectedFromTabsSum =
    collectedSlicePaidTab + collectedSliceOutstandingPaid + collectedSliceUpcomingPaid;

  /** Still to collect = pending lines across all three tabs (matches backend stillToCollectCents). */
  const pendingSlicePaidTab = sumPendingRowAmountsCents(paidRows);
  const pendingSliceOutstanding = sumPendingRowAmountsCents(unpaidRows);
  const pendingSliceUpcoming = sumPendingRowAmountsCents(upcomingRows);
  const pendingFromTabsSum = pendingSlicePaidTab + pendingSliceOutstanding + pendingSliceUpcoming;
  const possibleCollectableCents =
    sumHighChanceToPayAmountsCents(paidRows) +
    sumHighChanceToPayAmountsCents(unpaidRows) +
    sumHighChanceToPayAmountsCents(upcomingRows);
  const likelyLeftAfterPossibleCents = Math.max(
    0,
    Number(stats?.amounts?.stillToCollectCents ?? 0) - possibleCollectableCents
  );

  const scheduledInPeriodCents = stats?.amounts?.scheduledInPeriodCents ?? 0;
  const collectedForRateCents = stats?.amounts?.collectedCents ?? 0;
  const collectionRatePercent =
    scheduledInPeriodCents > 0 ? (collectedForRateCents / scheduledInPeriodCents) * 100 : null;

  return (
    <div className="px-6 lg:px-12 py-8 max-w-[1600px] mx-auto text-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap gap-3 mb-1.5">
            <Link to="/" className="text-xs text-blue-400 hover:text-blue-300">
              ← Back to dashboard
            </Link>
            <Link to="/roster-payment-check" className="text-xs text-violet-400 hover:text-violet-300">
              Roster vs payment plans
            </Link>
            <Link to="/roster-tasks" className="text-xs text-amber-400/90 hover:text-amber-300">
              Saved roster tasks
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Finance</h1>
          <p className="text-gray-400 mt-1 text-xs max-w-3xl leading-relaxed">
            <strong className="text-gray-300">Custom plans</strong>, <strong className="text-gray-300">2-installment EFT</strong>, and{" "}
            <strong className="text-gray-300">standalone Paystack subscriptions</strong> (linked in Student plan with a
            subscription code) — not total enrollment. Only lines with a <strong className="text-gray-300">due date in the range</strong>{" "}
            you pick appear (for subscriptions: successful charges in the range, or the next debit if it falls in the range). Use
            the Test column or student profile to exclude demos; hidden unless you enable &quot;Include test…&quot; below.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={openAttentionModal}
            className="px-4 py-2 rounded-lg border border-amber-500/50 bg-amber-500/15 text-amber-100 text-sm font-semibold hover:bg-amber-500/25 transition-colors"
          >
            Attention
          </button>
          <p className="text-[10px] text-gray-500 max-w-[200px] text-right leading-snug">
            Students with 2+ rejected payment records (failed charges in billing).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-3 mb-6 text-[11px] text-cyan-100/90 leading-relaxed max-w-4xl">
        <p className="font-medium text-cyan-200/95 mb-1">Why you might see far fewer people than enrolled students</p>
        <p className="text-gray-300/95">
          This page does <strong className="text-white">not</strong> list everyone on your roster. It includes{" "}
          <strong className="text-white">custom plans</strong>, <strong className="text-white">2-installment EFT</strong>, and{" "}
          <strong className="text-white">standalone Paystack subscriptions</strong> (Student plan row with a subscription code, not
          tied to a custom or 2-installment plan). Other billing or enrollments without those records still won&apos;t appear. In
          the month you select, only rows whose <strong className="text-white">due date falls in that calendar month</strong> count
          (subscription charges use the payment date, or the next debit from Paystack when it falls in range).
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 p-4 mb-6 bg-gradient-to-r from-emerald-600/10 to-blue-600/10">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Filter</label>
            <div className="flex rounded-lg overflow-hidden border border-white/20">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs ${mode === "month" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300"}`}
                onClick={() => setMode("month")}
              >
                Month
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs ${mode === "range" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-300"}`}
                onClick={() => setMode("range")}
              >
                Date range
              </button>
            </div>
          </div>
          {mode === "month" ? (
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Month</label>
              <input
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white"
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50"
          >
            Apply
          </button>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 max-w-md">
            <input
              type="checkbox"
              checked={includeExcluded}
              onChange={(e) => setIncludeExcluded(e.target.checked)}
              className="rounded border-white/30 bg-white/10"
            />
            <span>Include test / excluded accounts (profile or table)</span>
          </label>
        </div>
        {data?.range && (
          <p className="text-xs text-gray-400 mt-3">
            Range: {formatDate(data.range.start)} — {formatDate(data.range.end)}
            {data.filters?.excludingTestAccounts && !includeExcluded && (
              <span className="block mt-1 text-emerald-400/90">
                Test-marked students are excluded from these figures.
              </span>
            )}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader />
          {financeLoadHint && (
            <p className="text-xs text-gray-400 max-w-lg text-center leading-relaxed">{financeLoadHint}</p>
          )}
        </div>
      )}

      {!loading && (
        <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-950/20 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03]">
            <h2 className="text-sm font-semibold text-white">
              EFT proof — pending approval
              {eftPending.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full bg-fuchsia-600/40 text-fuchsia-100 text-xs font-bold">
                  {eftPending.length}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Student-uploaded bank transfer proofs (custom / 2-installment EFT plans). Approve to record payment on billing, or
              reject with a reason. Same &quot;Include test…&quot; filter as above applies.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Student #</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Inst.</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Payment date</th>
                  <th className="px-3 py-2 font-medium">Submitted</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {eftPending.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                      No EFT submissions waiting for approval.
                    </td>
                  </tr>
                ) : (
                  eftPending.map((row) => {
                    const key = row.submissionId;
                    return (
                      <tr key={key} className="border-b border-white/5 hover:bg-white/[0.04]">
                        <td className="px-3 py-2 whitespace-nowrap">{row.username || "—"}</td>
                        <td className="px-3 py-2 max-w-[200px]">
                          <CopyableEmailCell email={row.email} textClassName="text-xs" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.studentNumber || "—"}</td>
                        <td className="px-3 py-2 max-w-[160px] truncate" title={row.planName}>
                          {row.planName || row.planCode}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.installmentNumber != null ? row.installmentNumber : "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{centsToZAR(row.amount)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-400">{formatDate(row.paymentDate)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-400">{formatDate(row.createdAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEftViewProof(row.userId, row.submissionId)}
                              disabled={!!eftActionKey}
                              className="text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
                            >
                              {eftActionKey === `proof-${row.submissionId}` ? "…" : "Proof"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEftApprove(row.userId, row.submissionId)}
                              disabled={!!eftActionKey}
                              className="text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                            >
                              {eftActionKey === `app-${row.submissionId}` ? "…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEftReject(row.userId, row.submissionId)}
                              disabled={!!eftActionKey}
                              className="text-rose-400 hover:text-rose-300 disabled:opacity-40"
                            >
                              {eftActionKey === `rej-${row.submissionId}` ? "…" : "Reject"}
                            </button>
                            <Link
                              to={`/student-profile/${row.userId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Profile
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && stats && (
        <>
          {stats.amounts && (
            <div className="rounded-2xl border border-white/10 p-4 mb-6 bg-gradient-to-r from-emerald-900/25 to-amber-900/20">
              <p className="text-xs font-medium text-white mb-0.5">Money for this period</p>
              <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                Sums all installments whose <strong className="text-gray-300">due date</strong> falls in the range above
                (same rows as the tables). Collected = marked paid; still to collect = pending.{" "}
                <strong className="text-gray-300">Collection rate</strong> is collected ÷ total scheduled for this period.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl bg-black/20 p-3 border border-emerald-500/20">
                  <p className="text-[11px] text-gray-400">Collected</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-0.5">{centsToZAR(stats.amounts.collectedCents)}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Sum of paid installments (all tabs)</p>
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-1 text-[10px] text-gray-500 leading-relaxed">
                    <p className="text-gray-400 font-medium">Where that money appears</p>
                    <p>
                      Paid-in-full tab:{" "}
                      <span className="text-emerald-400/90 tabular-nums">{centsToZAR(collectedSlicePaidTab)}</span>
                    </p>
                    <p>
                      Outstanding tab (paid lines only):{" "}
                      <span className="text-emerald-400/90 tabular-nums">
                        {centsToZAR(collectedSliceOutstandingPaid)}
                      </span>
                    </p>
                    {collectedSliceUpcomingPaid > 0 && (
                      <p>
                        Upcoming tab (paid):{" "}
                        <span className="text-emerald-400/90 tabular-nums">
                          {centsToZAR(collectedSliceUpcomingPaid)}
                        </span>
                      </p>
                    )}
                    <p className="text-gray-500 pt-0.5">
                      These three slices add up to <strong className="text-gray-400">Collected</strong> — the Paid-in-full
                      table footer is only the first slice.
                    </p>
                    {stats.amounts.collectedCents !== collectedFromTabsSum && (
                      <p className="text-amber-400/90 text-[10px]">
                        Note: tab sum {centsToZAR(collectedFromTabsSum)} — refresh if this differs from Collected.
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-black/20 p-3 border border-amber-500/20">
                  <p className="text-[11px] text-gray-400">Still to collect</p>
                  <p className="text-2xl font-bold text-amber-400 mt-0.5">{centsToZAR(stats.amounts.stillToCollectCents)}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Sum of pending installments (all tabs)</p>
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-1 text-[10px] leading-relaxed">
                    <p className="text-yellow-300/90">
                      Still possibly collectable:{" "}
                      <span className="font-semibold tabular-nums">{centsToZAR(possibleCollectableCents)}</span>
                    </p>
                    <p className="text-gray-400">
                      Likely left to collect after that:{" "}
                      <span className="font-semibold tabular-nums">{centsToZAR(likelyLeftAfterPossibleCents)}</span>
                    </p>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 space-y-1 text-[10px] text-gray-500 leading-relaxed">
                    <p className="text-gray-400 font-medium">Where that amount sits</p>
                    <p>
                      Paid-in-full tab:{" "}
                      <span className="text-amber-400/90 tabular-nums">{centsToZAR(pendingSlicePaidTab)}</span>
                      {pendingSlicePaidTab === 0 && (
                        <span className="text-gray-600"> (no pending lines — everyone here is paid)</span>
                      )}
                    </p>
                    <p>
                      Outstanding tab (pending lines only):{" "}
                      <span className="text-amber-400/90 tabular-nums">{centsToZAR(pendingSliceOutstanding)}</span>
                    </p>
                    <p>
                      Upcoming tab (pending):{" "}
                      <span className="text-amber-400/90 tabular-nums">{centsToZAR(pendingSliceUpcoming)}</span>
                    </p>
                    <p className="text-gray-500 pt-0.5">
                      These three slices add up to <strong className="text-gray-400">Still to collect</strong> — the
                      Outstanding table footer includes both paid and pending lines; only pending counts here.
                    </p>
                    {stats.amounts.stillToCollectCents !== pendingFromTabsSum && (
                      <p className="text-amber-400/90 text-[10px]">
                        Note: tab sum {centsToZAR(pendingFromTabsSum)} — refresh if this differs from Still to collect.
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-black/20 p-3 border border-white/10">
                  <p className="text-[11px] text-gray-400">Total scheduled</p>
                  <p className="text-2xl font-bold text-white mt-0.5">{centsToZAR(stats.amounts.scheduledInPeriodCents)}</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Collected + still to collect
                  </p>
                </div>
                <div className="rounded-xl bg-black/20 p-3 border border-sky-500/25">
                  <p className="text-[11px] text-gray-400">Collection rate</p>
                  <p className="text-2xl font-bold text-sky-300 mt-0.5 tabular-nums">
                    {collectionRatePercent != null
                      ? `${collectionRatePercent.toLocaleString("en-ZA", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}%`
                      : "—"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    {scheduledInPeriodCents > 0 ? (
                      <>
                        <span className="text-emerald-400/90 tabular-nums">{centsToZAR(collectedForRateCents)}</span>
                        {" collected of "}
                        <span className="text-white/90 tabular-nums">{centsToZAR(scheduledInPeriodCents)}</span>
                        {" due in range"}
                      </>
                    ) : (
                      "No scheduled installment amounts in this range."
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 p-4 mb-6 bg-white/[0.03]">
            <p className="text-sm font-semibold text-white mb-1">Money collected of all months</p>
            <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
              Rolling 12-month line graph of collected amounts. Loads after the main summary above (fetched a few months at a
              time so the page doesn’t run 12 full reports in parallel).
            </p>
            {allMonthsCollectedLoading ? (
              <p className="text-xs text-gray-500">Loading monthly collected trend…</p>
            ) : allMonthsCollectedSeries.length > 0 ? (
              <div className="h-[300px]">
                <Line data={allMonthsCollectedChartData} options={allMonthsCollectedChartOptions} />
              </div>
            ) : (
              <p className="text-xs text-gray-500">No monthly collected data available.</p>
            )}
          </div>

          <div className="rounded-xl border border-white/15 p-3 mb-6 bg-white/[0.02] text-[11px] text-gray-400 leading-relaxed">
            <p className="font-medium text-gray-300 mb-1.5">Why totals can look different</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-gray-300">Scope</strong> is not &quot;all students&quot;. Includes{" "}
                <strong className="text-gray-300">custom plans</strong>, <strong className="text-gray-300">2-installment EFT</strong>, and{" "}
                <strong className="text-gray-300">standalone Paystack subscriptions</strong> (Student plan + subscription code, not
                linked to custom/2-installment rows), with lines in the selected range. Enrollment counts elsewhere include many
                more students.
              </li>
              <li>
                <strong className="text-gray-300">People</strong> counts unique students.{" "}
                <strong className="text-gray-300">Installments</strong> counts each payment line — some students have
                more than one due in the same month (e.g. 54 people vs 57 lines).
              </li>
              <li>
                <strong className="text-gray-300">Total scheduled</strong> (Collected + Still to collect) equals the sum of
                the <strong className="text-gray-300">three tab footers</strong> — each footer totals every row in that tab
                (paid and pending).
              </li>
              <li>
                <strong className="text-gray-300">Collected</strong> counts only paid amounts. It is split across tabs: the
                Paid-in-full footer <strong className="text-gray-300">plus</strong> paid lines in Outstanding{" "}
                <strong className="text-gray-300">plus</strong> any paid lines in Upcoming. So the top “Collected” figure
                will not match the Paid-in-full tab footer alone if Outstanding students also paid some lines.
              </li>
              <li>
                Each tab’s table lists <strong className="text-gray-300">installment rows</strong>, not one row per person —
                so you may see more lines than the “people” count on the tab.
              </li>
              <li>
                With “Include test…” <strong className="text-gray-300">off</strong>, test-marked students are excluded from
                these figures.
              </li>
              <li>
                Paystack subscriptions only appear when there is a <strong className="text-gray-300">Student plan</strong> row with a{" "}
                <strong className="text-gray-300">subscription code</strong> and no custom/2-installment link — plus matching{" "}
                <strong className="text-gray-300">billing records</strong> (paid) or an active subscription with{" "}
                <strong className="text-gray-300">next_payment_date</strong> in range (pending). Subscriptions never linked in Zaio
                still won&apos;t show.
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="rounded-xl border border-white/10 p-3 bg-white/[0.04]">
              <p className="text-[11px] text-gray-400">Due this period (people)</p>
              <p className="text-2xl font-bold text-white mt-0.5">{stats.peopleWithPaymentDue}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                At least one installment due in range
              </p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 p-3 bg-cyan-500/5">
              <p className="text-[11px] text-gray-400">Upcoming (people)</p>
              <p className="text-2xl font-bold text-cyan-300 mt-0.5">{stats.peopleWithUpcoming ?? 0}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Due date is still in the future
              </p>
            </div>
            <div className="rounded-xl border border-white/10 p-3 bg-white/[0.04]">
              <p className="text-[11px] text-gray-400">Paid in full (past-due)</p>
              <p className="text-2xl font-bold text-emerald-400 mt-0.5">{stats.peoplePaidInFull}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                All installments due on or before today are paid
              </p>
            </div>
            <div className="rounded-xl border border-white/10 p-3 bg-white/[0.04]">
              <p className="text-[11px] text-gray-400">Outstanding (past-due)</p>
              <p className="text-2xl font-bold text-amber-400 mt-0.5">{stats.peopleWithOutstanding}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                At least one past-due installment still pending
              </p>
            </div>
            <div className="rounded-xl border border-white/10 p-3 bg-white/[0.04]">
              <p className="text-[11px] text-gray-400">Installments</p>
              <p className="text-xs text-cyan-200 mt-1.5">
                Upcoming: <span className="font-semibold">{stats.installmentsUpcoming ?? 0}</span>
              </p>
              <p className="text-xs text-white mt-0.5">
                Past due:{" "}
                <span className="text-emerald-400">{stats.installmentsPaid ?? 0}</span>
                <span className="text-gray-500"> paid · </span>
                <span className="text-amber-400">{stats.installmentsPending ?? 0}</span>
                <span className="text-gray-500"> pending</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Total lines in range: {stats.installmentsDue} (can exceed people if some have multiple)
              </p>
            </div>
          </div>

          {stats.byMethod && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-white/10 p-3 bg-white/[0.03]">
                <p className="text-xs font-medium text-white mb-1.5">Paystack</p>
                <p className="text-gray-400 text-xs mb-1">
                  Upcoming (future due):{" "}
                  <span className="text-cyan-300">{stats.byMethod.upcoming?.paystack ?? 0}</span>
                </p>
                <p className="text-gray-400 text-xs">
                  Past due — Due: {stats.byMethod.paystack?.due ?? 0} · Paid:{" "}
                  <span className="text-emerald-400">{stats.byMethod.paystack?.paid ?? 0}</span> · Pending:{" "}
                  <span className="text-amber-400">{stats.byMethod.paystack?.pending ?? 0}</span>
                </p>
              </div>
              <div className="rounded-xl border border-white/10 p-3 bg-white/[0.03]">
                <p className="text-xs font-medium text-white mb-1.5">EFT</p>
                <p className="text-gray-400 text-xs mb-1">
                  Upcoming (future due):{" "}
                  <span className="text-cyan-300">{stats.byMethod.upcoming?.eft ?? 0}</span>
                </p>
                <p className="text-gray-400 text-xs">
                  Past due — Due: {stats.byMethod.eft?.due ?? 0} · Paid:{" "}
                  <span className="text-emerald-400">{stats.byMethod.eft?.paid ?? 0}</span> · Pending:{" "}
                  <span className="text-amber-400">{stats.byMethod.eft?.pending ?? 0}</span>
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]">
            <div
              className="flex flex-wrap border-b border-white/10 bg-white/[0.02]"
              role="tablist"
              aria-label="Installment views"
            >
              {[
                {
                  id: "upcoming",
                  label: "Upcoming",
                  people: data.upcoming?.length ?? 0,
                  rowCount: upcomingRows.length,
                },
                {
                  id: "paid",
                  label: "Paid in full",
                  people: data.paid?.length ?? 0,
                  rowCount: paidRows.length,
                },
                {
                  id: "unpaid",
                  label: "Outstanding",
                  people: data.unpaid?.length ?? 0,
                  rowCount: unpaidRows.length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={financeTab === tab.id}
                  onClick={() => setFinanceTab(tab.id)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors text-left ${
                    financeTab === tab.id
                      ? "border-cyan-400 text-white bg-white/[0.06]"
                      : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="block">{tab.label}</span>
                  <span className="block text-[11px] font-normal text-gray-500 mt-0.5 leading-snug">
                    {tab.people} people · {tab.rowCount} installment lines
                  </span>
                </button>
              ))}
            </div>

            {financeTab === "upcoming" && (
              <InstallmentTable
                embedded
                title={`Upcoming — ${data.upcoming?.length ?? 0} people · ${upcomingRows.length} installment lines`}
                description="Due dates in this period that are still in the future (after today). Each line is one installment."
                emptyMessage="No installments in this period with a due date still in the future."
                rows={upcomingRows}
                onToggleTest={handleTableToggleTest}
                savingUserId={savingUserId}
                highlightRecentLikelyPayers
              />
            )}
            {financeTab === "paid" && (
              <InstallmentTable
                embedded
                title={`Paid in full — ${data.paid?.length ?? 0} people · ${paidRows.length} installment lines`}
                description="Students who had past-due installments in this period and paid all of them. Each row is one past-due installment."
                emptyMessage="No one in this period matches “paid in full” for past-due installments, or data is empty."
                footerCaption="This footer is only payments for students who cleared all past-due lines in the period. Collected (above) also includes paid lines from the Outstanding tab."
                rows={paidRows}
                onToggleTest={handleTableToggleTest}
                savingUserId={savingUserId}
              />
            )}
            {financeTab === "unpaid" && (
              <InstallmentTable
                embedded
                title={`Outstanding — ${data.unpaid?.length ?? 0} people · ${unpaidRows.length} installment lines`}
                description="Students with at least one past-due installment still pending. Each row is one installment line (a student may have several)."
                emptyMessage="No past-due installments still pending in this period."
                rows={unpaidRows}
                onToggleTest={handleTableToggleTest}
                savingUserId={savingUserId}
                showAccountActions
                onBlockToggle={handleBlockToggle}
                blockLoadingUserId={blockLoadingUserId}
                highlightRecentLikelyPayers
              />
            )}
          </div>
        </>
      )}

      {attentionOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finance-attention-title"
          onClick={() => setAttentionOpen(false)}
        >
          <div
            className="bg-gray-900 border border-white/15 rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div>
                <h2 id="finance-attention-title" className="text-lg font-semibold text-white">
                  Attention — 2+ rejected payments
                </h2>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  From billing: rows with status <span className="text-gray-300">rejected</span> (failed Paystack/EFT attempts). Uses the same
                  &quot;Include test / excluded&quot; checkbox as the table when you opened this list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttentionOpen(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none px-2 shrink-0"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1 min-h-0">
              {attentionLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader />
                </div>
              ) : attentionError ? (
                <p className="text-red-400 text-sm">{attentionError}</p>
              ) : attentionStudents.length === 0 ? (
                <p className="text-gray-400 text-sm">No students with 2 or more rejected billing records.</p>
              ) : (
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-400 border-b border-white/10">
                      <th className="px-3 py-2 font-medium">Student</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Student #</th>
                      <th className="px-3 py-2 font-medium text-right">Rejected</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {attentionStudents.map((s) => (
                      <tr key={s.userId || s.email} className="border-b border-white/5">
                        <td className="px-3 py-2 whitespace-nowrap">{s.username || "—"}</td>
                        <td className="px-3 py-2 max-w-[220px]">
                          <CopyableEmailCell email={s.email} textClassName="text-xs" />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{s.studentNumber || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-300/95">{s.rejectedCount}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {s.userId ? (
                            <Link
                              to={`/student-profile/${s.userId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Profile
                            </Link>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
