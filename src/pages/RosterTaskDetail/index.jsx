import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  getRosterTask,
  patchRosterTaskRow,
  refreshRosterTask,
  deleteRosterTask,
} from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import CopyableEmailCell from "../../components/CopyableEmailCell";
import AltEmailStudentSearch from "../../components/AltEmailStudentSearch";
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

const defaultWorkflow = () => ({
  checkedAlternateEmail: false,
  alternateEmailNote: "",
  resolvedUserId: "",
  paymentPlanDone: false,
  markedDeregistered: false,
  enrollmentDone: false,
  notes: "",
});

function profileUserId(row) {
  const w = row.workflow || {};
  const rid = (w.resolvedUserId || "").trim();
  if (rid) return rid;
  return row.userId || null;
}

export default function RosterTaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingRowId, setSavingRowId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState(STATUS.all);
  const [planFilter, setPlanFilter] = useState(PLAN.all);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    const res = await getRosterTask(taskId);
    if (!res?.success) {
      setError(res?.message || "Failed to load");
      setTask(null);
    } else {
      setTask(res.task);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateWorkflow = async (rowId, partial) => {
    setSavingRowId(rowId);
    const res = await patchRosterTaskRow(taskId, rowId, partial);
    setSavingRowId(null);
    if (!res?.success) {
      setError(res?.message || "Save failed");
      return;
    }
    setTask((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r) => {
        if (r.rowId !== rowId) return r;
        if (res.row && typeof res.row === "object") {
          return {
            ...r,
            ...res.row,
            workflow: { ...defaultWorkflow(), ...r.workflow, ...(res.row.workflow || {}) },
          };
        }
        const wf = res.row?.workflow;
        return {
          ...r,
          workflow: { ...defaultWorkflow(), ...r.workflow, ...(wf || partial) },
        };
      });
      return { ...prev, rows };
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setError(null);
    const res = await refreshRosterTask(taskId);
    setRefreshing(false);
    if (!res?.success) {
      setError(res?.message || "Refresh failed");
      return;
    }
    setTask(res.task);
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this roster task? This cannot be undone.")) return;
    setDeleting(true);
    const res = await deleteRosterTask(taskId);
    setDeleting(false);
    if (!res?.success) {
      setError(res?.message || "Delete failed");
      return;
    }
    navigate("/roster-tasks", { replace: true });
  };

  const filteredRows = useMemo(
    () => filterRosterRows(task?.rows ?? [], statusFilter, planFilter),
    [task, statusFilter, planFilter]
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!FINANCE_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const canDelete =
    user.role === "SUPER_ADMIN" ||
    (task?.createdBy && user._id && String(task.createdBy._id || task.createdBy) === String(user._id));

  const rowCount = task?.rows?.length ?? 0;

  return (
    <div className="px-4 lg:px-10 py-10 max-w-[1800px] mx-auto">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-4 mb-2">
            <Link to="/roster-tasks" className="text-sm text-blue-400 hover:text-blue-300">
              ← All tasks
            </Link>
            <Link to="/roster-payment-check" className="text-sm text-violet-400 hover:text-violet-300">
              New roster check
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{task?.title || "Roster task"}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {task?.sourceFilename && <span>File: {task.sourceFilename} · </span>}
            {task?.createdBy && (
              <span>
                Created by {task.createdBy.company_username || task.createdBy.email || "—"}
                {task.createdAt && ` · ${new Date(task.createdAt).toLocaleString()}`}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh from Zaio"}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-800/50 text-rose-200 text-sm border border-rose-500/30 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete task"}
            </button>
          )}
          </div>
          <p className="text-xs text-gray-500 max-w-md text-right">
            After you <strong className="text-gray-400">search and pick</strong> a student (or paste a profile user ID),{" "}
            <strong className="text-gray-400">Zaio</strong> and <strong className="text-gray-400">Plan</strong> update from
            that account. Use <strong className="text-gray-400">Refresh from Zaio</strong> to re-sync every row from roster
            emails only.
          </p>
        </div>
      </div>

      {task?.mainTaskDescription && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 mb-8">
          <h2 className="text-sm font-semibold text-amber-200/90 mb-2">Main task</h2>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
            {task.mainTaskDescription}
          </pre>
        </div>
      )}

      {loading && <Loader />}
      {error && <p className="text-amber-400 text-sm mb-4">{error}</p>}

      {!loading && task && (
        <>
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
              Filters use <strong className="text-gray-500">planCategories</strong>. Rows with a plan but empty categories
              only match <strong className="text-gray-500">Has any plan</strong> until you use{" "}
              <strong className="text-gray-500">Refresh from Zaio</strong>.
            </p>
            <p className="text-xs text-gray-500">
              Showing {filteredRows.length} of {rowCount} rows
            </p>
          </div>

        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="px-3 py-3 font-medium sticky left-0 bg-[#0d1117] z-10">Student</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Zaio</th>
                  <th className="px-3 py-3 font-medium whitespace-nowrap">Has plan</th>
                  <th className="px-3 py-3 font-medium min-w-[160px]">Category</th>
                  <th
                    className="px-3 py-3 font-medium text-center"
                    title="Check when verified; use search to find student under another email in Zaio"
                  >
                    <span className="block">Alt email</span>
                    <span className="block text-[10px] font-normal text-gray-500 mt-0.5">Search</span>
                  </th>
                  <th className="px-3 py-3 font-medium min-w-[140px]">Alt email note</th>
                  <th className="px-3 py-3 font-medium min-w-[120px]">Profile user ID</th>
                  <th className="px-3 py-3 font-medium text-center">Pay plan</th>
                  <th className="px-3 py-3 font-medium text-center">Dereg.</th>
                  <th className="px-3 py-3 font-medium text-center">Enrolled</th>
                  <th className="px-3 py-3 font-medium min-w-[160px]">Notes</th>
                  <th className="px-3 py-3 font-medium">Profile</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-gray-500">
                      No rows match these filters
                    </td>
                  </tr>
                ) : (
                filteredRows.map((row) => {
                  const w = { ...defaultWorkflow(), ...row.workflow };
                  const pid = profileUserId({ ...row, workflow: w });
                  return (
                    <tr key={row.rowId} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-3 py-2 max-w-[140px] truncate sticky left-0 bg-[#0d1117]" title={row.studentName}>
                        {row.studentName || "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[220px]">
                        <CopyableEmailCell email={row.email} textClassName="text-xs" />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.inSystem ? "Yes" : "No"}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {row.hasPaymentPlan ? (
                          <span className="text-emerald-400">Yes</span>
                        ) : (
                          <span className="text-rose-400">No</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[220px]">
                        <span className="text-emerald-400/95">
                          {formatPlanCategories(row) || "—"}
                        </span>
                        {(row.planTypes || []).length > 0 && (
                          <span className="text-gray-600 block text-[10px] mt-1 leading-snug">
                            {(row.planTypes || []).join(", ")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="checkbox"
                            checked={!!w.checkedAlternateEmail}
                            disabled={savingRowId === row.rowId}
                            onChange={(e) =>
                              updateWorkflow(row.rowId, { checkedAlternateEmail: e.target.checked })
                            }
                            className="rounded border-white/30"
                            title="Checked alternate email / account"
                          />
                          <AltEmailStudentSearch
                            disabled={savingRowId === row.rowId}
                            onSelectUser={(u) => {
                              updateWorkflow(row.rowId, {
                                resolvedUserId: String(u._id),
                                alternateEmailNote: `Matched: ${u.email}${u.username ? ` (${u.username})` : ""}`,
                                checkedAlternateEmail: true,
                              });
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          defaultValue={w.alternateEmailNote}
                          key={`${row.rowId}-alt-${w.alternateEmailNote}`}
                          onBlur={(e) => {
                            if (e.target.value !== (w.alternateEmailNote || "")) {
                              updateWorkflow(row.rowId, { alternateEmailNote: e.target.value });
                            }
                          }}
                          placeholder="Other email found…"
                          className="w-full min-w-[120px] bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          defaultValue={w.resolvedUserId || ""}
                          key={`${row.rowId}-uid-${w.resolvedUserId}`}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (w.resolvedUserId || "")) {
                              updateWorkflow(row.rowId, { resolvedUserId: v || null });
                            }
                          }}
                          placeholder="Mongo user id"
                          className="w-full min-w-[100px] bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!w.paymentPlanDone}
                          disabled={savingRowId === row.rowId}
                          onChange={(e) => updateWorkflow(row.rowId, { paymentPlanDone: e.target.checked })}
                          className="rounded border-white/30"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!w.markedDeregistered}
                          disabled={savingRowId === row.rowId}
                          onChange={(e) => updateWorkflow(row.rowId, { markedDeregistered: e.target.checked })}
                          className="rounded border-white/30"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!!w.enrollmentDone}
                          disabled={savingRowId === row.rowId}
                          onChange={(e) => updateWorkflow(row.rowId, { enrollmentDone: e.target.checked })}
                          className="rounded border-white/30"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          defaultValue={w.notes}
                          key={`${row.rowId}-notes-${w.notes}`}
                          onBlur={(e) => {
                            if (e.target.value !== (w.notes || "")) {
                              updateWorkflow(row.rowId, { notes: e.target.value });
                            }
                          }}
                          className="w-full min-w-[140px] bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {pid ? (
                          <Link
                            to={`/student-profile/${pid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Open
                          </Link>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
