import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  createModerationSampleDraft,
  downloadModerationSampleManifest,
  getModerationSampleBatch,
  getModerationSampleEligibility,
  getOCCohortDetails,
  listModerationSamplesForCohort,
  patchModerationSampleItems,
  regenerateModerationSample,
  sendModerationSampleToModerator,
  viewModerationReport,
} from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

const ARTIFACT_OPTIONS = [
  { value: "qcto_km", label: "KM (Learner Workbook + Summative)" },
  { value: "qcto_pm", label: "PM (all PMT tasks)" },
  { value: "qctolw", label: "Learner Workbook" },
  { value: "qctosa", label: "Summative Assessment" },
  { value: "qctopmt", label: "PMT Task" },
];

const STATUS_COLORS = {
  draft: "bg-gray-600/60 text-gray-200",
  sent: "bg-blue-600/40 text-blue-200",
  in_progress: "bg-amber-600/40 text-amber-100",
  completed: "bg-green-600/40 text-green-200",
  cancelled: "bg-red-900/40 text-red-200",
};

function studentLabel(item) {
  if (item.studentName) return item.studentName;
  const s = item.studentId;
  if (s && typeof s === "object") {
    return s.username || s.email || "Student";
  }
  return "Student";
}

function hasSavedReport(batch) {
  return Boolean(batch?.moderationReport?.generatedAt && batch?.moderationReport?.moderatorSignature);
}

