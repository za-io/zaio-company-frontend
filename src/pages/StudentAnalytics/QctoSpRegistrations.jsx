import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiEye } from "react-icons/fi";
import { getBootcampSpRegistrationList, exportBootcampQctoSpStage } from "../../api/company";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import Loader from "../../components/loader/loader";
import QctoSpEnrollmentViewModal from "./QctoSpEnrollmentViewModal";

const studentLabel = (student) =>
  student?.username || student?.name || student?.email || "—";

const todayIso = () => new Date().toISOString().split("T")[0];

const defaultExportSettings = () => ({
  trainingStartDate: "",
  trainingEndDate: "",
  stage1HeadOfInstitution: "Mvelo Hlophe",
  stage1DateChecked: todayIso(),
  stage1AttachmentsIncluded: "Y",
  stage2HeadOfInstitution: "Asif Hassam",
  stage2DateChecked: todayIso(),
  stage2AttachmentsIncluded: "Y",
  expectedFisaDate: "",
  rplLearnerCount: 0,
});

const StatusBadge = ({ row }) => {
  if (row.registrationComplete) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-600/20 text-emerald-300">
        Registered
        {row.isLateEnrollment ? " (late)" : ""}
      </span>
    );
  }
  if (row.isOverdue) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-600/20 text-red-300">
        Not registered · overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-600/20 text-amber-300">
      Not registered
    </span>
  );
};

