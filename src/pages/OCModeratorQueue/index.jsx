import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createModerationReport,
  downloadModerationSampleManifest,
  getCohortLearnerPoeDocuments,
  getModerationSampleBatch,
  listMyModerationSamples,
  updateModerationSampleItemStatus,
  viewModerationReport,
} from "../../api/company";
import { buildQctoAssessorUrl } from "../OCQctoTrackerPage/qctoAssessorLinks";
import ModeratorSignaturePad from "./ModeratorSignaturePad";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

const STATUS_COLORS = {
  sent: "bg-blue-600/40 text-blue-200",
  in_progress: "bg-amber-600/40 text-amber-100",
  completed: "bg-green-600/40 text-green-200",
};

function itemStudentUserId(item) {
  if (item.studentId && typeof item.studentId === "object") {
    return String(item.studentId._id || "");
  }
  return String(item.studentId || "");
}

function DocumentLink({ doc, label }) {
  if (!doc?.hasFile || !doc.signedUrl) {
    return <span className="text-gray-500">—</span>;
  }
  return (
    <a
      href={doc.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-400 hover:text-indigo-300 underline"
      title={doc.fileName || label}
    >
      Open
    </a>
  );
}

function studentLabel(item) {
  if (item.studentName) return item.studentName;
  const s = item.studentId;
  if (s && typeof s === "object") {
    return s.username || s.email || "Student";
  }
  return "Student";
}

function reportField(report, key) {
  const val = report?.[key];
  return typeof val === "string" && val.trim() ? val.trim() : "";
}

function applySavedReportToForm(report, setters) {
  if (!report?.generatedAt) return;
  setters.setModeratorFirstName(report.moderatorFirstName || "");
  setters.setModeratorSurname(report.moderatorSurname || "");
  setters.setModeratorIdNumber(report.moderatorIdNumber || "");
  setters.setModeratorRegistrationId(report.moderatorRegistrationId || "");
  setters.setModeratorSignature(report.moderatorSignature || "");
  setters.setModeratorComments(report.moderatorComments || "");
}

function hasSavedReport(batch) {
  return Boolean(batch?.moderationReport?.generatedAt && batch?.moderationReport?.moderatorSignature);
}

function buildReviewUrls(item) {
  const studentId =
    typeof item.studentId === "object" ? item.studentId._id : item.studentId;

  if (item.submissionKind === "qcto_km" && item.kmArtifacts?.length) {
    return item.kmArtifacts
      .map((part) => {
        const url = buildQctoAssessorUrl(
          {
            kind: part.submissionKind,
            id: String(part.assessmentOrTaskId),
            lectureId: part.lectureId ? String(part.lectureId) : undefined,
          },
          String(studentId),
          true
        );
        const label =
          part.submissionKind === "qctosa"
            ? "Summative assessment"
            : "Learner workbook";
        return url ? { label, url } : null;
      })
      .filter(Boolean);
  }

  if (item.submissionKind === "qcto_pm" && item.pmArtifacts?.length) {
    return item.pmArtifacts
      .map((part) => {
        const url = buildQctoAssessorUrl(
          {
            kind: "qctopmt",
            id: String(part.assessmentOrTaskId),
            lectureId: part.lectureId ? String(part.lectureId) : undefined,
          },
          String(studentId),
          true
        );
        return url
          ? { label: part.pmtTaskTitle || "PMT task", url }
          : null;
      })
      .filter(Boolean);
  }

  const url = buildQctoAssessorUrl(
    {
      kind:
        item.submissionKind === "qctosa"
          ? "qctosa"
          : item.submissionKind === "qctopmt"
            ? "qctopmt"
            : "qctolw",
      id: String(item.assessmentOrTaskId),
      lectureId: item.lectureId ? String(item.lectureId) : undefined,
    },
    String(studentId),
    true
  );
  return url ? [{ label: "Open submission", url }] : [];
}

const OCModeratorQueuePage = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserStore();

  const [batches, setBatches] = useState([]);
  const [batch, setBatch] = useState(null);
  const [poeByStudentId, setPoeByStudentId] = useState({});
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [savingItemId, setSavingItemId] = useState(null);
  const [creatingReport, setCreatingReport] = useState(false);
  const [viewingReport, setViewingReport] = useState(false);
  const [regeneratingReport, setRegeneratingReport] = useState(false);
  const [signaturePadKey, setSignaturePadKey] = useState(0);
  const [moderatorFirstName, setModeratorFirstName] = useState("");
  const [moderatorSurname, setModeratorSurname] = useState("");
  const [moderatorIdNumber, setModeratorIdNumber] = useState("");
  const [moderatorRegistrationId, setModeratorRegistrationId] = useState("");
  const [moderatorSignature, setModeratorSignature] = useState("");
  const [moderatorComments, setModeratorComments] = useState("");

  const isModerator = user?.role === "MODERATOR";

  const allAgreed = useMemo(() => {
    const items = batch?.items || [];
    return items.length > 0 && items.every((it) => it.moderationStatus === "agree");
  }, [batch]);

  const loadList = useCallback(async () => {
    const res = await listMyModerationSamples();
    if (res?.success) {
      setBatches(res.data || []);
    }
  }, []);

  const loadBatch = useCallback(async (id) => {
    setBatchLoading(true);
    setPoeByStudentId({});
    setModeratorFirstName("");
    setModeratorSurname("");
    setModeratorIdNumber("");
    setModeratorRegistrationId("");
    setModeratorSignature("");
    setModeratorComments("");
    setRegeneratingReport(false);
    const res = await getModerationSampleBatch(id);
    if (res?.success) {
      setBatch(res.data);
      if (hasSavedReport(res.data)) {
        applySavedReportToForm(res.data.moderationReport, {
          setModeratorFirstName,
          setModeratorSurname,
          setModeratorIdNumber,
          setModeratorRegistrationId,
          setModeratorSignature,
          setModeratorComments,
        });
      }
      const cohortId = String(res.data.ocCohortId?._id || res.data.ocCohortId || "");
      if (cohortId) {
        try {
          const poeRes = await getCohortLearnerPoeDocuments(cohortId);
          if (poeRes?.success) {
            const map = {};
            for (const row of poeRes.data?.learners || []) {
              if (row.studentId) {
                map[row.studentId] = row.documents || {};
              }
            }
            setPoeByStudentId(map);
          }
        } catch {
          // POE links are optional; moderation can continue without them
        }
      }
    } else {
      alert(res?.message || "Could not load batch");
      navigate("/moderation-queue");
    }
    setBatchLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!isModerator) {
      setLoading(false);
      return;
    }
    loadList().finally(() => setLoading(false));
  }, [isModerator, loadList]);

  useEffect(() => {
    if (batchId && isModerator) {
      loadBatch(batchId);
    } else {
      setBatch(null);
    }
  }, [batchId, isModerator, loadBatch]);

  useEffect(() => {
    if (!batch?.moderationReport?.generatedAt || regeneratingReport) return;
    applySavedReportToForm(batch.moderationReport, {
      setModeratorFirstName,
      setModeratorSurname,
      setModeratorIdNumber,
      setModeratorRegistrationId,
      setModeratorSignature,
      setModeratorComments,
    });
  }, [batch?.moderationReport, regeneratingReport]);

  const handleModerationDecision = async (item, moderationStatus) => {
    if (!batch) return;
    const notes =
      moderationStatus === "disagree" || moderationStatus === "returned"
        ? window.prompt("Moderation notes (optional):") || ""
        : "";
    setSavingItemId(item._id);
    const res = await updateModerationSampleItemStatus(batch._id, item._id, {
      moderationStatus,
      moderationNotes: notes,
    });
    setSavingItemId(null);
    if (res?.success) {
      setBatch(res.data);
      await loadList();
    } else {
      alert(res?.message || "Could not save");
    }
  };

  const canCreateReport =
    moderatorFirstName.trim() &&
    moderatorSurname.trim() &&
    moderatorIdNumber.trim() &&
    moderatorRegistrationId.trim() &&
    moderatorSignature;

  const savedReport = hasSavedReport(batch);
  const savedReportData = batch?.moderationReport || {};
  const editingReport = !savedReport || regeneratingReport;

  const handleStartRegenerate = () => {
    if (!batch?.moderationReport) return;
    applySavedReportToForm(batch.moderationReport, {
      setModeratorFirstName,
      setModeratorSurname,
      setModeratorIdNumber,
      setModeratorRegistrationId,
      setModeratorSignature,
      setModeratorComments,
    });
    setModeratorSignature("");
    setSignaturePadKey((k) => k + 1);
    setRegeneratingReport(true);
  };

  const handleCancelRegenerate = () => {
    if (batch?.moderationReport) {
      applySavedReportToForm(batch.moderationReport, {
        setModeratorFirstName,
        setModeratorSurname,
        setModeratorIdNumber,
        setModeratorRegistrationId,
        setModeratorSignature,
        setModeratorComments,
      });
    }
    setRegeneratingReport(false);
  };

  const handleViewReport = async () => {
    if (!batch) return;
    setViewingReport(true);
    const res = await viewModerationReport(batch._id);
    setViewingReport(false);
    if (!res?.success) {
      alert(res?.message || "Could not open moderation report");
    }
  };

  const handleCreateReport = async () => {
    if (!batch || !allAgreed) return;
    if (!canCreateReport) {
      alert(
        "Please complete your name, surname, ID number, moderator ID, and signature before creating the report."
      );
      return;
    }
    setCreatingReport(true);
    const res = await createModerationReport(batch._id, {
      moderatorFirstName: moderatorFirstName.trim(),
      moderatorSurname: moderatorSurname.trim(),
      moderatorIdNumber: moderatorIdNumber.trim(),
      moderatorRegistrationId: moderatorRegistrationId.trim(),
      moderatorSignature,
      moderatorComments: moderatorComments.trim(),
      regenerate: regeneratingReport,
    });
    setCreatingReport(false);
    if (res?.success) {
      setRegeneratingReport(false);
      await loadBatch(batch._id);
    } else {
      alert(res?.message || "Could not create moderation report");
    }
  };

  const reportDateLabel =
    savedReport && !regeneratingReport && batch?.moderationReport?.generatedAt
      ? new Date(batch.moderationReport.generatedAt).toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-6 py-10 text-gray-300">
        Moderator access only.
      </div>
    );
  }

  if (batchId) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-6 md:px-12 lg:px-24 py-10">
        <div className="max-w-7xl mx-auto">
          <button
            type="button"
            onClick={() => navigate("/moderation-queue")}
            className="text-sm text-gray-400 hover:text-gray-200 mb-6"
          >
            ← Back to moderation queue
          </button>

          {batchLoading || !batch ? (
            <Loader />
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-100">{batch.label}</h1>
                  <p className="text-gray-500 text-sm mt-1">
                    {batch.cohortName} · {batch.sampleCount} learners in sample
                  </p>
                  {batch.notes && (
                    <p className="text-sm text-gray-400 mt-2 border-l-2 border-indigo-500 pl-3">
                      {batch.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 h-fit">
                  {savedReport && !regeneratingReport && (
                    <button
                      type="button"
                      onClick={handleStartRegenerate}
                      className="px-4 py-1.5 text-sm rounded-lg bg-amber-700 hover:bg-amber-600 text-white"
                    >
                      Regenerate report
                    </button>
                  )}
                  {savedReport && (
                    <button
                      type="button"
                      disabled={viewingReport}
                      onClick={handleViewReport}
                      className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                    >
                      {viewingReport ? "Opening report…" : "View report"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadModerationSampleManifest(batch._id)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    Download CSV manifest
                  </button>
                </div>
              </div>

              {savedReport && !regeneratingReport && (
                <p className="text-sm text-green-400/90 mb-4">
                  Moderation report saved on{" "}
                  {new Date(batch.moderationReport.generatedAt).toLocaleString("en-ZA")}.
                </p>
              )}
              {regeneratingReport && (
                <p className="text-sm text-amber-400/90 mb-4">
                  Update the details below and sign again to regenerate the moderation report.
                </p>
              )}

              <div className="rounded-xl border border-gray-700/50 overflow-x-auto">
                <table className="w-full text-sm min-w-[960px]">
                  <thead className="bg-gray-800/50 text-gray-500 text-left">
                    <tr>
                      <th className="px-4 py-3">Learner</th>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">CV</th>
                      <th className="px-4 py-3">Qualification</th>
                      <th className="px-4 py-3">Review</th>
                      <th className="px-4 py-3">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(batch.items || []).map((item) => {
                      const reviewLinks = buildReviewUrls(item);
                      const poe = poeByStudentId[itemStudentUserId(item)] || {};
                      return (
                        <tr key={item._id} className="border-t border-gray-800/60">
                          <td className="px-4 py-3 text-gray-300">{studentLabel(item)}</td>
                          <td className="px-4 py-3">
                            <DocumentLink doc={poe.certifiedIdCopy} label="Student ID" />
                          </td>
                          <td className="px-4 py-3">
                            <DocumentLink doc={poe.cv} label="CV" />
                          </td>
                          <td className="px-4 py-3">
                            <DocumentLink
                              doc={poe.highestQualifications}
                              label="Qualification"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {reviewLinks.length ? (
                              <div className="flex flex-col gap-1">
                                {reviewLinks.map((link) => (
                                  <a
                                    key={link.url}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-400 hover:text-indigo-300 underline"
                                  >
                                    {link.label} (read-only)
                                  </a>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {["agree", "disagree", "returned"].map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  disabled={savingItemId === item._id}
                                  onClick={() => handleModerationDecision(item, st)}
                                  className={`px-2 py-1 rounded text-xs capitalize ${
                                    item.moderationStatus === st
                                      ? "bg-indigo-600 text-white"
                                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                            {item.moderationNotes && (
                              <p className="text-xs text-gray-500 mt-1">{item.moderationNotes}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(savedReport || allAgreed) && (
                <div className="mt-8 rounded-xl border border-gray-700/50 bg-gray-800/20 p-6">
                  <h2 className="text-lg font-medium text-gray-100 mb-1">
                    Moderator signature and date
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    {editingReport
                      ? regeneratingReport
                        ? "Update your details and sign again to regenerate the moderation report."
                        : "Enter your details and sign below to complete the moderation report."
                      : "Saved moderator details for this moderation report."}
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 mb-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Name {editingReport && <span className="text-red-400">*</span>}
                      </label>
                      {editingReport ? (
                        <input
                          type="text"
                          className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                          value={moderatorFirstName}
                          onChange={(e) => setModeratorFirstName(e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-200">
                          {reportField(savedReportData, "moderatorFirstName") || "—"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Surname {editingReport && <span className="text-red-400">*</span>}
                      </label>
                      {editingReport ? (
                        <input
                          type="text"
                          className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                          value={moderatorSurname}
                          onChange={(e) => setModeratorSurname(e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-200">
                          {reportField(savedReportData, "moderatorSurname") || "—"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        ID number {editingReport && <span className="text-red-400">*</span>}
                      </label>
                      {editingReport ? (
                        <input
                          type="text"
                          className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                          value={moderatorIdNumber}
                          onChange={(e) => setModeratorIdNumber(e.target.value)}
                        />
                      ) : (
                        <p className="text-gray-200">
                          {reportField(savedReportData, "moderatorIdNumber") || "—"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Moderator ID {editingReport && <span className="text-red-400">*</span>}
                      </label>
                      {editingReport ? (
                        <input
                          type="text"
                          className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-gray-200"
                          value={moderatorRegistrationId}
                          onChange={(e) => setModeratorRegistrationId(e.target.value)}
                          placeholder="Your accredited moderator registration number"
                        />
                      ) : (
                        <p className="text-gray-200">
                          {reportField(savedReportData, "moderatorRegistrationId") || "—"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Date</p>
                      <p className="text-gray-200">{reportDateLabel}</p>
                    </div>
                  </div>

                  <label className="block text-sm text-gray-400 mb-2">
                    Signature {editingReport && <span className="text-red-400">*</span>}
                  </label>
                  {editingReport ? (
                    <ModeratorSignaturePad
                      key={signaturePadKey}
                      onSignatureChange={setModeratorSignature}
                    />
                  ) : (
                    savedReportData.moderatorSignature && (
                      <img
                        src={savedReportData.moderatorSignature}
                        alt="Moderator signature"
                        className="max-w-[480px] h-[140px] rounded-lg border border-gray-600 bg-[#0f1419] object-contain"
                      />
                    )
                  )}

                  <label className="block text-sm text-gray-400 mt-6 mb-2">
                    Moderator remarks {!editingReport ? "" : "(optional)"}
                  </label>
                  {editingReport ? (
                    <textarea
                      className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm text-gray-200 min-h-[100px]"
                      value={moderatorComments}
                      onChange={(e) => setModeratorComments(e.target.value)}
                      placeholder="Any additional comments for the moderation report…"
                    />
                  ) : (
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                      {reportField(savedReportData, "moderatorComments") || "None."}
                    </p>
                  )}

                  {editingReport && (
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={creatingReport || !canCreateReport}
                        onClick={handleCreateReport}
                        className="px-5 py-2 text-sm rounded-lg bg-green-700 hover:bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingReport
                          ? regeneratingReport
                            ? "Regenerating report…"
                            : "Creating report…"
                          : regeneratingReport
                            ? "Regenerate moderation report"
                            : "Create moderation report"}
                      </button>
                      {regeneratingReport && (
                        <button
                          type="button"
                          onClick={handleCancelRegenerate}
                          className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200"
                        >
                          Cancel
                        </button>
                      )}
                      {!canCreateReport && (
                        <p className="text-sm text-amber-400/90">
                          Complete all moderator details and draw your signature to enable report
                          creation.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] px-6 md:px-12 lg:px-24 py-10">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/oc-programs")}
          className="text-sm text-gray-400 hover:text-gray-200 mb-6"
        >
          ← OC Programs
        </button>

        <h1 className="text-2xl font-semibold text-gray-100 mb-2">Moderation queue</h1>
        <p className="text-gray-500 text-sm mb-8">
          Samples sent to you by student admin. Moderate only listed learners.
        </p>

        {loading ? (
          <Loader />
        ) : !batches.length ? (
          <p className="text-gray-500">No moderation samples assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {batches.map((b) => {
              const done = (b.items || []).filter(
                (it) => it.moderationStatus && it.moderationStatus !== "pending"
              ).length;
              const total = b.sampleCount || (b.items || []).length;
              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => navigate(`/moderation-queue/${b._id}`)}
                  className="w-full text-left rounded-xl border border-gray-700/50 bg-gray-800/30 px-5 py-4 hover:border-indigo-500/40 transition-colors"
                >
                  <div className="font-medium text-gray-200">{b.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{b.cohortName}</div>
                  <div className="flex items-center gap-3 mt-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[b.status] || ""}`}
                    >
                      {b.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {done}/{total} moderated
                    </span>
                    {b.sentAt && (
                      <span className="text-xs text-gray-600">
                        Sent {new Date(b.sentAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OCModeratorQueuePage;
