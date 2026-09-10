import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { roundOff } from "../../utils/mathUtils";
import { blockUser, unblockUser, updateTutor, updateBootcampEnrollmentStatus, ENROLLMENT_STATUS_OPTIONS } from "../../api/student";
import Loader from "../../components/loader/loader";
import { SORTING } from "./learningpath.index";
import { formatDate } from "../../utils/dateUtils";
import { StudentPingModal } from "./StudentPingModal";
import { getAllTutors, getEditTilesToken, updateBootcampAllocatedTutors, syncStudentToAthena } from "../../api/company";
import { StudentMoreActionsModal } from "./StudentMoreActions";
import { RxCheckCircled } from "react-icons/rx";
import { HiOutlineClipboardDocument } from "react-icons/hi2";

const getClassroomConnectionStatus = (row) => {
  const linked =
    row?.googleClassroomLinked ||
    (row?.linkedGoogleClassroomCourseId && String(row.linkedGoogleClassroomCourseId).trim());
  if (linked) {
    return {
      label: "Connected",
      className: "text-green-400",
      title: "Google Classroom linked to this bootcamp",
    };
  }
  if (row?.userid?.googleClassroomSignedIn) {
    return {
      label: "Signed in",
      className: "text-amber-400",
      title: "Signed in to Google but classroom not linked to this bootcamp",
    };
  }
  return {
    label: "Not connected",
    className: "text-gray-500",
    title: "Google Classroom not connected",
  };
};

const getAuthMethodDisplay = (user) => {
  if (user?.authMethod) {
    return user.authMethod;
  }
  const sso = (user?.sso || "none").toLowerCase();
  const studentNumber = user?.studentNumber && String(user.studentNumber).trim();
  if (sso === "googlelogin") return "GoogleAuth";
  if (studentNumber) return "Student number";
  return "Email";
};

const getAuthMethodStyle = (method) => {
  switch (method) {
    case "GoogleAuth":
      return "text-blue-400";
    case "Student number":
      return "text-violet-400";
    default:
      return "text-gray-400";
  }
};

const getAthenaSyncStatus = (row) => {
  if (row?.athenaSyncedAt) {
    return {
      label: "Synced",
      className: "text-emerald-400",
      title: row?.athenaUserId
        ? `Synced to Athena (${row.athenaUserId})`
        : `Synced ${formatDate(row.athenaSyncedAt)}`,
      needsEnroll: false,
    };
  }
  if (row?.athenaSyncError) {
    return {
      label: "Failed",
      className: "text-red-400",
      title: row.athenaSyncError,
      needsEnroll: true,
    };
  }
  return {
    label: "Not synced",
    className: "text-gray-500",
    title: "Not added to Athena cohort yet",
    needsEnroll: true,
  };
};

const ENROLLMENT_STATUS_LABELS = {
  in_progress: "In progress",
  in_grace_period: "Grace period",
  pass: "Pass",
  supp: "Supp",
  transfer_pending: "Transfer-pending",
  transfer_complete: "Transfer-complete",
  deferred: "Deferred",
  deferred_optin: "Deferred-optin",
  dropped_off: "Dropped off",
};

const getEnrollmentStatusDisplay = (status) => {
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
};

const DEFERRED_ENROLLMENT_STATUSES = new Set(["deferred", "deferred_optin", "in_grace_period"]);

const isDeferredEnrollment = (ba) =>
  DEFERRED_ENROLLMENT_STATUSES.has(ba?.enrollmentStatus) ||
  Boolean(ba?.deferredDetails?.studentDeferred);

