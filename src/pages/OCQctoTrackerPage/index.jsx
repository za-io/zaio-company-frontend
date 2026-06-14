import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  getCohortQctoTracker,
  getOCCohortDetails,
  listModerationSamplesForCohort,
  remoderateModerationSample,
  updateOCCohortModuleDeadlines,
  viewModerationReport,
} from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import { buildQctoAssessorUrl } from "./qctoAssessorLinks";

function dateToDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function formatDeadlineDisplay(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function moderationArtifactOptionsForModule(mod, view) {
  const options = [];
  if (view === "km") {
    if (mod.refs?.workbook && mod.refs?.summative) {
      options.push({
        artifactType: "qcto_km",
        label: "KM moderation (LWB + SA)",
      });
    } else {
      if (mod.refs?.workbook) {
        options.push({ artifactType: "qctolw", label: "Learner workbook (LWB)" });
      }
      if (mod.refs?.summative) {
        options.push({ artifactType: "qctosa", label: "Summative assessment (SA)" });
      }
    }
  } else {
    if ((mod.refs?.pmtTasks || []).length) {
      options.push({
        artifactType: "qcto_pm",
        label: "PM moderation (all PMT tasks)",
      });
    }
    if (mod.refs?.summative) {
      options.push({ artifactType: "qctosa", label: "Summative assessment (SA)" });
    }
  }
  return options;
}

function findActiveModerationBatch(batches, mod, view) {
  const options = moderationArtifactOptionsForModule(mod, view);
  const primary = options[0];
  if (!primary) return null;

  const activeStatuses = new Set(["sent", "in_progress", "completed"]);
  const candidates = (batches || []).filter((b) => {
    if (b.courseId !== mod.courseId || !activeStatuses.has(b.status)) return false;
    if (b.artifactType !== primary.artifactType) return false;
    if (primary.artifactType === "qctopmt" && primary.pmtTaskId) {
      return String(b.pmtTaskId || "") === String(primary.pmtTaskId);
    }
    if (primary.artifactType === "qcto_pm" || primary.artifactType === "qcto_km") {
      return !b.pmtTaskId;
    }
    return true;
  });

  return candidates.sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )[0];
}

function summarizeModerationBatch(batch) {
  if (!batch || batch.status !== "completed") return null;
  const included = (batch.items || []).filter((it) => it.includedInFinalSample);
  if (!included.length) return null;

  const disagreeCount = included.filter((it) => it.moderationStatus === "disagree").length;
  const returnedCount = included.filter((it) => it.moderationStatus === "returned").length;
  const allAgree = included.every((it) => it.moderationStatus === "agree");

  return {
    allAgree,
    needsRemoderation: disagreeCount > 0 || returnedCount > 0,
    disagreeCount,
    returnedCount,
    hasReport: Boolean(
      batch.moderationReport?.generatedAt && batch.moderationReport?.moderatorSignature
    ),
    batchId: batch._id,
  };
}

