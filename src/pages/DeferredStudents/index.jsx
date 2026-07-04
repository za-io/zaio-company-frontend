import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  getDeferredStudents,
  updateBootcampEnrollmentStatus,
  ENROLLMENT_STATUS_OPTIONS,
} from "../../api/student";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import CopyableEmailCell from "../../components/CopyableEmailCell";

const DEFERRED_ROLES = ["SUPER_STUDENT_ADMIN", "SUPER_ADMIN"];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "deferred", label: "Deferred" },
  { value: "deferred_optin", label: "Deferred-optin" },
  { value: "deferred_pass", label: "Deferred-pass" },
];

const ENROLLMENT_STATUS_LABELS = {
  in_progress: "In progress",
  in_grace_period: "Grace period",
  pass: "Pass",
  supp: "Supp",
  transfer_pending: "Transfer-pending",
  transfer_complete: "Transfer-complete",
  deferred: "Deferred",
  deferred_optin: "Deferred-optin",
  deferred_pass: "Deferred-pass",
  dropped_off: "Dropped off",
};

function getEnrollmentStatusDisplay(status) {
  const key = status || "in_progress";
  const label = ENROLLMENT_STATUS_LABELS[key] || "In progress";
  const className =
    key === "deferred_pass"
      ? "bg-emerald-600/20 text-emerald-300"
      : key === "deferred_optin"
      ? "bg-cyan-600/20 text-cyan-300"
      : key === "pass"
      ? "bg-green-600/20 text-green-400"
      : key === "supp"
      ? "bg-purple-600/20 text-purple-300"
      : key === "transfer_pending"
      ? "bg-indigo-600/20 text-indigo-300"
      : key === "transfer_complete"
      ? "bg-slate-600/20 text-slate-300"
      : key === "in_grace_period"
      ? "bg-orange-600/20 text-orange-400"
      : key === "deferred"
      ? "bg-yellow-600/20 text-yellow-400"
      : key === "dropped_off"
      ? "bg-red-600/20 text-red-400"
      : "bg-blue-600/20 text-blue-400";
  return { label, className };
}

const selectClassName =
  "w-full min-w-[130px] px-2 py-1.5 rounded-lg text-xs font-medium border border-gray-600 bg-[#0D1117] text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40 disabled:opacity-50";

