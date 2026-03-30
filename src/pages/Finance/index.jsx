import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getFinanceSummary, getFinanceAttentionRejected } from "../../api/company";
import { updateStudentFinanceExclude, blockUser, unblockUser } from "../../api/student";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import CopyableEmailCell from "../../components/CopyableEmailCell";

const FINANCE_ROLES = ["SUPER_STUDENT_ADMIN", "SUPER_ADMIN", "COMPANY_ADMIN"];

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
              <td colSpan={showAccountActions ? 13 : 12} className="px-3 py-6 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={`${row.userId}-${row.keySuffix}-${idx}`} className="border-b border-white/5 hover:bg-white/[0.04]">
                <td className="px-3 py-2 whitespace-nowrap">{row.username || "—"}</td>
                <td className="px-3 py-2 max-w-[220px]">
                  <CopyableEmailCell email={row.email} textClassName="text-xs" />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{row.studentNumber || "—"}</td>
                <td className="px-3 py-2 max-w-[160px] truncate" title={row.planName}>
                  {row.planName || row.planCode}
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
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t border-white/20 bg-white/[0.06]">
              <td colSpan={7} className="px-3 py-2 text-right font-medium text-gray-400">
                Total (this view)
              </td>
              <td className="px-3 py-2 whitespace-nowrap font-semibold text-emerald-300/95 tabular-nums">
                {centsToZAR(sumRowAmountsCents(rows))}
              </td>
              <td colSpan={showAccountActions ? 5 : 4} className="px-3 py-2" />
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    const res = await getFinanceSummary(params);
    if (!res?.success) {
      setError(res?.message || "Failed to load");
      setData(null);
    } else {
      setData(res);
    }
    setLoading(false);
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

      {loading && <Loader />}

      {!loading && stats && (
        <>
          {stats.amounts && (
            <div className="rounded-2xl border border-white/10 p-4 mb-6 bg-gradient-to-r from-emerald-900/25 to-amber-900/20">
              <p className="text-xs font-medium text-white mb-0.5">Money for this period</p>
              <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                Sums all installments whose <strong className="text-gray-300">due date</strong> falls in the range above
                (same rows as the tables). Collected = marked paid; still to collect = pending.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
            </div>
          )}

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
