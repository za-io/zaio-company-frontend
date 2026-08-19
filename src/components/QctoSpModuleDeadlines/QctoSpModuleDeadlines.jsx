import React, { useEffect, useState } from "react";
import {
  getBootcampSpModuleDeadlines,
  updateBootcampSpModuleDeadlines,
} from "../../api/company";

function dateToDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(val) {
  if (!val || !String(val).trim()) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDeadlineDisplay(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function QctoSpModuleDeadlines({ bootcampId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [formByCourseId, setFormByCourseId] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!bootcampId) return;
    setLoading(true);
    setMessage(null);
    getBootcampSpModuleDeadlines(bootcampId)
      .then((res) => {
        if (res?.success && res?.data) {
          setMeta(res.data);
          setRows(res.data.rows || []);
        } else {
          setMeta(null);
          setRows([]);
          setMessage({ type: "error", text: res?.message || "Could not load module deadlines." });
        }
      })
      .catch(() => {
        setMeta(null);
        setRows([]);
        setMessage({ type: "error", text: "Could not load module deadlines." });
      })
      .finally(() => setLoading(false));
  }, [bootcampId]);

  useEffect(() => {
    const next = {};
    rows.forEach((row) => {
      next[row.courseId] = {
        learnerWorkbookDue: dateToDatetimeLocal(row.learnerWorkbookDue),
        summativeDue: dateToDatetimeLocal(row.summativeDue),
        pmModuleDue: dateToDatetimeLocal(row.pmModuleDue),
      };
    });
    setFormByCourseId(next);
  }, [rows]);

  const updateField = (courseId, field, value) => {
    setFormByCourseId((prev) => ({
      ...prev,
      [courseId]: { ...(prev[courseId] || {}), [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!bootcampId || !rows.length) return;
    setSaving(true);
    setMessage(null);
    const deadlines = rows.map((row) => {
      const form = formByCourseId[row.courseId] || {};
      return {
        courseId: row.courseId,
        learnerWorkbookDue: datetimeLocalToIso(form.learnerWorkbookDue),
        summativeDue: datetimeLocalToIso(form.summativeDue),
        pmModuleDue: datetimeLocalToIso(form.pmModuleDue),
      };
    });
    const res = await updateBootcampSpModuleDeadlines(bootcampId, deadlines);
    setSaving(false);
    if (res?.success) {
      setMessage({ type: "success", text: res.message || "Module deadlines saved." });
      setRows(res.data?.rows || rows);
    } else {
      setMessage({ type: "error", text: res?.message || "Could not save module deadlines." });
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-gray-700 bg-[#161B22] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#1c2128] transition-colors"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-semibold text-white">QCTO module deadlines</h2>
          <p className="text-sm text-gray-400 mt-1">
            Per-course due dates for this bootcamp only
            {meta?.learningPathName ? ` · ${meta.learningPathName}` : ""}
          </p>
        </div>
        <span className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-700">
          {message && (
            <p
              className={`text-sm mt-4 ${message.type === "error" ? "text-red-400" : "text-emerald-400"}`}
            >
              {message.text}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-gray-400 py-6">Loading module deadlines…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-400 py-6">
              No QCTO-KM or QCTO-PM courses found on this bootcamp&apos;s Skills Programme learning path.
              Configure the programme first.
            </p>
          ) : (
            <>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save deadlines"}
                </button>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="py-3 pr-4 font-medium">Module</th>
                      <th className="py-3 pr-4 font-medium">Type</th>
                      <th className="py-3 pr-4 font-medium">Learner workbook due</th>
                      <th className="py-3 pr-4 font-medium">Summative due (KM)</th>
                      <th className="py-3 pr-4 font-medium">PM module due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const form = formByCourseId[row.courseId] || {};
                      const isKm = row.courseType === "QCTO-KM";
                      const isPm = row.courseType === "QCTO-PM";
                      return (
                        <tr key={row.courseId} className="border-b border-gray-800 text-gray-200">
                          <td className="py-3 pr-4">{row.courseName}</td>
                          <td className="py-3 pr-4 text-gray-400">{row.courseType}</td>
                          <td className="py-3 pr-4">
                            {isKm ? (
                              <input
                                type="datetime-local"
                                value={form.learnerWorkbookDue || ""}
                                onChange={(e) =>
                                  updateField(row.courseId, "learnerWorkbookDue", e.target.value)
                                }
                                className="w-full min-w-[12rem] px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white"
                              />
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {isKm ? (
                              <input
                                type="datetime-local"
                                value={form.summativeDue || ""}
                                onChange={(e) =>
                                  updateField(row.courseId, "summativeDue", e.target.value)
                                }
                                className="w-full min-w-[12rem] px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white"
                              />
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {isPm ? (
                              <input
                                type="datetime-local"
                                value={form.pmModuleDue || ""}
                                onChange={(e) =>
                                  updateField(row.courseId, "pmModuleDue", e.target.value)
                                }
                                className="w-full min-w-[12rem] px-3 py-2 rounded-lg border border-gray-600 bg-[#0D1117] text-white"
                              />
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