export default function DeferredStudents() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [cohortFilter, setCohortFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusSavingKey, setStatusSavingKey] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    const res = await getDeferredStudents();
    if (!res?.success) {
      setError(res?.message || "Failed to load deferred students");
      setStudents([]);
    } else {
      setStudents(res.students || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const cohortOptions = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      if (s.bootcampId && s.cohortDeferredFrom) {
        map.set(String(s.bootcampId), s.cohortDeferredFrom);
      }
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((row) => {
      if (cohortFilter !== "all" && String(row.bootcampId) !== cohortFilter) {
        return false;
      }
      if (statusFilter !== "all" && row.enrollmentStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        row.studentName,
        row.email,
        row.studentNumber,
        row.cohortDeferredFrom,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [students, search, cohortFilter, statusFilter]);

  const totalLabel = useMemo(() => {
    if (loading) return "";
    const source = filteredStudents;
    const active = source.filter((s) => s.enrollmentStatus === "deferred").length;
    const optIn = source.filter((s) => s.enrollmentStatus === "deferred_optin").length;
    const passed = source.filter((s) => s.enrollmentStatus === "deferred_pass").length;
    const parts = [];
    if (active) parts.push(`${active} deferred`);
    if (optIn) parts.push(`${optIn} deferred-optin`);
    if (passed) parts.push(`${passed} deferred-pass`);
    const summary = parts.length ? parts.join(" · ") : "0 matching";
    if (filteredStudents.length !== students.length) {
      return `${summary} (${filteredStudents.length} of ${students.length} shown)`;
    }
    return parts.length ? parts.join(" · ") : "0 deferred students";
  }, [loading, filteredStudents, students.length]);

  const handleStatusChange = async (row, nextStatus) => {
    const currentStored = row.storedEnrollmentStatus || row.enrollmentStatus;
    if (!nextStatus || nextStatus === currentStored) return;

    const rowKey = `${row.userId}-${row.bootcampId}`;
    setStatusSavingKey(rowKey);
    setStatusMessage(null);

    try {
      const res = await updateBootcampEnrollmentStatus(row.bootcampId, row.userId, nextStatus);
      if (res?.success) {
        await loadStudents();
        setStatusMessage({ type: "success", text: "Status updated" });
      } else {
        setStatusMessage({
          type: "error",
          text: res?.message || "Failed to update status",
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to update status" });
    } finally {
      setStatusSavingKey(null);
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!DEFERRED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="px-6 lg:px-12 py-10 max-w-[1400px] mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-4 mb-2">
            <Link to="/" className="text-sm text-blue-400 hover:text-blue-300">
              ← Dashboard
            </Link>
            <Link to="/finance" className="text-sm text-emerald-400 hover:text-emerald-300">
              Finance
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Deferred Students</h1>
          <p className="text-gray-400 text-sm mt-1">
            Students on the deferred program — progress, access, status, and original cohort.
          </p>
          {!loading && totalLabel && (
            <p className="text-gray-500 text-xs mt-2">{totalLabel}</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, cohort…"
          className="w-full px-4 py-2.5 rounded-xl bg-gray-900/80 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
        />
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className={selectClassName}
        >
          <option value="all">All cohorts</option>
          {cohortOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClassName}
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {statusMessage && (
        <div
          className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${
            statusMessage.type === "success"
              ? "border border-green-500/30 bg-green-500/10 text-green-300"
              : "border border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-gray-900/40 px-6 py-12 text-center text-gray-400">
          {students.length === 0
            ? "No deferred students found."
            : "No students match the current filters."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-gray-900/30">
          <table className="w-full min-w-[980px] text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium w-[100px]">Progress</th>
                <th className="px-4 py-3 font-medium w-[120px]">Active / blocked</th>
                <th className="px-4 py-3 font-medium w-[160px]">Status</th>
                <th className="px-4 py-3 font-medium">Cohort deferred from</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.map((row) => {
                const statusDisplay = getEnrollmentStatusDisplay(row.enrollmentStatus);
                const rowKey = `${row.userId}-${row.bootcampId}`;
                const storedStatus = row.storedEnrollmentStatus || row.enrollmentStatus;
                const selectValue =
                  row.enrollmentStatus === "deferred_pass" ? "pass" : storedStatus;
                const blockedReason =
                  row.accBlocked && row.accessRevoked
                    ? "Account blocked · access revoked"
                    : row.accBlocked
                    ? "Account blocked"
                    : row.accessRevoked
                    ? "Bootcamp access revoked"
                    : null;
                return (
                  <tr key={rowKey} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/student-profile/${row.userId}`)}
                        className="text-left group"
                      >
                        <div className="font-medium text-white group-hover:text-blue-300 transition-colors">
                          {row.studentName}
                        </div>
                        {row.studentNumber && (
                          <div className="text-xs text-gray-500 mt-0.5">{row.studentNumber}</div>
                        )}
                      </button>
                      {row.email && (
                        <div className="mt-1">
                          <CopyableEmailCell
                            email={row.email}
                            className="text-xs"
                            textClassName="text-gray-400 hover:text-gray-300"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden min-w-[48px]">
                          <div
                            className={`h-full rounded-full ${
                              row.enrollmentStatus === "deferred_pass"
                                ? "bg-emerald-500/80"
                                : "bg-yellow-500/80"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, row.progress))}%` }}
                          />
                        </div>
                        <span className="text-gray-300 tabular-nums w-10 text-right">{row.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.accessState === "blocked" ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-600/20 text-red-400"
                          title={blockedReason || "Blocked"}
                        >
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-600/20 text-green-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <select
                          value={selectValue}
                          onChange={(e) => handleStatusChange(row, e.target.value)}
                          disabled={statusSavingKey === rowKey}
                          className={selectClassName}
                          title="Change enrollment status"
                        >
                          {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {row.enrollmentStatus === "deferred_pass" && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${statusDisplay.className}`}
                          >
                            {statusDisplay.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/student/analytics?bootcamp=${row.bootcampId}`)
                        }
                        className="text-left text-gray-200 hover:text-blue-300 transition-colors"
                        title="Open bootcamp analytics"
                      >
                        {row.cohortDeferredFrom}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