const Field = ({ label, children, hint }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

const inputClass =
  "w-full rounded-lg border border-gray-700 bg-[#0D1117] px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none";

export default function QctoSpRegistrations() {
  const [searchParams] = useSearchParams();
  const bootcampId = searchParams.get("bootcamp");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exportingStage, setExportingStage] = useState(null);
  const [exportMessage, setExportMessage] = useState(null);
  const [exportSettings, setExportSettings] = useState(defaultExportSettings);
  const [viewRow, setViewRow] = useState(null);

  const load = useCallback(async () => {
    if (!bootcampId) {
      setLoading(false);
      setError("Missing bootcamp ID. Add ?bootcamp=... to the URL.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await getBootcampSpRegistrationList(bootcampId);
    if (res?.success) {
      setData(res);
      const saved = res.bootcamp?.exportSettings;
      if (saved) {
        setExportSettings((prev) => ({
          ...prev,
          ...saved,
          stage1DateChecked: saved.stage1DateChecked || todayIso(),
          stage2DateChecked: saved.stage2DateChecked || todayIso(),
        }));
      }
    } else {
      setData(null);
      setError(res?.message || "Failed to load QCTO SP registrations");
    }
    setLoading(false);
  }, [bootcampId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows || [];
  const summary = data?.summary;
  const bootcamp = data?.bootcamp;
  const exports = data?.exports || [];
  const analyticsUrl = bootcampId ? `/student/analytics?bootcamp=${bootcampId}` : "/student/analytics";

  const handleSettingChange = (key, value) => {
    setExportSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async (stage) => {
    if (!bootcampId) return;
    setExportingStage(stage);
    setExportMessage(null);
    const payload = {
      ...exportSettings,
      rplLearnerCount: Number(exportSettings.rplLearnerCount) || 0,
    };
    const res = await exportBootcampQctoSpStage(bootcampId, stage, payload);
    if (res?.success) {
      setExportMessage({ type: "success", text: res.message || "Export uploaded to S3." });
      setData((prev) => (prev ? { ...prev, exports: res.exports || prev.exports } : prev));
    } else {
      setExportMessage({ type: "error", text: res?.message || "Export failed." });
    }
    setExportingStage(null);
  };

  const formatExportStage = (stage) => (stage === "stage2" ? "Stage 2 (FISA)" : "Stage 1 (Enrolment)");

  return (
    <div className="min-h-screen bg-[#0D1117] px-6 md:px-12 lg:px-24 xl:px-36 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={analyticsUrl}
            className="text-sm text-gray-400 hover:text-white mb-2 inline-block"
          >
            ← Back to Student Analytics
          </Link>
          <h1 className="text-3xl font-bold text-white">QCTO Skills Programme registrations</h1>
          {bootcamp?.skillsProgramName && (
            <p className="text-sm text-gray-400 mt-2">
              {bootcamp.skillsProgramName}
              {bootcamp.skillsProgramId ? ` · ${bootcamp.skillsProgramId}` : ""}
            </p>
          )}
          {bootcamp?.spRegistrationDeadline && (
            <p className="text-xs text-gray-500 mt-1">
              Registration deadline: {formatDate(bootcamp.spRegistrationDeadline)}
              {bootcamp.spRegistrationClosed ? " · Closed" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport("stage1")}
            disabled={!!exportingStage || loading || !!error}
            className="px-4 py-2 rounded-lg font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors"
          >
            {exportingStage === "stage1" ? "Exporting Stage 1…" : "Export Stage 1 → S3"}
          </button>
          <button
            type="button"
            onClick={() => handleExport("stage2")}
            disabled={!!exportingStage || loading || !!error}
            className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
          >
            {exportingStage === "stage2" ? "Exporting Stage 2…" : "Export Stage 2 → S3"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {exportMessage && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            exportMessage.type === "error"
              ? "border-red-700/50 bg-red-950/30 text-red-200"
              : "border-emerald-700/50 bg-emerald-950/30 text-emerald-200"
          }`}
        >
          {exportMessage.text}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader />
          <p className="mt-4 text-gray-400">Loading registrations…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-6 max-w-2xl">
          <p className="text-amber-200">{error}</p>
          {bootcampId && (
            <Link
              to={analyticsUrl}
              className="mt-4 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
            >
              Return to bootcamp analytics →
            </Link>
          )}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="rounded-xl bg-[#161B22] border border-gray-800 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Enrolled</p>
                <p className="text-2xl font-semibold text-white mt-1">{summary.total}</p>
              </div>
              <div className="rounded-xl bg-[#161B22] border border-gray-800 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Registered</p>
                <p className="text-2xl font-semibold text-emerald-400 mt-1">{summary.registered}</p>
              </div>
              <div className="rounded-xl bg-[#161B22] border border-gray-800 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Not registered</p>
                <p className="text-2xl font-semibold text-amber-400 mt-1">{summary.notRegistered}</p>
              </div>
              <div className="rounded-xl bg-[#161B22] border border-gray-800 p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue</p>
                <p className="text-2xl font-semibold text-red-400 mt-1">{summary.overdue}</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-800 bg-[#161B22] p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-1">Export settings</h2>
            <p className="text-sm text-gray-400 mb-6">
              These values are written into the official QCTO workbook (Sheet 1 sign-off and Sheet 2
              implementation plan) when you export. SDP contact defaults to Asif Hassam · 0632770232 · asif@zaio.io.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <Field label="Training start date *" hint="Sheet 2 — Start date of Training">
                <input
                  type="date"
                  className={inputClass}
                  value={exportSettings.trainingStartDate || ""}
                  onChange={(e) => handleSettingChange("trainingStartDate", e.target.value)}
                />
              </Field>
              <Field label="Expected training end date *" hint="Sheet 2 — Expected End Date of Training">
                <input
                  type="date"
                  className={inputClass}
                  value={exportSettings.trainingEndDate || ""}
                  onChange={(e) => handleSettingChange("trainingEndDate", e.target.value)}
                />
              </Field>
              <Field label="RPL learner count" hint="Sheet 2 — learners enrolled via RPL">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={exportSettings.rplLearnerCount ?? 0}
                  onChange={(e) => handleSettingChange("rplLearnerCount", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-lg border border-gray-800 bg-[#0D1117]/60 p-4">
                <h3 className="text-sm font-semibold text-violet-300 mb-4">Stage 1 sign-off (Submission 1)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Head of institution *">
                    <input
                      type="text"
                      className={inputClass}
                      value={exportSettings.stage1HeadOfInstitution || ""}
                      onChange={(e) => handleSettingChange("stage1HeadOfInstitution", e.target.value)}
                    />
                  </Field>
                  <Field label="Date checked *">
                    <input
                      type="date"
                      className={inputClass}
                      value={exportSettings.stage1DateChecked || todayIso()}
                      onChange={(e) => handleSettingChange("stage1DateChecked", e.target.value)}
                    />
                  </Field>
                  <Field label="All required attachments included *">
                    <select
                      className={inputClass}
                      value={exportSettings.stage1AttachmentsIncluded || "Y"}
                      onChange={(e) => handleSettingChange("stage1AttachmentsIncluded", e.target.value)}
                    >
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="rounded-lg border border-gray-800 bg-[#0D1117]/60 p-4">
                <h3 className="text-sm font-semibold text-indigo-300 mb-4">Stage 2 sign-off (Submission 2)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Head of institution *">
                    <input
                      type="text"
                      className={inputClass}
                      value={exportSettings.stage2HeadOfInstitution || ""}
                      onChange={(e) => handleSettingChange("stage2HeadOfInstitution", e.target.value)}
                    />
                  </Field>
                  <Field label="Date checked *">
                    <input
                      type="date"
                      className={inputClass}
                      value={exportSettings.stage2DateChecked || todayIso()}
                      onChange={(e) => handleSettingChange("stage2DateChecked", e.target.value)}
                    />
                  </Field>
                  <Field label="All required attachments included *">
                    <select
                      className={inputClass}
                      value={exportSettings.stage2AttachmentsIncluded || "Y"}
                      onChange={(e) => handleSettingChange("stage2AttachmentsIncluded", e.target.value)}
                    >
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </Field>
                  <Field label="Expected Date of FISA *" hint="Required for Stage 2 export only">
                    <input
                      type="date"
                      className={inputClass}
                      value={exportSettings.expectedFisaDate || ""}
                      onChange={(e) => handleSettingChange("expectedFisaDate", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-[#161B22] p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-1">QCTO stage exports</h2>
            <p className="text-sm text-gray-400 mb-4">
              Generates the official 3-sheet workbook (Instructions, Implementation Plan, Learner Data),
              fills Sheet 2 and Sheet 3, and uploads the .xlsx to S3. Stage 1 includes registered learners (A–AK).
              Stage 2 adds FISA columns (AL–AN) when available.
            </p>
            {exports.length === 0 ? (
              <p className="text-sm text-gray-500">No exports yet. Use the buttons above to generate one.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-400 uppercase text-xs border-b border-gray-800">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Stage</th>
                      <th className="py-2 pr-4 font-medium">Exported</th>
                      <th className="py-2 pr-4 font-medium">Learners</th>
                      <th className="py-2 pr-4 font-medium">Late</th>
                      <th className="py-2 pr-4 font-medium">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {exports.map((item) => (
                      <tr key={`${item.stage}-${item.exportedAt}-${item.s3Key}`}>
                        <td className="py-3 pr-4 text-white">{formatExportStage(item.stage)}</td>
                        <td className="py-3 pr-4 text-gray-400">
                          {item.exportedAt ? formatDateTime(item.exportedAt) : "—"}
                        </td>
                        <td className="py-3 pr-4 text-gray-300">{item.registeredCount ?? "—"}</td>
                        <td className="py-3 pr-4 text-amber-400">{item.lateCount ?? 0}</td>
                        <td className="py-3 pr-4">
                          {(item.downloadUrl || item.s3Url) ? (
                            <a
                              href={item.downloadUrl || item.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-400 hover:text-violet-300 break-all"
                            >
                              {item.fileName || "Download xlsx"}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#161B22]">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#0D1117] text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Student #</th>
                  <th className="px-4 py-3 font-medium">Registration</th>
                  <th className="px-4 py-3 font-medium">Registered on</th>
                  <th className="px-4 py-3 font-medium w-16">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      No learners enrolled in this bootcamp.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const student = row.student || {};
                    const key = String(row.studentId || student._id || student.email);
                    return (
                      <tr key={key} className="hover:bg-[#0D1117]/60">
                        <td className="px-4 py-3 text-white font-medium">{studentLabel(student)}</td>
                        <td className="px-4 py-3 text-gray-300">{student.email || "—"}</td>
                        <td className="px-4 py-3 text-gray-400">{student.studentNumber || "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge row={row} />
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {row.registeredAt ? formatDate(row.registeredAt) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setViewRow(row)}
                            disabled={!row.registrationComplete || !row.enrollment}
                            title={
                              row.registrationComplete
                                ? "View submitted QCTO registration form"
                                : "Registration not completed yet"
                            }
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <QctoSpEnrollmentViewModal row={viewRow} onClose={() => setViewRow(null)} />
        </>
      )}
    </div>
  );
}
