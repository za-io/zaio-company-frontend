import React, { useEffect, useState } from "react";
import {
  getBootcampConfig,
  getQctoSpLearningPaths,
  configureQctoSpBootcampAndEnroll,
  closeBootcampSpRegistration,
  reopenBootcampSpRegistration,
} from "../../api/company";

const toDateInput = (value) => (value ? String(value).split("T")[0] : "");

function matchSpLpSelection(paths, { skillsProgramId, bootcampLpId }) {
  if (!paths?.length) return "";
  if (skillsProgramId) {
    const byId = paths.find((lp) => (lp.skillsProgramId || "").trim() === skillsProgramId.trim());
    if (byId) return String(byId._id);
  }
  if (bootcampLpId) {
    const byLp = paths.find((lp) => String(lp._id) === String(bootcampLpId));
    if (byLp) return String(byLp._id);
  }
  return "";
}

export default function QctoSpBootcampConfigModal({ isOpen, onClose, bootcampId, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState(null);
  const [spLearningPaths, setSpLearningPaths] = useState([]);
  const [selectedSpLpId, setSelectedSpLpId] = useState("");
  const [skillsProgramId, setSkillsProgramId] = useState("");
  const [skillsProgramName, setSkillsProgramName] = useState("");
  const [spRegistrationDeadline, setSpRegistrationDeadline] = useState("");
  const [spRegistrationClosed, setSpRegistrationClosed] = useState(false);
  const [learnerCount, setLearnerCount] = useState(null);

  useEffect(() => {
    if (!isOpen || !bootcampId) return;
    setLoading(true);
    setMessage(null);
    Promise.all([getBootcampConfig(bootcampId), getQctoSpLearningPaths()])
      .then(([configRes, spRes]) => {
        const paths = spRes?.status === 200 && Array.isArray(spRes.allLps) ? spRes.allLps : [];
        setSpLearningPaths(paths);
        if (configRes?.success && configRes?.bootcamp) {
          const bc = configRes.bootcamp;
          const bootcampLpId = bc.learningpath?._id || bc.learningpath || "";
          const spId = bc.skillsProgramId || "";
          const spName = bc.skillsProgramName || "";
          setSkillsProgramId(spId);
          setSkillsProgramName(spName);
          setSpRegistrationDeadline(toDateInput(bc.spRegistrationDeadline));
          setSpRegistrationClosed(!!bc.spRegistrationClosed);
          setSelectedSpLpId(matchSpLpSelection(paths, { skillsProgramId: spId, bootcampLpId }));
        }
        setLearnerCount(configRes?.enrolledCount ?? null);
      })
      .finally(() => setLoading(false));
  }, [isOpen, bootcampId]);

  const handleSpLpSelect = (lpId) => {
    setSelectedSpLpId(lpId);
    if (!lpId) {
      setSkillsProgramName("");
      return;
    }
    const lp = spLearningPaths.find((item) => String(item._id) === String(lpId));
    if (lp) {
      setSkillsProgramId((prev) => (lp.skillsProgramId || prev || "").trim());
      setSkillsProgramName((lp.skillsProgramName || lp.learningpathname || "").trim());
    }
  };

  const handleConfigureAndEnroll = async () => {
    if (!selectedSpLpId) {
      setMessage({ type: "error", text: "Select a Skills Programme." });
      return;
    }
    if (!skillsProgramId.trim()) {
      setMessage({ type: "error", text: "Enter the QCTO Skills Programme ID." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const res = await configureQctoSpBootcampAndEnroll(bootcampId, {
      skillsProgramLearningPathId: selectedSpLpId,
      skillsProgramId: skillsProgramId.trim(),
      skillsProgramName: skillsProgramName.trim(),
      spRegistrationDeadline: spRegistrationDeadline || null,
    });
    setSubmitting(false);
    if (res?.success) {
      setMessage({
        type: "success",
        text: res.message || "Configured and learners enrolled in the learning path.",
      });
      onSuccess?.(res);
    } else {
      setMessage({ type: "error", text: res?.message || "Failed to configure." });
    }
  };

  const handleToggleRegistration = async () => {
    setClosing(true);
    setMessage(null);
    const res = spRegistrationClosed
      ? await reopenBootcampSpRegistration(bootcampId)
      : await closeBootcampSpRegistration(bootcampId);
    setClosing(false);
    if (res?.success) {
      setSpRegistrationClosed(!spRegistrationClosed);
      setMessage({
        type: "success",
        text: spRegistrationClosed ? "Registration reopened." : "Registration closed.",
      });
    } else {
      setMessage({ type: "error", text: res?.message || "Action failed." });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#161B22] rounded-xl border border-gray-700 max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-2">Configure QCTO Skills Programme</h2>
        <p className="text-gray-400 text-sm mb-4">
          Select the Skills Programme, set the registration deadline, then save. All learners in this bootcamp
          will be enrolled in the programme learning path.
          {learnerCount != null && (
            <span className="block mt-1 text-gray-300">{learnerCount} learner(s) in this bootcamp.</span>
          )}
        </p>

        {loading ? (
          <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Skills Programme</label>
              <select
                value={selectedSpLpId}
                onChange={(e) => handleSpLpSelect(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-[#0D1117] text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">— Select Skills Programme —</option>
                {spLearningPaths.map((lp) => (
                  <option key={lp._id} value={lp._id}>
                    {lp.skillsProgramName || lp.learningpathname}
                  </option>
                ))}
              </select>
              {spLearningPaths.length === 0 && (
                <p className="text-amber-400 text-xs mt-2">No qctosp learning paths found. Mark HTML Programmer first.</p>
              )}
            </div>

            {skillsProgramName && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Programme name</label>
                <input
                  type="text"
                  readOnly
                  value={skillsProgramName}
                  className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-[#0D1117]/60 text-gray-300"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">QCTO Skills Programme ID</label>
              <input
                type="text"
                value={skillsProgramId}
                onChange={(e) => setSkillsProgramId(e.target.value)}
                placeholder="Your QCTO-registered Skills Programme ID"
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-[#0D1117] text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Registration deadline</label>
              <input
                type="date"
                value={spRegistrationDeadline}
                onChange={(e) => setSpRegistrationDeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-600 bg-[#0D1117] text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-700">
              <span className="text-sm text-gray-300">
                Registration: <strong className={spRegistrationClosed ? "text-red-400" : "text-green-400"}>{spRegistrationClosed ? "Closed" : "Open"}</strong>
              </span>
              <button
                type="button"
                disabled={closing || !skillsProgramId.trim()}
                onClick={handleToggleRegistration}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                {closing ? "Working…" : spRegistrationClosed ? "Reopen registration" : "Close registration for QCTO"}
              </button>
            </div>
          </div>
        )}

        {message && (
          <p className={`text-sm mt-4 ${message.type === "error" ? "text-red-400" : "text-green-400"}`}>
            {message.text}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || loading}
            onClick={handleConfigureAndEnroll}
            className="px-4 py-2 rounded-lg font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving & enrolling…" : "Configure & enroll learners"}
          </button>
        </div>
      </div>
    </div>
  );
}