const AnalyticsTable = ({
  data,
  total,
  loading,
  searchType,
  getAnalytics,
  user,
}) => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(
    () => String(searchParams.get("q") || searchParams.get("email") || "").trim()
  );
  const [rowLoading, setRowLoading] = useState(false);
  const [enrollmentStatusSaving, setEnrollmentStatusSaving] = useState(null);
  const [athenaSyncSaving, setAthenaSyncSaving] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    if (!text || text === "—") return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleAthenaSync = async (event, ba) => {
    event.stopPropagation();
    const bootcampId = data?.bootcampDetails?._id;
    const userId = ba?.userid?._id;
    if (!bootcampId || !userId) return;

    setAthenaSyncSaving(String(userId));
    try {
      const res = await syncStudentToAthena({ bootcampId, userId });
      if (res?.success) {
        getAnalytics();
      } else {
        alert(res?.message || "Failed to enroll in Athena");
      }
    } catch {
      alert("Failed to enroll in Athena");
    } finally {
      setAthenaSyncSaving(null);
    }
  };

  const handleEnrollmentStatusChange = async (event, ba) => {
    event.stopPropagation();
    const bootcampId = data?.bootcampDetails?._id;
    const userId = ba?.userid?._id;
    const nextStatus = event.target.value;
    if (!bootcampId || !userId || !nextStatus || nextStatus === ba?.enrollmentStatus) return;

    setEnrollmentStatusSaving(String(userId));
    try {
      const res = await updateBootcampEnrollmentStatus(bootcampId, userId, nextStatus);
      if (res?.success) {
        getAnalytics();
      } else {
        alert(res?.message || "Failed to update enrollment status");
      }
    } catch {
      alert("Failed to update enrollment status");
    } finally {
      setEnrollmentStatusSaving(null);
    }
  };

  const [sortBy, setSortBy] = useState(SORTING.PROGRESS_DESC);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(null);

  const [studentPingModalConfig, setStudentPingModalConfig] = useState(null);
  /** Full tutor directory (for “Add to bootcamp” picker only). */
  const [allTutorsCatalog, setAllTutorsCatalog] = useState([]);
  const [allocateSaving, setAllocateSaving] = useState(false);
  const [addTutorPick, setAddTutorPick] = useState("");
  /** user ids (strings) selected for bulk tutor assignment — bootcamp view only */
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkTutorId, setBulkTutorId] = useState("");
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const selectAllCheckboxRef = useRef(null);

  const navigate = useNavigate();
  const handleBootcamp = (bootcampId, learningpathId, userid) => {
    navigate(
      `/student/bootcamp/${bootcampId}/learningpath/${learningpathId}?user_id=${userid}`
    );
  };

  const handleLearningpath = (learningpathId) => {
    navigate(
      `/student/learningpath/${learningpathId}?user_id=636d6613a75d3600222f1875`
    );
  };

  const handleCourse = (courseId, type) => {
    navigate(`/student/course/${courseId}/${type}`);
  };

  const handleBlockUnBlock = async (e, user) => {
    e?.preventDefault();
    console.log(user);
    setRowLoading(user?.userid?._id);
    if (user?.userid?.accBlocked) {
      await unblockUser({
        userid: user?.userid?._id,
      });
    } else {
      await blockUser({
        userid: user?.userid?._id,
      });
    }
    getAnalytics();
    setRowLoading(null);
  };

  const handleChange = (event) => {
    setSortBy(event.target.value);
  };

  const fetchTutors = async () => {
    const res = await getAllTutors();
    setAllTutorsCatalog(res?.data || []);
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  const tutorsForAssignment = useMemo(
    () => (Array.isArray(data?.bootcampDetails?.tutors) ? data.bootcampDetails.tutors : []),
    [data?.bootcampDetails?.tutors]
  );

  const showBootcampTutorManage =
    searchType === "bootcamp" && user?.role !== "TUTOR" && Boolean(data?.bootcampDetails?._id);

  const showAthenaColumn = searchType === "bootcamp" && Boolean(data?.bootcampDetails?.athenaEnabled);
  const canManageAthena = showAthenaColumn && !["TUTOR"]?.includes(user?.role);

  const tutorsAvailableToAdd = useMemo(() => {
    const alloc = new Set(tutorsForAssignment.map((t) => String(t._id)));
    return (allTutorsCatalog || []).filter((t) => t?._id && !alloc.has(String(t._id)));
  }, [allTutorsCatalog, tutorsForAssignment]);

  const persistAllocatedTutorIds = async (ids) => {
    const bootcampId = data?.bootcampDetails?._id;
    if (!bootcampId) return;
    setAllocateSaving(true);
    try {
      const res = await updateBootcampAllocatedTutors({
        bootcampId,
        tutorIds: ids,
      });
      if (res?.success) {
        setAddTutorPick("");
        getAnalytics();
      } else {
        window.alert(res?.message || "Could not update bootcamp tutors");
      }
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || "Request failed");
    } finally {
      setAllocateSaving(false);
    }
  };

  const removeAllocatedTutor = (tutorId) => {
    if (
      !window.confirm(
        "Remove this tutor from the bootcamp list? They will disappear from assign dropdowns; students already assigned keep their tutor until you change it."
      )
    ) {
      return;
    }
    const next = tutorsForAssignment.filter((t) => String(t._id) !== String(tutorId)).map((t) => String(t._id));
    persistAllocatedTutorIds(next);
  };

  const addSelectedTutorToBootcamp = () => {
    if (!addTutorPick) return;
    const next = [...tutorsForAssignment.map((t) => String(t._id)), addTutorPick];
    persistAllocatedTutorIds(next);
  };

  const filteredSortedAnalytics = useMemo(() => {
    const raw = data?.analytics || [];
    const filtered = raw.filter(
      (ba) =>
        ba?.userid?.username?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        ba?.userid?.email?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
        (ba?.userid?.studentNumber || "")?.toLowerCase()?.includes(searchQuery?.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const aTotalProgress = a?.isbootCampPassed ? 100 : (a?.completedPercentage || 0);
      const bTotalProgress = b?.isbootCampPassed ? 100 : (b?.completedPercentage || 0);

      if (sortBy === SORTING.PROGRESS_DESC) {
        return bTotalProgress - aTotalProgress;
      }
      if (sortBy === SORTING.PROGRESS_ASC) {
        return aTotalProgress - bTotalProgress;
      }
      if (sortBy === SORTING.DEFERRED_ASC) {
        return Number(isDeferredEnrollment(b)) - Number(isDeferredEnrollment(a));
      }
      if (sortBy === SORTING.DEFERRED_DESC) {
        return Number(isDeferredEnrollment(a)) - Number(isDeferredEnrollment(b));
      }
      return 0;
    });
  }, [data?.analytics, searchQuery, sortBy]);

  const showBulkTutorTools =
    searchType === "bootcamp" && !["TUTOR", "COMPANY_ADMIN"]?.includes(user?.role);
  const visibleUserIdStrings = useMemo(
    () =>
      filteredSortedAnalytics.map((ba) => (ba?.userid?._id != null ? String(ba.userid._id) : null)).filter(Boolean),
    [filteredSortedAnalytics]
  );

  useEffect(() => {
    setSelectedUserIds([]);
  }, [searchQuery]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el || !showBulkTutorTools) return;
    const n = visibleUserIdStrings.length;
    const sel = visibleUserIdStrings.filter((id) => selectedUserIds.includes(id)).length;
    el.indeterminate = sel > 0 && sel < n;
  }, [selectedUserIds, visibleUserIdStrings, showBulkTutorTools]);

  const allVisibleSelected =
    visibleUserIdStrings.length > 0 && visibleUserIdStrings.every((id) => selectedUserIds.includes(id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds([...visibleUserIdStrings]);
    }
  };

  const toggleRowSelected = (userId) => {
    if (!userId) return;
    const id = String(userId);
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkAssignTutor = async () => {
    const bootcampId = data?.bootcampDetails?._id;
    if (!bulkTutorId || !bootcampId || selectedUserIds.length === 0) return;
    const tutorLabel =
      tutorsForAssignment?.find((t) => String(t._id) === String(bulkTutorId))?.company_username ||
      tutorsForAssignment?.find((t) => String(t._id) === String(bulkTutorId))?.email ||
      "this tutor";
    if (
      !window.confirm(
        `Assign ${selectedUserIds.length} student(s) to ${tutorLabel}? Existing tutor assignments will be replaced.`
      )
    ) {
      return;
    }
    setBulkAssigning(true);
    let ok = 0;
    let failed = 0;
    for (const uid of selectedUserIds) {
      try {
        const res = await updateTutor({
          userid: uid,
          bootcampid: bootcampId,
          newAssignedTutor: bulkTutorId,
        });
        if (res?.success) ok++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setBulkAssigning(false);
    setSelectedUserIds([]);
    setBulkTutorId("");
    if (failed > 0) {
      window.alert(`Updated ${ok} student(s). ${failed} failed (check enrollment).`);
    } else {
      window.alert(`Assigned tutor to ${ok} student(s).`);
    }
    getAnalytics();
  };

  if (loading) return <></>;

  const deferredCount = data?.analytics?.filter(isDeferredEnrollment)?.length || 0;
  const totalStudents = data?.analytics?.length || 0;

  return (
    <div>
      <StudentMoreActionsModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={showMoreActionsModal}
        setShowModal={setShowMoreActionsModal}
        tutorsForAssignment={tutorsForAssignment}
        getAnalytics={getAnalytics}
      />

      <StudentPingModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={studentPingModalConfig}
        setShowModal={setStudentPingModalConfig}
        getAnalytics={getAnalytics}
      />

      {data?.analytics?.length > 0 && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 overflow-hidden">
          {/* Table Header Section */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Bootcamp Title */}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {data?.bootcampDetails?.bootcampName || "Bootcamp Analytics"}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {totalStudents} student{totalStudents !== 1 ? "s" : ""} enrolled
                  {deferredCount > 0 && (
                    <span className="text-yellow-500 ml-2">
                      ({deferredCount} deferred)
                    </span>
                  )}
                  {showAthenaColumn && data?.bootcampDetails?.athenaCohortName && (
                    <span className="text-emerald-500 ml-2">
                      · Athena: {data.bootcampDetails.athenaCohortName}
                    </span>
                  )}
                </p>
                {searchType === "bootcamp" && (
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      Tutors on this bootcamp
                    </p>
                    <p className="text-[11px] text-gray-500 mb-2 leading-relaxed max-w-xl">
                      Only tutors listed here appear when you assign a tutor to a student (bulk or Actions).{" "}
                      {showBootcampTutorManage ? "Add or remove tutors below." : ""}
                    </p>
                    {tutorsForAssignment.length === 0 && (
                      <p className="text-xs text-gray-500 mb-2">
                        No tutors allocated yet.
                        {showBootcampTutorManage && " Add at least one tutor to enable assignments."}
                      </p>
                    )}
                    <ul className="flex flex-wrap gap-2">
                      {tutorsForAssignment.map((t) => {
                        const id = t?._id != null ? String(t._id) : "";
                        const label =
                          (t?.company_username && String(t.company_username).trim()) ||
                          (t?.email && String(t.email).trim()) ||
                          id ||
                          "Tutor";
                        const sub = t?.email && t?.company_username ? t.email : null;
                        return (
                          <li
                            key={id || label}
                            className="inline-flex flex-col px-2.5 py-1.5 rounded-lg bg-[#21262d] border border-gray-700 text-left max-w-[220px] relative pr-7"
                          >
                            {showBootcampTutorManage && id && (
                              <button
                                type="button"
                                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-white/5 text-lg leading-none"
                                title="Remove from bootcamp list"
                                disabled={allocateSaving}
                                onClick={() => removeAllocatedTutor(id)}
                              >
                                ×
                              </button>
                            )}
                            <span className="text-sm text-white font-medium truncate" title={label}>
                              {label}
                            </span>
                            {sub && (
                              <span className="text-[11px] text-gray-400 truncate" title={sub}>
                                {sub}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    {showBootcampTutorManage && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={addTutorPick}
                          onChange={(e) => setAddTutorPick(e.target.value)}
                          disabled={allocateSaving || tutorsAvailableToAdd.length === 0}
                          className="px-3 py-2 bg-[#0D1117] text-gray-300 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                        >
                          <option value="">
                            {tutorsAvailableToAdd.length === 0 ? "No more tutors to add" : "Add a tutor…"}
                          </option>
                          {tutorsAvailableToAdd.map((t) => (
                            <option key={String(t._id)} value={String(t._id)}>
                              {t.company_username || t.email || String(t._id)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!addTutorPick || allocateSaving}
                          onClick={addSelectedTutorToBootcamp}
                          className="px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {allocateSaving ? "Saving…" : "Add to bootcamp"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    list="browsers"
                    value={searchQuery}
                    placeholder="Search by name, email or student #..."
                    onChange={(e) => setSearchQuery(e?.target?.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-[#0D1117] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  />
                  <datalist id="browsers">
                    {data?.analytics?.map((d, idx) => (
                      <option key={idx} value={d?.userid?.username} />
                    ))}
                    {data?.analytics?.map((d, idx) =>
                      d?.userid?.studentNumber ? (
                        <option key={`sn-${idx}`} value={d?.userid?.studentNumber} />
                      ) : null
                    )}
                  </datalist>
                </div>

                {/* Sort Select */}
                <select
                  className="px-4 py-2.5 bg-[#0D1117] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  value={sortBy}
                  onChange={handleChange}
                >
                  <option value={SORTING.PROGRESS_DESC} className="bg-[#161B22]">
                    Progress (High to Low)
                  </option>
                  <option value={SORTING.PROGRESS_ASC} className="bg-[#161B22]">
                    Progress (Low to High)
                  </option>
                  <option value={SORTING.DEFERRED_ASC} className="bg-[#161B22]">
                    Deferred First
                  </option>
                  <option value={SORTING.DEFERRED_DESC} className="bg-[#161B22]">
                    Active First
                  </option>
                </select>
              </div>
            </div>

            {showBulkTutorTools && filteredSortedAnalytics.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="rounded border-gray-600 bg-[#0D1117] text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Select all <span className="text-gray-500">({filteredSortedAnalytics.length} visible)</span>
                  </span>
                </label>
                <span className="text-gray-600">|</span>
                <span className="text-sm text-gray-400">
                  {selectedUserIds.length} selected
                </span>
                <select
                  value={bulkTutorId}
                  onChange={(e) => setBulkTutorId(e.target.value)}
                  disabled={bulkAssigning}
                  className="px-3 py-2 bg-[#0D1117] text-gray-300 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[200px]"
                >
                  <option value="">
                    {tutorsForAssignment.length === 0
                      ? "Add tutors to this bootcamp first…"
                      : "Choose tutor to assign…"}
                  </option>
                  {(tutorsForAssignment || []).map((tutor) => (
                    <option key={String(tutor._id)} value={String(tutor._id)}>
                      {tutor.company_username || tutor.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={bulkAssigning || !bulkTutorId || selectedUserIds.length === 0}
                  onClick={handleBulkAssignTutor}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {bulkAssigning ? "Assigning…" : "Assign tutor to selected"}
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0D1117]">
                <tr>
                  {showBulkTutorTools && (
                    <th className="w-10 px-2 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <span className="sr-only">Select</span>
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Student #
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Auth
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Enrollment
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Tutor
                  </th>
                  {searchType === "bootcamp" && (
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Classroom
                    </th>
                  )}
                  {showAthenaColumn && (
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Athena
                    </th>
                  )}
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Calendar
                  </th>
                  {!["TUTOR"]?.includes(user?.role) && (
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  {!["TUTOR"]?.includes(user?.role) && (
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Ping
                    </th>
                  )}
                  {!["TUTOR"]?.includes(user?.role) && (
                    <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredSortedAnalytics.map((ba) => {
                    const totalProgress = ba?.isbootCampPassed ? 100 : (ba?.completedPercentage || 0);
                    const isCompleted = ba?.completedPercentage === 100 || ba?.isbootCampPassed;
                    const isDeferred = isDeferredEnrollment(ba);
                    const isBlocked = ba?.userid?.accBlocked;

                    const rowUserId = ba?.userid?._id != null ? String(ba.userid._id) : "";
                    const rowSelected = rowUserId && selectedUserIds.includes(rowUserId);

                    return (
                      <tr
                        key={ba?._id}
                        className={`hover:bg-[#1C2128] cursor-pointer transition-colors duration-150 ${
                          isDeferred ? "bg-yellow-900/10" : ""
                        }`}
                        onClick={() => {
                          searchType === "bootcamp" &&
                            handleBootcamp(
                              data.bootcampDetails._id,
                              data.bootcampDetails.learningpath,
                              ba?.userid?._id
                            );
                          searchType === "learningpath" &&
                            handleLearningpath(data._id);
                        }}
                      >
                        {showBulkTutorTools && (
                          <td
                            className="w-10 px-2 py-4 align-middle text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={rowSelected}
                              onChange={() => toggleRowSelected(ba?.userid?._id)}
                              className="rounded border-gray-600 bg-[#0D1117] text-blue-600 focus:ring-blue-500"
                              aria-label={`Select ${ba?.userid?.username || "student"}`}
                            />
                          </td>
                        )}
                        {/* Student Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {isCompleted && (
                              <span className="text-green-500 flex-shrink-0">
                                <RxCheckCircled className="w-5 h-5" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {ba?.userid?.username}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs text-gray-500 truncate">
                                  {ba?.userid?.email}
                                </p>
                                {ba?.userid?.email && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(ba?.userid?.email, `email-${ba?._id}`);
                                    }}
                                    className={`flex-shrink-0 p-0.5 rounded transition-colors ${
                                      copiedId === `email-${ba?._id}` ? "text-green-400" : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
                                    }`}
                                    title={copiedId === `email-${ba?._id}` ? "Copied!" : "Copy email"}
                                  >
                                    <HiOutlineClipboardDocument className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Student Number */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-gray-400">
                              {ba?.userid?.studentNumber || "—"}
                            </span>
                            {ba?.userid?.studentNumber && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(ba?.userid?.studentNumber, `sn-${ba?._id}`);
                                }}
                                className={`flex-shrink-0 p-0.5 rounded transition-colors ${
                                  copiedId === `sn-${ba?._id}` ? "text-green-400" : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
                                }`}
                                title={copiedId === `sn-${ba?._id}` ? "Copied!" : "Copy student number"}
                              >
                                <HiOutlineClipboardDocument className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Auth method */}
                        <td className="px-4 py-4">
                          {(() => {
                            const authMethod = getAuthMethodDisplay(ba?.userid);
                            return (
                              <span
                                className={`text-sm font-medium whitespace-nowrap ${getAuthMethodStyle(authMethod)}`}
                                title={`Sign-in method: ${authMethod}`}
                              >
                                {authMethod}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Progress */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 w-24">
                              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    totalProgress >= 100
                                      ? "bg-green-500"
                                      : totalProgress >= 50
                                      ? "bg-blue-500"
                                      : totalProgress >= 25
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(totalProgress, 100)}%` }}
                                />
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${
                              totalProgress >= 100 ? "text-green-400" : "text-gray-300"
                            }`}>
                              {roundOff(totalProgress)}%
                            </span>
                          </div>
                        </td>

                        {/* Enrollment lifecycle status */}
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          {searchType === "bootcamp" && !["TUTOR"]?.includes(user?.role) ? (
                            <select
                              value={ba?.enrollmentStatus || "in_progress"}
                              onChange={(e) => handleEnrollmentStatusChange(e, ba)}
                              disabled={enrollmentStatusSaving === String(ba?.userid?._id)}
                              className="min-w-[160px] px-2 py-1.5 rounded-lg text-xs font-medium border border-gray-600 bg-[#0D1117] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                              title="Change enrollment status"
                            >
                              {ENROLLMENT_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            (() => {
                              const { label, className } = getEnrollmentStatusDisplay(ba?.enrollmentStatus);
                              return (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>
                                  {label}
                                </span>
                              );
                            })()
                          )}
                        </td>

                        {/* Tutor */}
                        <td className="px-4 py-4">
                          <span className={`text-sm ${
                            ba?.tutor ? "text-gray-300" : "text-gray-500 italic"
                          }`}>
                            {ba?.tutor?.company_username || ba?.tutor?.email || "Not Assigned"}
                          </span>
                        </td>

                        {searchType === "bootcamp" && (
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const status = getClassroomConnectionStatus(ba);
                              return (
                                <span
                                  className={`text-sm font-medium ${status.className}`}
                                  title={status.title}
                                >
                                  {status.label}
                                </span>
                              );
                            })()}
                          </td>
                        )}

                        {showAthenaColumn && (
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1.5 items-start">
                              {(() => {
                                const status = getAthenaSyncStatus(ba);
                                return (
                                  <span
                                    className={`text-sm font-medium ${status.className}`}
                                    title={status.title}
                                  >
                                    {status.label}
                                  </span>
                                );
                              })()}
                              {canManageAthena && getAthenaSyncStatus(ba).needsEnroll && (
                                <button
                                  type="button"
                                  className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                  disabled={athenaSyncSaving === String(ba?.userid?._id)}
                                  onClick={(e) => handleAthenaSync(e, ba)}
                                >
                                  {athenaSyncSaving === String(ba?.userid?._id)
                                    ? "Enrolling…"
                                    : "Enroll in Athena"}
                                </button>
                              )}
                            </div>
                          </td>
                        )}

                        {/* View Calendar / Student Profile */}
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <button
                              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-medium transition-colors"
                              onClick={async (event) => {
                                event.stopPropagation();
                                const baseUrl = `https://www.zaio.io/app/zaio-profile/${ba?.userid?.email}`;
                                const canEditTiles = ["SUPER_STUDENT_ADMIN", "SUPER_ADMIN", "COMPANY_ADMIN"].includes(user?.role);
                                if (canEditTiles && ba?.userid?.email) {
                                  try {
                                    const res = await getEditTilesToken(ba.userid.email);
                                    const qs = res?.success && res?.token ? `?editTiles=${encodeURIComponent(res.token)}` : "";
                                    window.open(baseUrl + qs, "_blank");
                                  } catch {
                                    window.open(baseUrl, "_blank");
                                  }
                                } else {
                                  window.open(baseUrl, "_blank");
                                }
                              }}
                            >
                              View
                            </button>
                            <button
                              className="px-3 py-1.5 bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 rounded-lg text-xs font-medium transition-colors"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (ba?.userid?._id) {
                                  navigate(`/student-profile/${ba.userid._id}`);
                                }
                              }}
                            >
                              Profile
                            </button>
                          </div>
                        </td>

                        {/* Account Status */}
                        {!["TUTOR"]?.includes(user?.role) && (
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  isBlocked
                                    ? "bg-green-600/20 text-green-400 hover:bg-green-600/30"
                                    : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleBlockUnBlock(event, ba);
                                }}
                              >
                                {isBlocked ? "Unblock" : "Block"}
                              </button>
                              {rowLoading === ba?.userid?._id && (
                                <Loader size={16} />
                              )}
                            </div>
                          </td>
                        )}

                        {/* Ping Student */}
                        {!["TUTOR"]?.includes(user?.role) && (
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-medium transition-colors w-full"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setStudentPingModalConfig(ba);
                                }}
                              >
                                Ping
                              </button>
                              <button
                                className="px-3 py-1.5 bg-gray-700/50 text-gray-400 hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors w-full"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setStudentPingModalConfig({
                                    ...ba,
                                    viewHistory: true,
                                  });
                                }}
                              >
                                History
                              </button>
                            </div>
                          </td>
                        )}

                        {/* More Actions */}
                        {!["TUTOR"]?.includes(user?.role) && (
                          <td className="px-4 py-4 text-center">
                            <button
                              className="px-3 py-1.5 bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300 rounded-lg text-xs font-medium transition-colors"
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowMoreActionsModal(ba);
                              }}
                            >
                              More
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.analytics.length === 0 && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Students Enrolled</h3>
          <p className="text-gray-400">No students are currently enrolled in this bootcamp</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsTable;
