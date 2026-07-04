import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  getAssessorEarningsFinanceSummary,
  recordAssessorEarningPayment,
  getAssessorPaymentsStatement,
  getAssessorEarningPaymentProofUrl,
  updateTeamMemberLinkedFinanceStaff,
} from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import CopyableEmailCell from "../../components/CopyableEmailCell";

const QCTO_PAYMENTS_ROLES = ["SUPER_STUDENT_ADMIN", "SUPER_ADMIN"];

function formatMonthValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatZarPlain(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
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

function buildPeriodParams(mode, monthValue, rangeStart, rangeEnd) {
  return mode === "month"
    ? { mode: "month", month: monthValue }
    : { mode: "range", rangeStart, rangeEnd };
}

function roleLabel(role) {
  if (role === "MODERATOR") return "Moderator";
  if (role === "ASSESSOR") return "Assessor";
  if (role === "ASSESSOR_MODERATOR") return "Assessor + Moderator";
  return role || "—";
}

const QCTOPayments = () => {
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
  const [error, setError] = useState(null);
  const [assessorEarnings, setAssessorEarnings] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amountZar: "",
    comments: "",
    paidAt: "",
    file: null,
    targetStaffId: "",
    targetRole: "",
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [statementModal, setStatementModal] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState(null);
  const [proofLoadingId, setProofLoadingId] = useState(null);
  const [linkModal, setLinkModal] = useState(null);
  const [linkSaving, setLinkSaving] = useState(false);

  const canAccess = QCTO_PAYMENTS_ROLES.includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params =
      mode === "month"
        ? { mode: "month", month: monthValue }
        : { mode: "range", rangeStart, rangeEnd };
    const res = await getAssessorEarningsFinanceSummary(params);
    if (!res?.success) {
      setError(res?.message || "Failed to load QCTO payments");
      setAssessorEarnings(null);
    } else {
      setAssessorEarnings(res.data || null);
    }
    setLoading(false);
  }, [mode, monthValue, rangeStart, rangeEnd]);

  useEffect(() => {
    if (canAccess) load();
  }, [canAccess, load]);

  const staffRows = assessorEarnings?.staff || assessorEarnings?.assessors || [];

  const linkableStaffOptions = useMemo(() => {
    if (!linkModal) return [];
    const linkedIds = new Set(
      staffRows
        .filter((row) => row.isFinanceGroup)
        .flatMap((row) => row.linkedStaffIds || [])
    );
    const targetRole = linkModal.role === "ASSESSOR" ? "MODERATOR" : "ASSESSOR";
    return staffRows
      .filter((row) => !row.isFinanceGroup && row.role === targetRole)
      .flatMap((row) =>
        (row.linkedAccounts?.length ? row.linkedAccounts : [{ staffId: row.staffId || row.assessorId, role: row.role, name: row.name, email: row.email }])
          .filter((acct) => acct.role === targetRole && !linkedIds.has(String(acct.staffId)))
      );
  }, [linkModal, staffRows]);

  const openPaymentModal = (row) => {
    const accounts = row.linkedAccounts?.length
      ? row.linkedAccounts
      : [{ staffId: row.staffId || row.assessorId, role: row.role, name: row.name }];
    const defaultAccount = accounts[0];
    setPaymentModal(row);
    setPaymentForm({
      amountZar: row.outstandingZar > 0 ? String(row.outstandingZar) : "",
      comments: "",
      paidAt: new Date().toISOString().slice(0, 10),
      file: null,
      targetStaffId: String(defaultAccount.staffId),
      targetRole: defaultAccount.role,
    });
  };

  const closePaymentModal = () => {
    setPaymentModal(null);
    setPaymentForm({
      amountZar: "",
      comments: "",
      paidAt: "",
      file: null,
      targetStaffId: "",
      targetRole: "",
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModal) return;
    const amount = Number(paymentForm.amountZar);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a valid payment amount");
      return;
    }
    const staffId = paymentForm.targetStaffId || paymentModal.assessorId;
    const role = paymentForm.targetRole || paymentModal.role;
    setPaymentSaving(true);
    const res = await recordAssessorEarningPayment(staffId, {
      amountZar: amount,
      comments: paymentForm.comments,
      paidAt: paymentForm.paidAt || undefined,
      file: paymentForm.file || undefined,
      role,
    });
    setPaymentSaving(false);
    if (!res?.success) {
      alert(res?.message || "Could not record payment");
      return;
    }
    closePaymentModal();
    await load();
  };

  const openStatement = async ({
    assessorId = null,
    assessorName = null,
    allTime = false,
    showPaymentRoles = false,
  } = {}) => {
    setStatementModal({
      title: assessorName ? `Payment statement — ${assessorName}` : "Payment statement — all QCTO staff",
      assessorId,
      allTime,
      showPaymentRoles,
    });
    setStatementLoading(true);
    setStatementError(null);
    const params = {
      ...buildPeriodParams(mode, monthValue, rangeStart, rangeEnd),
      ...(assessorId ? { assessorId } : {}),
      ...(allTime ? { allTime: true } : {}),
    };
    const res = await getAssessorPaymentsStatement(params);
    setStatementLoading(false);
    if (!res?.success) {
      setStatementError(res?.message || "Failed to load statement");
      setStatementModal((prev) => (prev ? { ...prev, data: null } : null));
      return;
    }
    setStatementModal((prev) => (prev ? { ...prev, data: res.data } : null));
  };

  const closeStatement = () => {
    setStatementModal(null);
    setStatementError(null);
  };

  const handleStatementProof = async (paymentId) => {
    setProofLoadingId(paymentId);
    const res = await getAssessorEarningPaymentProofUrl(paymentId);
    setProofLoadingId(null);
    if (res?.success && res.data?.url) {
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } else {
      alert(res?.message || "Could not open proof");
    }
  };

  const openLinkModal = (row) => {
    const account = row.linkedAccounts?.[0] || {
      staffId: row.staffId || row.assessorId,
      role: row.role,
      name: row.name,
    };
    setLinkModal({
      staffId: account.staffId,
      role: account.role,
      name: account.name,
      isFinanceGroup: row.isFinanceGroup,
    });
  };

  const closeLinkModal = () => setLinkModal(null);

  const handleLinkSubmit = async (linkedStaffId) => {
    if (!linkModal) return;
    setLinkSaving(true);
    const res = await updateTeamMemberLinkedFinanceStaff(linkModal.staffId, linkedStaffId);
    setLinkSaving(false);
    if (!res?.success) {
      alert(res?.message || "Could not update finance link");
      return;
    }
    closeLinkModal();
    await load();
  };

  const handleUnlink = async () => {
    if (!linkModal) return;
    if (!window.confirm(`Unlink finance accounts for ${linkModal.name}?`)) return;
    await handleLinkSubmit(null);
  };

  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  const paymentAccounts =
    paymentModal?.linkedAccounts?.length > 0
      ? paymentModal.linkedAccounts
      : paymentModal
        ? [{ staffId: paymentModal.staffId || paymentModal.assessorId, role: paymentModal.role, name: paymentModal.name }]
        : [];

  return (
    <div className="min-h-screen bg-[#0D1117] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/finance" className="text-xs text-gray-500 hover:text-gray-300">
              ← Finance
            </Link>
            <h1 className="text-2xl font-bold text-white mt-2">QCTO payments</h1>
            <p className="text-gray-400 text-sm mt-1 max-w-2xl">
              Assessor and moderator payouts from completed KM/PM work. Link accounts when the same person
              holds both roles — finance sees one combined balance; staff still see role-specific earnings.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#161B22] p-4 flex flex-wrap items-end gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                mode === "month" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-300"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setMode("range")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                mode === "range" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-300"
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
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => openStatement()}
            className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-600"
          >
            View statement
          </button>
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
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 overflow-hidden">
            {assessorEarnings?.totals && (
              <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-3 border-b border-white/10 text-xs">
                <div>
                  <p className="text-gray-500">Total earned</p>
                  <p className="text-emerald-400 font-semibold text-base">
                    {formatZarPlain(assessorEarnings.totals.totalEarnedZar)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Total paid</p>
                  <p className="text-white font-semibold text-base">
                    {formatZarPlain(assessorEarnings.totals.totalPaidZar)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Outstanding</p>
                  <p className="text-amber-400 font-semibold text-base">
                    {formatZarPlain(assessorEarnings.totals.outstandingZar)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Earned this period</p>
                  <p className="text-gray-200 font-semibold text-base">
                    {formatZarPlain(assessorEarnings.totals.periodEarnedZar)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Paid this period</p>
                  <p className="text-gray-200 font-semibold text-base">
                    {formatZarPlain(assessorEarnings.totals.periodPaidZar)}
                  </p>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium text-right">Rate/credit</th>
                    <th className="px-3 py-2 font-medium text-right">Total earned</th>
                    <th className="px-3 py-2 font-medium text-right">Total paid</th>
                    <th className="px-3 py-2 font-medium text-right">Outstanding</th>
                    <th className="px-3 py-2 font-medium text-right">Period earned</th>
                    <th className="px-3 py-2 font-medium text-right">Period paid</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {staffRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                        No assessors or moderators found.
                      </td>
                    </tr>
                  ) : (
                    staffRows.map((row) => (
                      <tr key={row.payeeId || row.assessorId} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-gray-400">
                          <div>{roleLabel(row.role)}</div>
                          {row.isFinanceGroup && (
                            <div className="text-[10px] text-cyan-500/80 mt-0.5">Linked accounts</div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-white">{row.name || "—"}</td>
                        <td className="px-3 py-2">
                          {(row.emails?.length ? row.emails : [row.email].filter(Boolean)).map((email) => (
                            <div key={email}>
                              <CopyableEmailCell email={email} />
                            </div>
                          ))}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {row.isFinanceGroup ? (
                            <div className="space-y-0.5">
                              {row.linkedAccounts.map((acct) => (
                                <div key={acct.staffId} className="text-[10px] text-gray-400">
                                  {roleLabel(acct.role)}:{" "}
                                  {acct.ratePerCredit != null ? formatZarPlain(acct.ratePerCredit) : "—"}
                                </div>
                              ))}
                            </div>
                          ) : row.ratePerCredit != null ? (
                            formatZarPlain(row.ratePerCredit)
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-400 tabular-nums">
                          {formatZarPlain(row.totalEarnedZar)}
                          {row.isFinanceGroup && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {row.linkedAccounts.map((acct) => (
                                <div key={acct.staffId}>
                                  {roleLabel(acct.role)}: {formatZarPlain(acct.totalEarnedZar)}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatZarPlain(row.totalPaidZar)}</td>
                        <td className="px-3 py-2 text-right text-amber-400 tabular-nums">
                          {formatZarPlain(row.outstandingZar)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatZarPlain(row.periodEarnedZar)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatZarPlain(row.periodPaidZar)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openStatement({
                                  assessorId: row.payeeId || row.assessorId,
                                  assessorName: row.name,
                                  allTime: true,
                                  showPaymentRoles: row.isFinanceGroup,
                                })
                              }
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              View statement
                            </button>
                            <button
                              type="button"
                              onClick={() => openPaymentModal(row)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              Record payment
                            </button>
                            <button
                              type="button"
                              onClick={() => openLinkModal(row)}
                              className="text-violet-400 hover:text-violet-300"
                            >
                              {row.isFinanceGroup ? "Manage link" : "Link account"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {linkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161B22] p-5 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {linkModal.isFinanceGroup ? "Manage finance link" : "Link finance account"}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {linkModal.name} ({roleLabel(linkModal.role)}) — combine assessor and moderator balances for
                  finance admin.
                </p>
              </div>
              {linkModal.isFinanceGroup ? (
                <button
                  type="button"
                  onClick={handleUnlink}
                  disabled={linkSaving}
                  className="w-full px-4 py-2 rounded-lg bg-red-900/50 text-red-200 text-sm hover:bg-red-900/70 disabled:opacity-50"
                >
                  {linkSaving ? "Saving…" : "Unlink accounts"}
                </button>
              ) : linkableStaffOptions.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No available {roleLabel(linkModal.role === "ASSESSOR" ? "MODERATOR" : "ASSESSOR")} accounts to
                  link.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {linkableStaffOptions.map((option) => (
                    <button
                      key={option.staffId}
                      type="button"
                      onClick={() => handleLinkSubmit(option.staffId)}
                      disabled={linkSaving}
                      className="w-full text-left px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-50"
                    >
                      <div className="text-sm text-white">{option.name || "—"}</div>
                      <div className="text-xs text-gray-500">{option.email || ""}</div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeLinkModal}
                  className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {statementModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#161B22]">
              <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{statementModal.title}</h3>
                  {statementModal.data?.periodLabel && (
                    <p className="text-xs text-gray-400 mt-1">Period: {statementModal.data.periodLabel}</p>
                  )}
                  {statementModal.data?.totalPaidZar != null && !statementLoading && (
                    <p className="text-sm text-teal-400 mt-1 font-medium">
                      Total paid: {formatZarPlain(statementModal.data.totalPaidZar)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeStatement}
                  className="text-gray-400 hover:text-white text-sm px-2 py-1"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {statementLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader />
                  </div>
                ) : statementError ? (
                  <p className="text-red-300 text-sm">{statementError}</p>
                ) : (statementModal.data?.payments || []).length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No payments recorded.</p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="px-2 py-2 font-medium">Date</th>
                        {(!statementModal.assessorId || statementModal.showPaymentRoles) && (
                          <>
                            <th className="px-2 py-2 font-medium">Role</th>
                            <th className="px-2 py-2 font-medium">Staff</th>
                          </>
                        )}
                        <th className="px-2 py-2 font-medium text-right">Amount</th>
                        <th className="px-2 py-2 font-medium">Comments</th>
                        <th className="px-2 py-2 font-medium">Recorded by</th>
                        <th className="px-2 py-2 font-medium">Proof</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-200">
                      {(statementModal.data.payments || []).map((p) => (
                        <tr key={p._id} className="border-b border-gray-800/80">
                          <td className="px-2 py-2 whitespace-nowrap">{formatDate(p.paidAt)}</td>
                          {(!statementModal.assessorId || statementModal.showPaymentRoles) && (
                            <>
                              <td className="px-2 py-2 text-gray-400">{roleLabel(p.role || p.staffRole)}</td>
                              <td className="px-2 py-2">
                                <div className="text-white">{p.staffName || p.assessorName || "—"}</div>
                                <div className="text-gray-500 text-[10px]">{p.staffEmail || p.assessorEmail || ""}</div>
                              </td>
                            </>
                          )}
                          <td className="px-2 py-2 text-right text-teal-400 font-medium tabular-nums">
                            {formatZarPlain(p.amountZar)}
                          </td>
                          <td className="px-2 py-2 text-gray-400 max-w-[200px]">{p.comments || "—"}</td>
                          <td className="px-2 py-2 text-gray-300">{p.recordedByName || "—"}</td>
                          <td className="px-2 py-2">
                            {p.hasProof ? (
                              <button
                                type="button"
                                onClick={() => handleStatementProof(p._id)}
                                disabled={proofLoadingId === p._id}
                                className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                              >
                                {proofLoadingId === p._id ? "…" : "View"}
                              </button>
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

        {paymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <form
              onSubmit={handlePaymentSubmit}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161B22] p-5 space-y-4"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">Record payment</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {paymentModal.name} · Combined outstanding {formatZarPlain(paymentModal.outstandingZar)}
                </p>
              </div>
              {paymentAccounts.length > 1 && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Record against account</label>
                  <select
                    value={paymentForm.targetStaffId}
                    onChange={(e) => {
                      const selected = paymentAccounts.find((a) => String(a.staffId) === e.target.value);
                      setPaymentForm((f) => ({
                        ...f,
                        targetStaffId: e.target.value,
                        targetRole: selected?.role || f.targetRole,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm"
                  >
                    {paymentAccounts.map((acct) => (
                      <option key={acct.staffId} value={String(acct.staffId)}>
                        {roleLabel(acct.role)} — {acct.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Payment is tagged by role for staff statements; combined balance updates either way.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Amount (ZAR)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={paymentForm.amountZar}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amountZar: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Payment date</label>
                <input
                  type="date"
                  value={paymentForm.paidAt}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, paidAt: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Comments</label>
                <textarea
                  rows={3}
                  value={paymentForm.comments}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, comments: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white text-sm"
                  placeholder="e.g. June payroll batch, reference EFT123"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Proof of payment</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setPaymentForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                  className="w-full text-xs text-gray-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
                >
                  {paymentSaving ? "Saving…" : "Save payment"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default QCTOPayments;