const OCModerationSamplesPage = () => {
  const { cohortId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useUserStore();

  const canManage = ["SUPER_STUDENT_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"].includes(
    user?.role
  );

  const [cohortName, setCohortName] = useState("");
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createCourseId, setCreateCourseId] = useState(searchParams.get("courseId") || "");
  const [createArtifact, setCreateArtifact] = useState(
    searchParams.get("artifactType") || "qcto_km"
  );
  const [createPmtTaskId, setCreatePmtTaskId] = useState(
    searchParams.get("pmtTaskId") || ""
  );
  const [targetPercentInput, setTargetPercentInput] = useState("25");
  const [eligibility, setEligibility] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendNotes, setSendNotes] = useState("");
  const [overrideReasons, setOverrideReasons] = useState({});
  const [pendingToggles, setPendingToggles] = useState({});
  const [viewingReport, setViewingReport] = useState(false);

  useEffect(() => {
    if (searchParams.get("courseId") && searchParams.get("artifactType")) {
      setShowCreate(true);
    }
  }, [searchParams]);

  const loadBatches = useCallback(async () => {
    const res = await listModerationSamplesForCohort(cohortId);
    if (res?.success) {
      setBatches(res.data || []);
    } else {
      setError(res?.message || "Could not load batches");
    }
  }, [cohortId]);

  const loadCohort = useCallback(async () => {
    const res = await getOCCohortDetails(cohortId);
    if (res?.success && res.data) {
      setCohortName(res.data.cohortName || "OC cohort");
    }
  }, [cohortId]);

  useEffect(() => {
    if (!canManage) return;
    setLoading(true);
    Promise.all([loadCohort(), loadBatches()])
      .catch((e) => setError(e?.message || "Load failed"))
      .finally(() => setLoading(false));
  }, [canManage, loadBatches, loadCohort]);

  const openBatch = async (batchId) => {
    setActiveBatchId(batchId);
    setBatchLoading(true);
    setPendingToggles({});
    setOverrideReasons({});
    const res = await getModerationSampleBatch(batchId);
    if (res?.success) {
      setActiveBatch(res.data);
    } else {
      alert(res?.message || "Could not load batch");
      setActiveBatchId(null);
    }
    setBatchLoading(false);
  };

  const parsedTargetPercent = useMemo(() => {
    if (targetPercentInput === "") return null;
    const n = Number(targetPercentInput);
    return Number.isFinite(n) ? n : null;
  }, [targetPercentInput]);

  const loadEligibility = async () => {
    if (!createCourseId || !createArtifact || parsedTargetPercent == null) return;
    setEligibilityLoading(true);
    const res = await getModerationSampleEligibility(cohortId, {
      courseId: createCourseId,
      artifactType: createArtifact,
      pmtTaskId: createArtifact === "qctopmt" ? createPmtTaskId : undefined,
      targetPercent: parsedTargetPercent,
    });
    if (res?.success) {
      setEligibility(res.data);
    } else {
      setEligibility(null);
      alert(res?.message || "Could not load eligibility");
    }
    setEligibilityLoading(false);
  };

  useEffect(() => {
    if (showCreate && createCourseId && createArtifact) {
      loadEligibility();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreate, createCourseId, createArtifact, createPmtTaskId, parsedTargetPercent]);

  const handleCreate = async () => {
    if (!createCourseId) {
      alert("Enter a course ID (from module tracker).");
      return;
    }
    if (createArtifact === "qctopmt" && !createPmtTaskId) {
      alert("PMT task ID is required for PMT samples.");
      return;
    }
    if (parsedTargetPercent == null || parsedTargetPercent < 1 || parsedTargetPercent > 100) {
      alert("Enter a sample % between 1 and 100.");
      return;
    }
    setCreating(true);
    const res = await createModerationSampleDraft(cohortId, {
      courseId: createCourseId,
      artifactType: createArtifact,
      pmtTaskId: createArtifact === "qctopmt" ? createPmtTaskId : undefined,
      targetPercent: parsedTargetPercent,
    });
    setCreating(false);
    if (res?.success) {
      setShowCreate(false);
      await loadBatches();
      openBatch(res.data._id);
    } else {
      alert(res?.message || "Could not create sample");
    }
  };

  const toggleItemIncluded = (item) => {
    const id = item._id;
    const next = !(
      pendingToggles[id] !== undefined
        ? pendingToggles[id]
        : item.includedInFinalSample
    );
    setPendingToggles((prev) => ({ ...prev, [id]: next }));
  };

  const effectiveIncluded = (item) =>
    pendingToggles[item._id] !== undefined
      ? pendingToggles[item._id]
      : item.includedInFinalSample;

  const hasPendingAdjustments = useMemo(() => {
    if (!activeBatch?.items) return false;
    return activeBatch.items.some((it) => pendingToggles[it._id] !== undefined);
  }, [activeBatch, pendingToggles]);

  const saveAdjustments = async () => {
    if (!activeBatch) return;
    const adjustments = [];
    for (const item of activeBatch.items) {
      if (pendingToggles[item._id] === undefined) continue;
      const next = pendingToggles[item._id];
      if (next === item.includedInFinalSample) continue;
      const reason = (overrideReasons[item._id] || "").trim();
      if (
        (next && !item.inRandomDraw) ||
        (!next && item.includedInFinalSample)
      ) {
        if (!reason) {
          alert("Provide a reason for each manual add/remove.");
          return;
        }
      }
      adjustments.push({
        itemId: item._id,
        includedInFinalSample: next,
        overrideReason: reason,
      });
    }
    if (!adjustments.length) return;
    const res = await patchModerationSampleItems(activeBatch._id, adjustments);
    if (res?.success) {
      setActiveBatch(res.data);
      setPendingToggles({});
      setOverrideReasons({});
      await loadBatches();
    } else {
      alert(res?.message || "Could not save adjustments");
    }
  };

  const handleRegenerate = async () => {
    if (!activeBatch || !window.confirm("Regenerate random draw? Manual adjustments will be reset.")) {
      return;
    }
    const res = await regenerateModerationSample(activeBatch._id);
    if (res?.success) {
      setActiveBatch(res.data);
      setPendingToggles({});
      await loadBatches();
    } else {
      alert(res?.message || "Could not regenerate");
    }
  };

  const handleViewReport = async () => {
    if (!activeBatch) return;
    setViewingReport(true);
    const res = await viewModerationReport(activeBatch._id);
    setViewingReport(false);
    if (!res?.success) {
      alert(res?.message || "Could not open moderation report");
    }
  };

  const handleSend = async () => {
    if (!activeBatch) return;
    setSending(true);
    const res = await sendModerationSampleToModerator(activeBatch._id, {
      notes: sendNotes,
    });
    setSending(false);
    if (res?.success) {
      alert(
        `Sample sent to moderator${res.moderator?.email ? `: ${res.moderator.email}` : ""}.`
      );
      setSendNotes("");
      setActiveBatch(res.data);
      await loadBatches();
    } else {
      const belowReason = window.prompt(
        `${res?.message || "Send failed"}\n\nIf below 25%, enter reason to proceed:`
      );
      if (belowReason) {
        setSending(true);
        const retry = await sendModerationSampleToModerator(activeBatch._id, {
          notes: sendNotes,
          belowMinimumSampleReason: belowReason,
        });
        setSending(false);
        if (retry?.success) {
          alert("Sample sent.");
          setActiveBatch(retry.data);
          await loadBatches();
        } else {
          alert(retry?.message || "Send failed");
        }
      }
    }
  };

  if (!canManage) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-6 py-10 text-gray-300">
        Access denied. Super student admin or company admin only.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] px-6 md:px-12 lg:px-24 py-10">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/oc-programs")}
          className="text-sm text-gray-400 hover:text-gray-200 mb-6"
        >
          ← Back to OC Programs
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Moderation samples</h1>
            <p className="text-gray-500 text-sm mt-1">
              {cohortName} — generate random 25% samples and send to the cohort moderator
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
          >
            New sample batch
          </button>
        </div>

        {loading ? (
          <Loader />
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                Batches
              </h2>
              {!batches.length ? (
                <p className="text-gray-500 text-sm">No moderation samples yet.</p>
              ) : (
                batches.map((b) => (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => openBatch(b._id)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                      activeBatchId === b._id
                        ? "border-indigo-500/60 bg-indigo-950/30"
                        : "border-gray-700/50 bg-gray-800/30 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-sm text-gray-200 font-medium truncate">{b.label}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[b.status] || STATUS_COLORS.draft}`}
                      >
                        {b.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {b.sampleCount}/{b.populationCount} sampled
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="lg:col-span-2">
              {!activeBatchId ? (
                <p className="text-gray-500 text-sm">Select a batch to review or create a new one.</p>
              ) : batchLoading ? (
                <Loader />
              ) : activeBatch ? (
                <div className="rounded-xl border border-gray-700/50 bg-gray-800/20 p-5">
                  <div className="flex flex-wrap justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg text-gray-100">{activeBatch.label}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {activeBatch.sampleCount} of {activeBatch.populationCount} learners (
                        {activeBatch.targetPercent}% target) · {activeBatch.artifactLabel}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded h-fit ${STATUS_COLORS[activeBatch.status]}`}
                    >
                      {activeBatch.status}
                    </span>
                  </div>

                  {activeBatch.status === "draft" && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        type="button"
                        onClick={handleRegenerate}
                        className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200"
                      >
                        Regenerate random draw
                      </button>
                      {hasPendingAdjustments && (
                        <button
                          type="button"
                          onClick={saveAdjustments}
                          className="px-3 py-1.5 text-sm rounded-lg bg-amber-700 hover:bg-amber-600 text-white"
                        >
                          Save manual adjustments
                        </button>
                      )}
                    </div>
                  )}

                  {activeBatch.status === "draft" && (
                    <div className="mb-4 p-3 rounded-lg bg-gray-900/40 border border-gray-700/40">
                      <label className="block text-sm text-gray-400 mb-1">
                        Note to moderator (optional)
                      </label>
                      <textarea
                        className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                        rows={2}
                        value={sendNotes}
                        onChange={(e) => setSendNotes(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={sending}
                        onClick={handleSend}
                        className="mt-2 px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium disabled:opacity-50"
                      >
                        {sending ? "Sending…" : "Send to moderator"}
                      </button>
                    </div>
                  )}

                  {activeBatch.status !== "draft" && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {hasSavedReport(activeBatch) && (
                        <button
                          type="button"
                          disabled={viewingReport}
                          onClick={handleViewReport}
                          className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                        >
                          {viewingReport ? "Opening report…" : "View report"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadModerationSampleManifest(activeBatch._id)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200"
                      >
                        Download manifest (CSV)
                      </button>
                      {hasSavedReport(activeBatch) && activeBatch.moderationReport?.generatedAt && (
                        <span className="text-xs text-green-400/90">
                          Report saved{" "}
                          {new Date(activeBatch.moderationReport.generatedAt).toLocaleString("en-ZA")}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="text-gray-500 border-b border-gray-700/50">
                          {activeBatch.status === "draft" && <th className="py-2 pr-2">Sample</th>}
                          <th className="py-2 pr-2">Learner</th>
                          <th className="py-2 pr-2">Method</th>
                          <th className="py-2">Moderation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeBatch.items || []).map((item) => (
                          <tr key={item._id} className="border-b border-gray-800/60">
                            {activeBatch.status === "draft" && (
                              <td className="py-2 pr-2">
                                <input
                                  type="checkbox"
                                  checked={effectiveIncluded(item)}
                                  onChange={() => toggleItemIncluded(item)}
                                />
                              </td>
                            )}
                            <td className="py-2 pr-2 text-gray-300">{studentLabel(item)}</td>
                            <td className="py-2 pr-2 text-gray-500 text-xs">
                              {item.selectionMethod}
                              {item.inRandomDraw ? " · random" : ""}
                            </td>
                            <td className="py-2 text-gray-400 text-xs">
                              {activeBatch.status === "draft" &&
                              pendingToggles[item._id] !== undefined &&
                              pendingToggles[item._id] !== item.includedInFinalSample ? (
                                <input
                                  type="text"
                                  placeholder="Reason for override"
                                  className="w-full rounded bg-gray-800 border border-gray-600 px-2 py-1 text-xs"
                                  value={overrideReasons[item._id] || ""}
                                  onChange={(e) =>
                                    setOverrideReasons((prev) => ({
                                      ...prev,
                                      [item._id]: e.target.value,
                                    }))
                                  }
                                />
                              ) : (
                                item.moderationStatus
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[#1a2332] rounded-xl border border-gray-700 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-100 mb-4">New moderation sample</h3>
              <p className="text-xs text-gray-500 mb-4">
                Tip: open the{" "}
                <button
                  type="button"
                  className="text-indigo-400 underline"
                  onClick={() =>
                    navigate(`/oc-programs/${cohortId}/module-tracker?view=km`)
                  }
                >
                  module tracker
                </button>{" "}
                and use course / task IDs from there.
              </p>

              <label className="block text-sm text-gray-400 mb-1">Course ID (KM or PM module)</label>
              <input
                className="w-full mb-3 rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                value={createCourseId}
                onChange={(e) => setCreateCourseId(e.target.value)}
              />

              <label className="block text-sm text-gray-400 mb-1">Artifact</label>
              <select
                className="w-full mb-3 rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                value={createArtifact}
                onChange={(e) => setCreateArtifact(e.target.value)}
              >
                {ARTIFACT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {createArtifact === "qctopmt" && (
                <>
                  <label className="block text-sm text-gray-400 mb-1">PMT task ID</label>
                  <input
                    className="w-full mb-3 rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                    value={createPmtTaskId}
                    onChange={(e) => setCreatePmtTaskId(e.target.value)}
                  />
                </>
              )}

              <label className="block text-sm text-gray-400 mb-1">Sample % (min 25% recommended)</label>
              <input
                type="number"
                min={1}
                max={100}
                className="w-full mb-3 rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                value={targetPercentInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d+$/.test(v)) {
                    setTargetPercentInput(v);
                  }
                }}
                onBlur={() => {
                  if (targetPercentInput === "" || parsedTargetPercent == null) {
                    setTargetPercentInput("25");
                  }
                }}
              />

              {eligibilityLoading ? (
                <p className="text-sm text-gray-500 mb-3">Checking eligibility…</p>
              ) : eligibility ? (
                <div className="mb-4 p-3 rounded-lg bg-gray-900/50 text-sm text-gray-400">
                  <p>
                    <strong className="text-gray-300">{eligibility.population.length}</strong>{" "}
                    eligible (assessed + tutor signed off)
                  </p>
                  <p>
                    Recommended sample:{" "}
                    <strong className="text-gray-300">
                      {eligibility.recommendedSampleSize}
                    </strong>
                  </p>
                  {!eligibility.moderatorId && (
                    <p className="text-amber-400 mt-2">No moderator assigned to this cohort yet.</p>
                  )}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    creating ||
                    parsedTargetPercent == null ||
                    !eligibility?.population?.length
                  }
                  onClick={handleCreate}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Generate draft"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OCModerationSamplesPage;