const OCQctoTrackerPage = () => {
  const { cohortId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const viewParam = (searchParams.get("view") || "km").toLowerCase();
  const view = viewParam === "pm" ? "pm" : "km";
  const { user } = useUserStore();
  const assessorReadOnly = user?.role === "TUTOR";
  const canEditDeadlines =
    user?.role === "TUTOR" || user?.role === "SUPER_STUDENT_ADMIN";
  const canManageModerationSamples = ["SUPER_STUDENT_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(
    user?.role
  );

  const [cohortName, setCohortName] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deadlineForms, setDeadlineForms] = useState({});
  const [savingCourseId, setSavingCourseId] = useState(null);
  /** PM view: task list modal { moduleName, studentName, studentId, tasks } */
  const [pmtModal, setPmtModal] = useState(null);
  /** Pick LWB / SA / PMT before opening moderation sample create flow */
  const [moderationSamplePicker, setModerationSamplePicker] = useState(null);
  const [moderationBatches, setModerationBatches] = useState([]);
  const [remoderatingCourseId, setRemoderatingCourseId] = useState(null);
  const [viewingReportBatchId, setViewingReportBatchId] = useState(null);

  const loadModerationBatches = async () => {
    if (!canManageModerationSamples || !cohortId) return;
    const res = await listModerationSamplesForCohort(cohortId);
    if (res?.success) {
      setModerationBatches(res.data || []);
    }
  };

  const openModerationSampleCreate = (mod) => {
    const options = moderationArtifactOptionsForModule(mod, view);
    if (!options.length) {
      alert("No assessable artifacts configured for this module.");
      return;
    }
    if (options.length === 1) {
      const o = options[0];
      const params = new URLSearchParams({
        courseId: mod.courseId,
        artifactType: o.artifactType,
      });
      if (o.pmtTaskId) params.set("pmtTaskId", o.pmtTaskId);
      navigate(`/oc-programs/${cohortId}/moderation-samples?${params.toString()}`);
      return;
    }
    setModerationSamplePicker({ mod, options });
  };

  const confirmModerationSampleArtifact = (option) => {
    if (!moderationSamplePicker?.mod) return;
    const params = new URLSearchParams({
      courseId: moderationSamplePicker.mod.courseId,
      artifactType: option.artifactType,
    });
    if (option.pmtTaskId) params.set("pmtTaskId", option.pmtTaskId);
    setModerationSamplePicker(null);
    navigate(`/oc-programs/${cohortId}/moderation-samples?${params.toString()}`);
  };

  const handleRemoderate = async (mod, batch) => {
    if (
      !window.confirm(
        "Archive the current moderation result and create a new sample? The moderator will review a fresh sample."
      )
    ) {
      return;
    }
    setRemoderatingCourseId(mod.courseId);
    const res = await remoderateModerationSample(batch._id);
    setRemoderatingCourseId(null);
    if (res?.success) {
      await loadModerationBatches();
      openModerationSampleCreate(mod);
    } else {
      alert(res?.message || "Could not start remoderation");
    }
  };

  const handleViewReport = async (batchId) => {
    setViewingReportBatchId(batchId);
    const res = await viewModerationReport(batchId);
    setViewingReportBatchId(null);
    if (!res?.success) {
      alert(res?.message || "Could not open moderation report");
    }
  };

  useEffect(() => {
    if (!cohortId) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cohortRes, trackerRes] = await Promise.all([
          getOCCohortDetails(cohortId),
          getCohortQctoTracker(cohortId, view),
        ]);
        if (cancelled) return;
        if (cohortRes?.status === 200 && cohortRes?.success && cohortRes.data) {
          setCohortName(cohortRes.data.cohortName || "OC cohort");
        } else {
          setCohortName("OC cohort");
        }
        if (trackerRes?.status === 200 && trackerRes?.success && trackerRes.data) {
          setData(trackerRes.data);
        } else {
          setData(null);
          setError(trackerRes?.message || "Could not load tracker");
        }
        if (canManageModerationSamples) {
          const modRes = await listModerationSamplesForCohort(cohortId);
          if (!cancelled && modRes?.success) {
            setModerationBatches(modRes.data || []);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load tracker");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [cohortId, view, canManageModerationSamples]);

  useEffect(() => {
    if (!data?.modules?.length) return;
    const next = {};
    for (const m of data.modules) {
      const dl = m.deadlines || {};
      next[m.courseId] = {
        learnerWorkbookDue: dateToDatetimeLocal(dl.learnerWorkbookDue),
        summativeDue: dateToDatetimeLocal(dl.summativeDue),
        pmModuleDue: dateToDatetimeLocal(dl.pmModuleDue),
      };
    }
    setDeadlineForms(next);
  }, [data]);

  useEffect(() => {
    const label = view === "km" ? "KM" : "PM";
    document.title = cohortName
      ? `${label} tracker — ${cohortName} · Zaio`
      : `${label} module tracker · Zaio`;
  }, [cohortName, view]);

  const updateDeadlineField = (courseId, field, value) => {
    setDeadlineForms((prev) => ({
      ...prev,
      [courseId]: { ...prev[courseId], [field]: value },
    }));
  };

  const saveDeadlinesForModule = async (courseId) => {
    if (!cohortId || !canEditDeadlines) return;
    const mod = data?.modules?.find((m) => m.courseId === courseId);
    const hasSummativeRef = !!mod?.refs?.summative;
    const fromForm = deadlineForms[courseId];
    const f = {
      learnerWorkbookDue:
        fromForm?.learnerWorkbookDue !== undefined
          ? fromForm.learnerWorkbookDue
          : dateToDatetimeLocal(mod?.deadlines?.learnerWorkbookDue),
      summativeDue:
        fromForm?.summativeDue !== undefined
          ? fromForm.summativeDue
          : dateToDatetimeLocal(mod?.deadlines?.summativeDue),
      pmModuleDue:
        fromForm?.pmModuleDue !== undefined
          ? fromForm.pmModuleDue
          : dateToDatetimeLocal(mod?.deadlines?.pmModuleDue),
    };
    /** Only send fields for this view; omit summative when no SA is configured so we do not clear stored dates. */
    const patch = { courseId };
    if (view === "km") {
      patch.learnerWorkbookDue = f.learnerWorkbookDue || null;
      if (hasSummativeRef) {
        patch.summativeDue = f.summativeDue || null;
      }
    } else {
      patch.pmModuleDue = f.pmModuleDue || null;
      if (hasSummativeRef) {
        patch.summativeDue = f.summativeDue || null;
      }
    }
    setSavingCourseId(courseId);
    try {
      const res = await updateOCCohortModuleDeadlines(cohortId, [patch]);
      if (!res?.success) {
        alert(res?.message || "Could not save deadlines");
        return;
      }
      const trackerRes = await getCohortQctoTracker(cohortId, view);
      if (trackerRes?.success && trackerRes.data) {
        setData(trackerRes.data);
      } else {
        alert(trackerRes?.message || "Saved, but could not refresh the tracker.");
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Could not save deadlines";
      alert(msg);
    } finally {
      setSavingCourseId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] px-6 md:px-12 lg:px-24 xl:px-36 py-10">
      <div className="max-w-7xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/oc-programs")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600/80 hover:bg-gray-600 text-gray-200 text-sm font-medium mb-6 transition-colors"
        >
          ← Back to OC Programs
        </button>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100 mb-1">
              {view === "km" ? "Knowledge modules (KM)" : "Practical modules (PM)"}
            </h1>
            <p className="text-gray-500 text-[15px]">
              {cohortName ? (
                <>
                  Cohort: <span className="text-gray-300">{cohortName}</span>
                </>
              ) : (
                "Loading cohort…"
              )}
            </p>
          </div>
          {canManageModerationSamples && (
            <button
              type="button"
              onClick={() => navigate(`/oc-programs/${cohortId}/moderation-samples`)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-700/80 hover:bg-violet-600 text-white"
            >
              Moderation samples
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-12">
            <Loader />
            <span>Loading module tracker…</span>
          </div>
        ) : error ? (
          <p className="text-red-400/90">{error}</p>
        ) : !data?.modules?.length ? (
          <p className="text-gray-500 text-[15px]">
            No {view === "km" ? "QCTO-KM" : "QCTO-PM"} modules on this cohort&apos;s learning path, or no
            learners in the cohort.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {view === "km"
                ? "Per knowledge module: learner workbook and summative assessment status for each learner. Click a WB or SA cell to open that item for the learner in the assessor app."
                : "Per practical module: PMT cells show progress as tasks completed out of the total (e.g. 2/5 submitted). Click a PMT cell to see all tasks and open each in the assessor app. Click SA cells for the summative. One PM module deadline applies to all PMT tasks in that module."}
            </p>
            <div className="space-y-8">
              {data.modules.map((mod) => {
                const hasSummativeRef = !!mod.refs?.summative;
                return (
                <div key={mod.courseId} className="rounded-xl border border-gray-700/50 overflow-hidden">
                  <div className="bg-gray-800/40 px-4 py-3 border-b border-gray-700/40 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-medium text-gray-200">
                      {view === "km" ? "KM" : "PM"} — {mod.name}
                    </h2>
                    {canManageModerationSamples && (() => {
                      const batch = findActiveModerationBatch(moderationBatches, mod, view);
                      const summary = summarizeModerationBatch(batch);

                      if (batch && batch.status !== "completed") {
                        return (
                          <span className="text-xs font-medium text-blue-300">
                            Moderation in progress
                          </span>
                        );
                      }

                      if (summary?.allAgree) {
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-green-400">
                              Moderated successfully
                            </span>
                            {summary.hasReport && (
                              <button
                                type="button"
                                disabled={viewingReportBatchId === summary.batchId}
                                onClick={() => handleViewReport(summary.batchId)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                              >
                                {viewingReportBatchId === summary.batchId
                                  ? "Opening…"
                                  : "View report"}
                              </button>
                            )}
                          </div>
                        );
                      }

                      if (summary?.needsRemoderation) {
                        const issueParts = [];
                        if (summary.disagreeCount) {
                          issueParts.push(
                            `${summary.disagreeCount} disagreed`
                          );
                        }
                        if (summary.returnedCount) {
                          issueParts.push(
                            `${summary.returnedCount} returned`
                          );
                        }
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-amber-400">
                              Moderation issue: {issueParts.join(", ")} — remoderation required
                            </span>
                            <button
                              type="button"
                              disabled={remoderatingCourseId === mod.courseId}
                              onClick={() => handleRemoderate(mod, batch)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white disabled:opacity-50"
                            >
                              {remoderatingCourseId === mod.courseId
                                ? "Starting…"
                                : "Remoderate"}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          type="button"
                          className="text-xs px-3 py-1.5 rounded-lg bg-violet-700/80 text-violet-100 hover:bg-violet-600 font-medium"
                          onClick={() => openModerationSampleCreate(mod)}
                        >
                          Create moderation sample
                        </button>
                      );
                    })()}
                  </div>

                  {(canEditDeadlines ||
                    mod.deadlines?.learnerWorkbookDue ||
                    mod.deadlines?.summativeDue ||
                    mod.deadlines?.pmModuleDue) && (
                    <div className="px-4 py-4 bg-gray-900/25 border-b border-gray-700/40">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                        Cohort deadlines
                      </p>
                      {canEditDeadlines ? (
                        <div className="flex flex-col gap-4">
                          {view === "km" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <label className="block text-sm text-gray-400">
                                Learner workbook (LWB) due
                                <input
                                  type="datetime-local"
                                  className="mt-1 w-full rounded-lg bg-gray-800/80 border border-gray-600/60 px-3 py-2 text-gray-200 text-sm"
                                  value={deadlineForms[mod.courseId]?.learnerWorkbookDue || ""}
                                  onChange={(e) =>
                                    updateDeadlineField(
                                      mod.courseId,
                                      "learnerWorkbookDue",
                                      e.target.value
                                    )
                                  }
                                />
                              </label>
                              {hasSummativeRef && (
                              <label className="block text-sm text-gray-400">
                                Summative assessment (SA) due
                                <input
                                  type="datetime-local"
                                  className="mt-1 w-full rounded-lg bg-gray-800/80 border border-gray-600/60 px-3 py-2 text-gray-200 text-sm"
                                  value={deadlineForms[mod.courseId]?.summativeDue || ""}
                                  onChange={(e) =>
                                    updateDeadlineField(mod.courseId, "summativeDue", e.target.value)
                                  }
                                />
                              </label>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <label className="block text-sm text-gray-400">
                                PM module due (all PMT tasks)
                                <input
                                  type="datetime-local"
                                  className="mt-1 w-full rounded-lg bg-gray-800/80 border border-gray-600/60 px-3 py-2 text-gray-200 text-sm"
                                  value={deadlineForms[mod.courseId]?.pmModuleDue || ""}
                                  onChange={(e) =>
                                    updateDeadlineField(mod.courseId, "pmModuleDue", e.target.value)
                                  }
                                />
                              </label>
                              {hasSummativeRef && (
                              <label className="block text-sm text-gray-400">
                                Summative assessment (SA) due
                                <input
                                  type="datetime-local"
                                  className="mt-1 w-full rounded-lg bg-gray-800/80 border border-gray-600/60 px-3 py-2 text-gray-200 text-sm"
                                  value={deadlineForms[mod.courseId]?.summativeDue || ""}
                                  onChange={(e) =>
                                    updateDeadlineField(mod.courseId, "summativeDue", e.target.value)
                                  }
                                />
                              </label>
                              )}
                            </div>
                          )}
                          <div>
                            <button
                              type="button"
                              disabled={savingCourseId === mod.courseId}
                              onClick={() => saveDeadlinesForModule(mod.courseId)}
                              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600/90 hover:bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingCourseId === mod.courseId ? "Saving…" : "Save deadlines"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-400">
                          {view === "km" ? (
                            <>
                              <div>
                                <dt className="text-gray-500">LWB due</dt>
                                <dd className="text-gray-300">
                                  {formatDeadlineDisplay(mod.deadlines?.learnerWorkbookDue)}
                                </dd>
                              </div>
                              {hasSummativeRef && (
                              <div>
                                <dt className="text-gray-500">SA due</dt>
                                <dd className="text-gray-300">
                                  {formatDeadlineDisplay(mod.deadlines?.summativeDue)}
                                </dd>
                              </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>
                                <dt className="text-gray-500">PM module (all PMT tasks) due</dt>
                                <dd className="text-gray-300">
                                  {formatDeadlineDisplay(mod.deadlines?.pmModuleDue)}
                                </dd>
                              </div>
                              {hasSummativeRef && (
                              <div>
                                <dt className="text-gray-500">SA due</dt>
                                <dd className="text-gray-300">
                                  {formatDeadlineDisplay(mod.deadlines?.summativeDue)}
                                </dd>
                              </div>
                              )}
                            </>
                          )}
                        </dl>
                      )}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[960px]">
                      <thead>
                        <tr className="bg-gray-800/30">
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                            Name
                          </th>
                          <th
                            className={
                              view === "km"
                                ? "px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap max-w-[140px]"
                                : "px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[10.5rem]"
                            }
                            title={
                              view === "km"
                                ? "Learner workbook submitted — click a cell below to open in assessor app"
                                : "Submitted count / total PMT tasks — click a cell to see all tasks"
                            }
                          >
                            {view === "km" ? "WB submitted" : "PMT submitted"}
                          </th>
                          <th
                            className={
                              view === "km"
                                ? "px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap max-w-[140px]"
                                : "px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[10.5rem]"
                            }
                            title={
                              view === "km"
                                ? "Learner workbook verified by tutor — click a cell below to open in assessor app"
                                : "Tutor-verified count / total PMT tasks — click a cell to see all tasks"
                            }
                          >
                            {view === "km" ? "WB tutor ✓" : "PMT tutor ✓"}
                          </th>
                          {hasSummativeRef && (
                            <>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title="Summative assessment submitted — click a cell below to open in assessor app"
                          >
                            SA submitted
                          </th>
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title="Summative assessment verified by tutor — click a cell below to open in assessor app"
                          >
                            SA tutor ✓
                          </th>
                            </>
                          )}
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title={
                              view === "km"
                                ? "Learner workbook assessed — click a cell below to open in assessor app"
                                : "Assessed count / total PMT tasks — click a cell to see all tasks"
                            }
                          >
                            {view === "km" ? "WB assessed" : "PMT assessed"}
                          </th>
                          {hasSummativeRef && (
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title="Summative assessment assessed — click a cell below to open in assessor app"
                          >
                            SA assessed
                          </th>
                          )}
                          <th
                            className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            title="Learner was included in the moderation sample and reviewed by the moderator"
                          >
                            Moderated
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/40">
                        {mod.rows.map((row) => {
                          const saTitle = "Open summative assessment (assessor)";
                          const pmtListTitle =
                            "All PMT tasks for this learner — click to list tasks and open in assessor";
                          const cellBtnClass =
                            "text-left w-full min-h-[2rem] rounded px-1 -mx-1 py-0.5 text-inherit hover:underline hover:bg-gray-800/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/80 cursor-pointer";

                          const yesNo = (ok) => (
                            <span
                              className={ok ? "text-emerald-400/95 font-medium" : "text-gray-500"}
                            >
                              {ok ? "Yes" : "—"}
                            </span>
                          );

                          /** PM: show e.g. "2/5 submitted" using per-task flags from the API */
                          const pmtProgressLabel = (count, total, suffix) => {
                            if (!total) {
                              return <span className="text-gray-500">—</span>;
                            }
                            const allDone = count === total;
                            return (
                              <span
                                className={
                                  allDone ? "text-emerald-400/95 font-medium" : "text-gray-300"
                                }
                              >
                                <span className="tabular-nums">
                                  {count}/{total}
                                </span>{" "}
                                {suffix}
                              </span>
                            );
                          };

                          if (view === "pm") {
                            const pmtTasks = row.pmtTasks || [];
                            const pmtTotal = pmtTasks.length;
                            const pmtSubmitted = pmtTasks.filter((t) => t.submitted).length;
                            const pmtTutor = pmtTasks.filter((t) => t.tutorVerified).length;
                            const pmtAssessed = pmtTasks.filter((t) => t.assessed).length;

                            return (
                              <tr key={row.studentId} className="hover:bg-gray-800/20">
                                <td className="px-3 py-3 text-sm text-gray-300">
                                  <span className="font-medium">{row.name}</span>
                                  <span className="block text-xs text-gray-500 truncate max-w-[220px]">
                                    {row.email}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-sm">
                                  <button
                                    type="button"
                                    title={pmtListTitle}
                                    className={cellBtnClass}
                                    onClick={() =>
                                      setPmtModal({
                                        moduleName: mod.name,
                                        studentName: row.name,
                                        studentId: row.studentId,
                                        tasks: row.pmtTasks || [],
                                      })
                                    }
                                  >
                                    {pmtProgressLabel(pmtSubmitted, pmtTotal, "submitted")}
                                  </button>
                                </td>
                                <td className="px-3 py-3 text-sm">
                                  <button
                                    type="button"
                                    title={pmtListTitle}
                                    className={cellBtnClass}
                                    onClick={() =>
                                      setPmtModal({
                                        moduleName: mod.name,
                                        studentName: row.name,
                                        studentId: row.studentId,
                                        tasks: row.pmtTasks || [],
                                      })
                                    }
                                  >
                                    {pmtProgressLabel(pmtTutor, pmtTotal, "tutor ✓")}
                                  </button>
                                </td>
                                {hasSummativeRef && (
                                  <>
                                    <td className="px-3 py-3 text-sm">
                                      {(() => {
                                        const url = mod.refs?.summative
                                          ? buildQctoAssessorUrl(
                                              mod.refs.summative,
                                              row.studentId,
                                              assessorReadOnly
                                            )
                                          : null;
                                        const inner = yesNo(row.summativeAssessment?.submitted);
                                        if (!url) {
                                          return inner;
                                        }
                                        return (
                                          <button
                                            type="button"
                                            title={saTitle}
                                            className={cellBtnClass}
                                            onClick={() =>
                                              window.open(url, "_blank", "noopener,noreferrer")
                                            }
                                          >
                                            {inner}
                                          </button>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-3 py-3 text-sm">
                                      {(() => {
                                        const url = mod.refs?.summative
                                          ? buildQctoAssessorUrl(
                                              mod.refs.summative,
                                              row.studentId,
                                              assessorReadOnly
                                            )
                                          : null;
                                        const inner = yesNo(row.summativeAssessment?.tutorVerified);
                                        if (!url) {
                                          return inner;
                                        }
                                        return (
                                          <button
                                            type="button"
                                            title={saTitle}
                                            className={cellBtnClass}
                                            onClick={() =>
                                              window.open(url, "_blank", "noopener,noreferrer")
                                            }
                                          >
                                            {inner}
                                          </button>
                                        );
                                      })()}
                                    </td>
                                  </>
                                )}
                                <td className="px-3 py-3 text-sm">
                                  <button
                                    type="button"
                                    title={pmtListTitle}
                                    className={cellBtnClass}
                                    onClick={() =>
                                      setPmtModal({
                                        moduleName: mod.name,
                                        studentName: row.name,
                                        studentId: row.studentId,
                                        tasks: row.pmtTasks || [],
                                      })
                                    }
                                  >
                                    {pmtProgressLabel(pmtAssessed, pmtTotal, "assessed")}
                                  </button>
                                </td>
                                {hasSummativeRef && (
                                  <td className="px-3 py-3 text-sm">
                                    {(() => {
                                      const url = mod.refs?.summative
                                        ? buildQctoAssessorUrl(
                                            mod.refs.summative,
                                            row.studentId,
                                            assessorReadOnly
                                          )
                                        : null;
                                      const inner = yesNo(row.summativeAssessment?.assessed);
                                      if (!url) {
                                        return inner;
                                      }
                                      return (
                                        <button
                                          type="button"
                                          title={saTitle}
                                          className={cellBtnClass}
                                          onClick={() =>
                                            window.open(url, "_blank", "noopener,noreferrer")
                                          }
                                        >
                                          {inner}
                                        </button>
                                      );
                                    })()}
                                  </td>
                                )}
                                <td className="px-3 py-3 text-sm">{yesNo(row.moderated)}</td>
                              </tr>
                            );
                          }

                          const wbTitle = "Open learner workbook (assessor)";
                          const cells = [
                            { ref: mod.refs?.workbook, flag: row.learnerWorkbook?.submitted },
                            { ref: mod.refs?.workbook, flag: row.learnerWorkbook?.tutorVerified },
                          ];
                          if (hasSummativeRef) {
                            cells.push(
                              { ref: mod.refs?.summative, flag: row.summativeAssessment?.submitted },
                              { ref: mod.refs?.summative, flag: row.summativeAssessment?.tutorVerified }
                            );
                          }
                          cells.push({ ref: mod.refs?.workbook, flag: row.learnerWorkbook?.assessed });
                          if (hasSummativeRef) {
                            cells.push({
                              ref: mod.refs?.summative,
                              flag: row.summativeAssessment?.assessed,
                            });
                          }
                          return (
                            <tr key={row.studentId} className="hover:bg-gray-800/20">
                              <td className="px-3 py-3 text-sm text-gray-300">
                                <span className="font-medium">{row.name}</span>
                                <span className="block text-xs text-gray-500 truncate max-w-[220px]">
                                  {row.email}
                                </span>
                              </td>
                              {cells.map((cell, colIdx) => {
                                const url = cell.ref
                                  ? buildQctoAssessorUrl(cell.ref, row.studentId, assessorReadOnly)
                                  : null;
                                const label =
                                  cell.ref === mod.refs?.summative ? saTitle : wbTitle;
                                const ok = cell.flag;
                                const inner = (
                                  <span
                                    className={
                                      ok ? "text-emerald-400/95 font-medium" : "text-gray-500"
                                    }
                                  >
                                    {ok ? "Yes" : "—"}
                                  </span>
                                );
                                if (!url) {
                                  return (
                                    <td key={colIdx} className="px-3 py-3 text-sm">
                                      {inner}
                                    </td>
                                  );
                                }
                                return (
                                  <td key={colIdx} className="px-3 py-3 text-sm">
                                    <button
                                      type="button"
                                      title={label}
                                      className="text-left w-full min-h-[2rem] rounded px-1 -mx-1 py-0.5 text-inherit hover:underline hover:bg-gray-800/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/80 cursor-pointer"
                                      onClick={() =>
                                        window.open(url, "_blank", "noopener,noreferrer")
                                      }
                                    >
                                      {inner}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="px-3 py-3 text-sm">
                                <span
                                  className={
                                    row.moderated
                                      ? "text-emerald-400/95 font-medium"
                                      : "text-gray-500"
                                  }
                                >
                                  {row.moderated ? "Yes" : "—"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {pmtModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pmt-modal-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8"
          onClick={() => setPmtModal(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-gray-600/50 bg-[#151a22] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-700/60 px-5 py-4">
              <div>
                <h2 id="pmt-modal-title" className="text-lg font-semibold text-gray-100">
                  PMT tasks
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  <span className="text-gray-300">{pmtModal.studentName}</span>
                  <span className="mx-1.5 text-gray-600">·</span>
                  {pmtModal.moduleName}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-800/80 hover:text-gray-200"
                onClick={() => setPmtModal(null)}
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {pmtModal.tasks?.length ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3">Task</th>
                      <th className="py-2 pr-2 whitespace-nowrap">Submitted</th>
                      <th className="py-2 pr-2 whitespace-nowrap">Tutor ✓</th>
                      <th className="py-2 pr-2 whitespace-nowrap">Assessed</th>
                      <th className="py-2 text-right">Assessor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/40 text-gray-300">
                    {pmtModal.tasks.map((t) => {
                      const ref = {
                        kind: "qctopmt",
                        id: t.taskId,
                        lectureId: t.lectureId,
                      };
                      const openUrl = buildQctoAssessorUrl(
                        ref,
                        pmtModal.studentId,
                        assessorReadOnly
                      );
                      return (
                        <tr key={t.taskId} className="align-top">
                          <td className="py-3 pr-3">{t.lectureName || "PMT task"}</td>
                          <td className="py-3 pr-2">
                            <span
                              className={
                                t.submitted ? "font-medium text-emerald-400/95" : "text-gray-500"
                              }
                            >
                              {t.submitted ? "Yes" : "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-2">
                            <span
                              className={
                                t.tutorVerified ? "font-medium text-emerald-400/95" : "text-gray-500"
                              }
                            >
                              {t.tutorVerified ? "Yes" : "—"}
                            </span>
                          </td>
                          <td className="py-3 pr-2">
                            <span
                              className={
                                t.assessed ? "font-medium text-emerald-400/95" : "text-gray-500"
                              }
                            >
                              {t.assessed ? "Yes" : "—"}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {openUrl ? (
                              <a
                                href={openUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:underline"
                              >
                                Open
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">
                  No PMT tasks are configured for this module on the learning path.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {moderationSamplePicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-sample-picker-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8"
          onClick={() => setModerationSamplePicker(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-600/50 bg-[#151a22] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-700/60 px-5 py-4">
              <h2 id="moderation-sample-picker-title" className="text-lg font-semibold text-gray-100">
                Create moderation sample
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {view === "km" ? "KM" : "PM"} — {moderationSamplePicker.mod?.name}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {view === "km"
                  ? "One sample per KM includes both learner workbook and summative assessment (25% of eligible learners)."
                  : "Choose which artifact to sample (25% of eligible assessed submissions)."}
              </p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2">
              {moderationSamplePicker.options.map((opt) => (
                <button
                  key={`${opt.artifactType}-${opt.pmtTaskId || ""}`}
                  type="button"
                  onClick={() => confirmModerationSampleArtifact(opt)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-700/50 bg-gray-800/40 text-gray-200 text-sm hover:border-violet-500/50 hover:bg-violet-950/30 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="px-5 pb-4 flex justify-end">
              <button
                type="button"
                className="text-sm text-gray-400 hover:text-gray-200"
                onClick={() => setModerationSamplePicker(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCQctoTrackerPage;
