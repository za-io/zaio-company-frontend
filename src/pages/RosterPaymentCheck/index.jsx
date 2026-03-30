import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { postRosterPaymentCheck, createRosterTask } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import CopyableEmailCell from "../../components/CopyableEmailCell";
import {
  STATUS,
  PLAN,
  PLAN_LABELS,
  PLAN_FILTER_OPTIONS,
  filterRosterRows,
  formatPlanCategories,
} from "../../utils/rosterPlanFilters";

const FINANCE_ROLES = ["SUPER_STUDENT_ADMIN", "SUPER_ADMIN", "COMPANY_ADMIN"];

const STATUS_OPTIONS = [
  { id: STATUS.all, label: "All rows" },
  { id: STATUS.inZaioNoPlan, label: "In Zaio, no plan" },
  { id: STATUS.notInZaio, label: "Not in Zaio" },
];

export default function RosterPaymentCheck() {
  const { user } = useUserStore();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState(STATUS.all);
  const [planFilter, setPlanFilter] = useState(PLAN.all);
  const [taskTitle, setTaskTitle] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [savedTaskId, setSavedTaskId] = useState(null);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!FINANCE_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a .csv or .xlsx file");
      return;
    }
    setLoading(true);
    setError(null);
    setSavedTaskId(null);
    const res = await postRosterPaymentCheck(file);
    if (!res?.success) {
      setError(res?.message || "Upload failed");
      setResult(null);
    } else {
      setResult(res);
    }
    setLoading(false);
  };

  const handleSaveAsTask = async () => {
    if (!result?.rows?.length) return;
    setSavingTask(true);
    setSaveMessage(null);
    const title =
      taskTitle.trim() ||
      `Roster — ${result.filename || "upload"} (${new Date().toLocaleDateString()})`;
    const res = await createRosterTask({
      title,
      sourceFilename: result.filename || "roster",
      rows: result.rows,
    });
    setSavingTask(false);
    if (!res?.success) {
      setSaveMessage(res?.message || "Could not save task");
      return;
    }
    if (res.task?._id) {
      setSavedTaskId(res.task._id);
    }
    setSaveMessage("Task saved. You can open it below or from the nav.");
  };

  const rows = result?.rows ?? [];
  const filtered = filterRosterRows(rows, statusFilter, planFilter);

  const summary = result?.summary;

  return (
    <div className="px-6 lg:px-12 py-10 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <div className="flex flex-wrap gap-4 mb-2">
          <Link to="/" className="text-sm text-blue-400 hover:text-blue-300">
            ← Back to dashboard
          </Link>
          <Link to="/roster-tasks" className="text-sm text-amber-400/90 hover:text-amber-300">
            Saved roster tasks
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-white">Roster vs payment plans</h1>
        <p className="text-gray-400 mt-1 max-w-3xl">
          Upload a cohort roster (CSV or Excel). We match the <strong className="text-gray-300">Email</strong> column to
          Zaio accounts and show plan <strong className="text-gray-300">categories</strong> (Upfront, Custom EFT+Paystack,
          Manati, Paystack only, 2 installments). Open a student’s profile to add or fix their plan.
        </p>
      </div>

      <form
        onSubmit={handleUpload}
        className="rounded-2xl border border-white/10 p-6 mb-8 bg-gradient-to-r from-violet-600/10 to-teal-600/10"
      >
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Roster file</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-gray-200 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/10 file:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm disabled:opacity-50"
          >
            {loading ? "Processing…" : "Analyze roster"}
          </button>
        </div>
        {error && <p className="text-amber-400 text-sm mt-3">{error}</p>}
      </form>

      {loading && <Loader />}

      {result?.success && summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="rounded-xl border border-white/10 px-4 py-3 bg-white/[0.03]">
              <div className="text-xs text-gray-500">Rows</div>
              <div className="text-xl font-semibold text-white">{summary.rows}</div>
            </div>
            <div className="rounded-xl border border-white/10 px-4 py-3 bg-white/[0.03]">
              <div className="text-xs text-gray-500">In Zaio</div>
              <div className="text-xl font-semibold text-emerald-400">{summary.inSystem}</div>
            </div>
            <div className="rounded-xl border border-white/10 px-4 py-3 bg-white/[0.03]">
              <div className="text-xs text-gray-500">Not in Zaio</div>
              <div className="text-xl font-semibold text-amber-400">{summary.missingFromSystem}</div>
            </div>
            <div className="rounded-xl border border-white/10 px-4 py-3 bg-white/[0.03]">
              <div className="text-xs text-gray-500">Has plan</div>
              <div className="text-xl font-semibold text-white">{summary.hasPaymentPlan}</div>
            </div>
            <div className="rounded-xl border border-white/10 px-4 py-3 bg-white/[0.03]">
              <div className="text-xs text-gray-500">No plan (in Zaio)</div>
              <div className="text-xl font-semibold text-rose-400">
                {rows.filter((r) => r.inSystem && !r.hasPaymentPlan).length}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 p-4 mb-6 bg-white/[0.02] flex flex-col sm:flex-row flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Save as reconciliation task</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title (optional)"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Creates a checklist: alternate email, payment plan, deregistered, enrollment — editable per student.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveAsTask}
              disabled={savingTask}
              className="px-5 py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-500 text-white font-semibold text-sm disabled:opacity-50 shrink-0"
            >
              {savingTask ? "Saving…" : "Save as task"}
            </button>
          </div>
          {saveMessage && (
            <div className={`text-sm mb-4 ${saveMessage.includes("Could not") ? "text-amber-400" : "text-emerald-400"}`}>
              <p>{saveMessage}</p>
              {savedTaskId && (
                <Link to={`/roster-tasks/${savedTaskId}`} className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
                  Open saved task →
                </Link>
              )}
            </div>
          )}

          <div className="space-y-3 mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-500 shrink-0">Show:</span>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    statusFilter === opt.id
                      ? "bg-violet-600/40 border-violet-500 text-white"
                      : "border-white/15 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-500 shrink-0">Plan category:</span>
              {PLAN_FILTER_OPTIONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlanFilter(id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    planFilter === id
                      ? "bg-teal-600/35 border-teal-500/60 text-white"
                      : "border-white/15 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {PLAN_LABELS[id]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 max-w-3xl">
              Filters use <strong className="text-gray-500">planCategories</strong> from Zaio. Rows with a plan but empty
              categories (e.g. old tasks) only match <strong className="text-gray-500">Has any plan</strong> until you refresh
              the task.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Cohort</th>
                    <th className="px-4 py-3 font-medium">In Zaio</th>
                    <th className="px-4 py-3 font-medium">Has plan</th>
                    <th className="px-4 py-3 font-medium min-w-[180px]">Category</th>
                    <th className="px-4 py-3 font-medium">Profile</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No rows for this filter
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row, idx) => (
                      <tr key={`${row.email}-${idx}`} className="border-b border-white/5 hover:bg-white/[0.04]">
                        <td className="px-4 py-3 whitespace-nowrap max-w-[200px] truncate" title={row.studentName}>
                          {row.studentName || "—"}
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          <CopyableEmailCell email={row.email} />
                        </td>
                        <td className="px-4 py-3 max-w-[160px] truncate" title={row.cohort}>
                          {row.cohort || "—"}
                        </td>
                        <td className="px-4 py-3">{row.inSystem ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">
                          {row.hasPaymentPlan ? (
                            <span className="text-emerald-400">Yes</span>
                          ) : (
                            <span className="text-rose-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-[280px]">
                          <div className="text-emerald-400/90">{formatPlanCategories(row) || "—"}</div>
                          {(row.planTypes || []).length > 0 && (
                            <div className="text-gray-600 text-[10px] mt-0.5">
                              {(row.planTypes || []).join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.userId ? (
                            <Link
                              to={`/student-profile/${row.userId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Open profile
                            </Link>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            File: {result.filename} · Showing {filtered.length} of {rows.length} rows
          </p>
        </>
      )}
    </div>
  );
}
