import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getRosterTasks } from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

const FINANCE_ROLES = ["SUPER_STUDENT_ADMIN", "SUPER_ADMIN", "COMPANY_ADMIN"];

export default function RosterTasksList() {
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getRosterTasks();
      if (!cancelled) {
        if (!res?.success) {
          setError(res?.message || "Failed to load");
          setTasks([]);
        } else {
          setTasks(res.tasks || []);
          setError(null);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!FINANCE_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="px-6 lg:px-12 py-10 max-w-[1200px] mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-4 mb-2">
            <Link to="/" className="text-sm text-blue-400 hover:text-blue-300">
              ← Dashboard
            </Link>
            <Link to="/roster-payment-check" className="text-sm text-violet-400 hover:text-violet-300">
              New roster check
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-white">Saved roster tasks</h1>
          <p className="text-gray-400 mt-1">
            Open a task to work through enrollment, alternate emails, payment plans, and deregistrations.
          </p>
        </div>
      </div>

      {loading && <Loader />}
      {error && <p className="text-amber-400 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-white/10">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Rows</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">By</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="text-gray-200">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No saved tasks yet. Run a roster check and click &quot;Save as task&quot;.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t._id} className="border-b border-white/5 hover:bg-white/[0.04]">
                    <td className="px-4 py-3 font-medium text-white max-w-[280px] truncate" title={t.title}>
                      {t.title}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{t.sourceFilename || "—"}</td>
                    <td className="px-4 py-3">{t.rowCount}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {t.createdBy?.company_username || t.createdBy?.email || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/roster-tasks/${t._id}`} className="text-blue-400 hover:text-blue-300">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
