import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useUserStore } from "../../store/UserProvider";
import { getTutorBootcampsWithProgress } from "../../api/student";
import {
  getTutorGoogleClassroomConfig,
  getTutorGoogleClassroomAuthUrl,
  getTutorClassroomSubmissions,
  getTutorClassroomConnectionStatus,
  getLinkableBootcamps,
  linkClassroomSubmissions,
  linkClassroomUserManually,
} from "../../api/company";
import Loader from "../../components/loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import MarkingDesk from "./MarkingDesk";

const UNMATCHED_PER_PAGE = 5;


function UnmatchedLinkRow({ gcStudent, bootcampId, zaioStudents, linkingRow, setLinkingRow, onLinked, linkClassroomUserManually }) {
  const [selectedZaioId, setSelectedZaioId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);
  const inputRef = useRef(null);
  const rowKey = `${bootcampId}-${gcStudent.gcUserId}`;
  const isLinking = linkingRow === rowKey;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom, left: rect.left, width: rect.width });
    } else {
      setDropdownRect(null);
    }
  }, [isOpen]);

  const selectedStudent = zaioStudents.find((z) => z._id === selectedZaioId);
  const displayValue = selectedStudent
    ? `${selectedStudent.name || selectedStudent.email || ""} ${selectedStudent.email ? `(${selectedStudent.email})` : ""}`.trim()
    : "";

  const q = (searchQuery || "").toLowerCase().trim();
  const filtered = q
    ? zaioStudents.filter((z) => {
        const name = (z.name || "").toLowerCase();
        const email = (z.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      })
    : zaioStudents;

  const handleSelect = (z) => {
    setSelectedZaioId(z._id);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleLink = async () => {
    if (!selectedZaioId) return;
    setLinkingRow(rowKey);
    try {
      const res = await linkClassroomUserManually(selectedZaioId, gcStudent.gcUserId, bootcampId);
      if (res?.success) {
        onLinked();
      } else {
        alert(res?.message || "Failed to link");
      }
    } finally {
      setLinkingRow(null);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap relative">
      <div className="relative min-w-[220px]">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Search by name or email…"
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 pr-8 text-white text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setSearchQuery("");
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen &&
          dropdownRect &&
          createPortal(
            <ul
              className="fixed z-[9999] mt-1 bg-gray-800 border border-gray-600 rounded shadow-lg py-1"
              style={{
                top: dropdownRect.top + 4,
                left: dropdownRect.left,
                width: dropdownRect.width,
                maxHeight: "min(50vh, 400px)",
                overflowY: "auto",
              }}
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-gray-500 text-sm">No matches</li>
              ) : (
                filtered.map((z) => (
                  <li
                    key={z._id}
                    className="px-3 py-2 text-sm text-white hover:bg-gray-600 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(z);
                    }}
                  >
                    <span className="block truncate">{z.name || z.email || z._id}</span>
                    {z.email && <span className="block text-gray-400 text-xs truncate">{z.email}</span>}
                  </li>
                ))
              )}
            </ul>,
            document.body
          )}
      </div>
      <button
        type="button"
        disabled={!selectedZaioId || isLinking}
        onClick={handleLink}
        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50"
      >
        {isLinking ? "Linking…" : "Link"}
      </button>
    </div>
  );
}

export default function TutorBootcamps() {
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(true);
  const [bootcampsWithProgress, setBootcampsWithProgress] = useState([]);
  const [unmarkedAssignments, setUnmarkedAssignments] = useState([]);
  const [returnedAssignments, setReturnedAssignments] = useState([]);
  const [linkedBootcamps, setLinkedBootcamps] = useState([]);
  const [returnedLoading, setReturnedLoading] = useState(false);
  const [onTimeScore, setOnTimeScore] = useState(null);
  const [markingsLoading, setMarkingsLoading] = useState(false);
  const [markingsMessage, setMarkingsMessage] = useState(null);
  const [classroomConnected, setClassroomConnected] = useState(false);
  const [classroomConfigLoading, setClassroomConfigLoading] = useState(false);
  const [classroomClientId, setClassroomClientId] = useState(null);
  const [classroomSignInError, setClassroomSignInError] = useState(null);
  const [classroomRedirecting, setClassroomRedirecting] = useState(false);
  const [linkingSubmissions, setLinkingSubmissions] = useState(false);
  const [linkSubmissionsResult, setLinkSubmissionsResult] = useState(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [linkableBootcamps, setLinkableBootcamps] = useState([]);
  const [selectedBootcampIds, setSelectedBootcampIds] = useState([]);
  const [unmatchedPage, setUnmatchedPage] = useState(1);
  const [markingsBootcampFilter, setMarkingsBootcampFilter] = useState("");
  const [markingsInTalksFilter, setMarkingsInTalksFilter] = useState("all");
  const [markingsProposalFilter, setMarkingsProposalFilter] = useState("all");
  const [unmatchedStudents, setUnmatchedStudents] = useState([]);
  const [linkingRow, setLinkingRow] = useState(null);
  const [deskView, setDeskView] = useState("queue");
  const [selectedMarkingKey, setSelectedMarkingKey] = useState(null);
  const [showClassroomTools, setShowClassroomTools] = useState(false);
  const [params, setParams] = useSearchParams();
  const { user } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (params.get("q")) setActiveTab(params.get("q"));
  }, [params]);

  // Handle return from Google Classroom redirect flow
  useEffect(() => {
    const gc = params.get("google_classroom");
    const msg = params.get("message");
    if (!gc) return;
    setActiveTab("markings");
    if (gc === "connected") {
      setClassroomConnected(true);
      setClassroomSignInError(null);
    } else {
      try {
        setClassroomSignInError(msg ? decodeURIComponent(msg) : "Google sign-in failed");
      } catch {
        setClassroomSignInError(msg || "Google sign-in failed");
      }
    }
    setParams((p) => {
      p.delete("google_classroom");
      p.delete("message");
      return p;
    }, { replace: true });
  }, [params]);

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getTutorBootcampsWithProgress(user._id)
      .then((data) => {
        setBootcampsWithProgress(Array.isArray(data) ? data : []);
      })
      .catch(() => setBootcampsWithProgress([]))
      .finally(() => setLoading(false));
  }, [user?._id]);

  // Bootcamp markings: check Classroom connection and fetch submissions
  useEffect(() => {
    if (activeTab !== "markings") return;
    setClassroomConfigLoading(true);
    getTutorClassroomConnectionStatus()
      .then((res) => setClassroomConnected(!!res?.connected))
      .catch(() => setClassroomConnected(false))
      .finally(() => setClassroomConfigLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "markings") return;
    getTutorGoogleClassroomConfig()
      .then((res) => setClassroomClientId(res?.clientId || null))
      .catch(() => setClassroomClientId(null));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "markings" || !classroomConnected) {
      setUnmarkedAssignments([]);
      setReturnedAssignments([]);
      setLinkedBootcamps([]);
      setOnTimeScore(null);
      return;
    }
    setMarkingsLoading(true);
    setMarkingsMessage(null);
    getTutorClassroomSubmissions({ scope: "queue" })
      .then((res) => {
        setUnmarkedAssignments(Array.isArray(res?.data) ? res.data : []);
        setLinkedBootcamps(Array.isArray(res?.bootcamps) ? res.bootcamps : []);
        if (res?.message) setMarkingsMessage(res.message);
      })
      .catch(() => {
        setUnmarkedAssignments([]);
        setLinkedBootcamps([]);
      })
      .finally(() => setMarkingsLoading(false));
  }, [user?._id, activeTab, classroomConnected]);

  useEffect(() => {
    if (activeTab !== "markings" || !classroomConnected || deskView !== "returned") return;
    if (!markingsBootcampFilter) {
      setReturnedAssignments([]);
      setReturnedLoading(false);
      return;
    }
    let cancelled = false;
    setReturnedLoading(true);
    getTutorClassroomSubmissions({ scope: "returned", bootcampId: markingsBootcampFilter })
      .then((res) => {
        if (cancelled) return;
        setReturnedAssignments(Array.isArray(res?.returned) ? res.returned : []);
        setOnTimeScore(res?.onTimeScore ?? null);
        if (res?.message) setMarkingsMessage(res.message);
      })
      .catch(() => {
        if (!cancelled) setReturnedAssignments([]);
      })
      .finally(() => {
        if (!cancelled) setReturnedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, classroomConnected, deskView, markingsBootcampFilter]);

  useEffect(() => {
    setUnmatchedPage(1);
  }, [unmatchedStudents.length]);

  const unmatchedFlat = unmatchedStudents.flatMap((boot) =>
    boot.students.map((s) => ({ ...s, boot }))
  );
  const unmatchedTotal = unmatchedFlat.length;
  const unmatchedPaginated = unmatchedFlat.slice(
    (unmatchedPage - 1) * UNMATCHED_PER_PAGE,
    unmatchedPage * UNMATCHED_PER_PAGE
  );
  const unmatchedTotalPages = Math.max(1, Math.ceil(unmatchedTotal / UNMATCHED_PER_PAGE));

  const markingsFiltered = unmarkedAssignments.filter((item) => {
    if (markingsBootcampFilter && String(item.bootcampId) !== markingsBootcampFilter) return false;
    if (markingsInTalksFilter === "in_talks" && !item.inTalks) return false;
    if (markingsInTalksFilter === "not_in_talks" && item.inTalks) return false;
    const pmStatus = item.proposedMarking?.status;
    if (markingsProposalFilter === "pending" && pmStatus !== "proposed") return false;
    if (markingsProposalFilter === "reviewed" && !["approved", "changed", "needs_resubmission"].includes(pmStatus)) return false;
    if (markingsProposalFilter === "none" && item.proposedMarking) return false;
    return true;
  });
  const markingsBootcamps = [
    ...new Map(
      [
        ...linkedBootcamps.filter((b) => b.id && b.name).map((b) => [String(b.id), { id: String(b.id), name: b.name }]),
        ...unmarkedAssignments
          .filter((i) => i.bootcampId && i.bootcampName)
          .map((i) => [String(i.bootcampId), { id: String(i.bootcampId), name: i.bootcampName }]),
      ]
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const returnedFiltered = returnedAssignments.filter((item) => {
    if (markingsBootcampFilter && String(item.bootcampId) !== markingsBootcampFilter) return false;
    return true;
  });

  const list = bootcampsWithProgress.length > 0
    ? bootcampsWithProgress
    : (user?.bootcamps ?? []).map((b) => ({
        _id: b?._id ?? b,
        bootcampName: b?.bootcampName ?? (typeof b === "string" ? "Bootcamp" : "Bootcamp"),
        studentCount: 0,
        averageProgress: null,
      }));

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-gray-800 text-gray-100">
      {/* Sidebar - match image: selected item with blue border */}
      <div className="w-1/6 min-w-[200px] bg-gray-900 p-4">
        <h2 className="text-lg font-bold text-white">Tutor Platform</h2>
        <button
          type="button"
          className={`block w-full text-left p-2 my-2 rounded text-gray-100 transition ${
            activeTab === "markings"
              ? "bg-gray-700 ring-1 ring-blue-500 border border-blue-500/50"
              : "hover:bg-gray-700/70"
          }`}
          onClick={() => setActiveTab("markings")}
        >
          Bootcamp markings
        </button>
        <button
          type="button"
          className={`block w-full text-left p-2 my-2 rounded text-gray-100 transition ${
            activeTab === "students"
              ? "bg-gray-700 ring-1 ring-blue-500 border border-blue-500/50"
              : "hover:bg-gray-700/70"
          }`}
          onClick={() => setActiveTab("students")}
        >
          My Students
        </button>
        <button
          type="button"
          className={`block w-full text-left p-2 my-2 rounded text-gray-100 transition ${
            activeTab === "kpis"
              ? "bg-gray-700 ring-1 ring-blue-500 border border-blue-500/50"
              : "hover:bg-gray-700/70"
          }`}
          onClick={() => setActiveTab("kpis")}
        >
          My KPIs
        </button>
      </div>

      {/* Main Content */}
      <div className={`flex-1 min-h-0 p-6 flex flex-col ${activeTab === "markings" ? "overflow-hidden" : "overflow-auto"}`}>
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <h2 className="text-xl font-bold text-white">
            {activeTab === "students"
              ? "My Students"
              : activeTab === "kpis"
              ? "My KPIs"
              : "Bootcamp markings"}
          </h2>
          <span className="text-gray-300">Hi {user?.company_username}</span>
        </div>

        {loading && list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader />
            <p className="text-gray-400 mt-2">Loading bootcamps…</p>
          </div>
        ) : (
          <>
            {/* My Students - card with list and progress like super student admin */}
        {activeTab === "students" && (
              <div className="border border-gray-600 rounded-xl bg-gray-900/40 p-4 max-w-4xl">
                <ul className="divide-y divide-gray-700">
                  {list.map((bootcamp, index) => {
                    const id = bootcamp?._id ?? bootcamp;
                    const name = bootcamp?.bootcampName ?? "Bootcamp";
                    const progress = bootcamp?.averageProgress ?? null;
                    const studentCount = bootcamp?.studentCount ?? 0;
                    return (
                      <li
                        key={id || index}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-4">
                          <span className="text-white font-medium truncate">{name}</span>
                          {progress !== null && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    progress >= 100
                                      ? "bg-green-500"
                                      : progress >= 50
                                      ? "bg-blue-500"
                                      : progress >= 25
                                      ? "bg-amber-500"
                                      : "bg-gray-500"
                                  }`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-400 w-10">
                                {progress}%
                              </span>
                              {studentCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  {studentCount} student{studentCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/tutor/analytics/${id}`)}
                          className="text-blue-400 hover:underline cursor-pointer shrink-0 ml-2"
                  >
                    View
                        </button>
                </li>
                    );
                  })}
                </ul>
                {list.length === 0 && (
                  <p className="text-gray-400 py-4">No bootcamps allocated. Ask an admin to assign you to bootcamps.</p>
                )}
              </div>
            )}

            {/* Bootcamp markings - unmarked Google Classroom assignments (tutor connects and pulls from their Classroom) */}
            {activeTab === "markings" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-gray-400 text-sm">
                    {classroomConnected
                      ? "Pick a submission, check the proposed mark, then enter it in Classroom."
                      : "Connect Google Classroom to load submissions from your bootcamps."}
                  </p>
                  {classroomConnected && (
                    <button
                      type="button"
                      onClick={() => setShowClassroomTools((open) => !open)}
                      className="shrink-0 text-sm text-gray-300 hover:text-white"
                    >
                      {showClassroomTools ? "Hide setup" : "Classroom setup"}
                    </button>
                  )}
                </div>

                {(!classroomConnected || showClassroomTools) && (
                <div className="mb-3 p-4 rounded-lg bg-gray-800/80 border border-gray-600">
                  <h3 className="text-white font-medium mb-2">Google Classroom</h3>
                  {classroomConfigLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader size={20} />
                      <span>Checking connection…</span>
                    </div>
                  ) : !classroomClientId ? (
                    <p className="text-gray-400 text-sm">
                      Google Classroom is not configured. Please contact your administrator.
                    </p>
                  ) : classroomConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-green-400 text-sm">Connected</span>
                        <button
                          type="button"
                          disabled={classroomRedirecting}
                          onClick={async () => {
                            setClassroomSignInError(null);
                            setClassroomRedirecting(true);
                            const res = await getTutorGoogleClassroomAuthUrl();
                            if (res?.authUrl) {
                              window.location.href = res.authUrl;
                            } else {
                              setClassroomSignInError(res?.message || "Failed to start sign-in");
                              setClassroomRedirecting(false);
                            }
                          }}
                          className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {classroomRedirecting ? "Redirecting…" : "Reconnect"}
                        </button>
                      </div>
                      <div className="pt-2 border-t border-gray-600">
                        <p className="text-gray-400 text-sm mb-2">
                          Link student emails to Classroom so their submissions appear below.
                        </p>
                        <button
                          type="button"
                          disabled={linkingSubmissions}
                          onClick={async () => {
                            setLinkSubmissionsResult(null);
                            setClassroomSignInError(null);
                            setConnectModalOpen(true);
                            const res = await getLinkableBootcamps();
                            const list = Array.isArray(res?.bootcamps) ? res.bootcamps : [];
                            setLinkableBootcamps(list);
                            setSelectedBootcampIds(list.map((b) => b._id));
                          }}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
                        >
                          Connect to classroom submissions
                        </button>
                        {linkSubmissionsResult && (
                          <p
                            className={`mt-2 text-sm ${
                              linkSubmissionsResult.success ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {linkSubmissionsResult.message}
                          </p>
                        )}
                        {connectModalOpen && (
                          <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                            onClick={() => !linkingSubmissions && setConnectModalOpen(false)}
                          >
                            <div
                              className="bg-gray-800 rounded-xl shadow-xl border border-gray-600 p-6 max-w-md w-full mx-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <h3 className="text-lg font-semibold text-white mb-2">
                                Select bootcamps to connect
                              </h3>
                              <p className="text-gray-400 text-sm mb-4">
                                Choose which bootcamps to link student emails to Google Classroom.
                              </p>
                              {linkableBootcamps.length === 0 ? (
                                <p className="text-gray-500 text-sm py-4">
                                  No bootcamps with linked Classroom courses. Ask an admin to link a
                                  Classroom course to your bootcamps.
                                </p>
                              ) : (
                                <div className="space-y-2 mb-6">
                                  {linkableBootcamps.map((b) => (
                                    <label
                                      key={b._id}
                                      className="flex items-center gap-3 py-2 cursor-pointer hover:bg-gray-700/50 rounded px-2 -mx-2"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedBootcampIds.includes(b._id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedBootcampIds((prev) => [...prev, b._id]);
                                          } else {
                                            setSelectedBootcampIds((prev) =>
                                              prev.filter((id) => id !== b._id)
                                            );
                                          }
                                        }}
                                        className="rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500"
                                      />
                                      <span className="text-white">{b.bootcampName || "Bootcamp"}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              <div className="flex justify-end gap-3">
                                <button
                                  type="button"
                                  onClick={() => setConnectModalOpen(false)}
                                  disabled={linkingSubmissions}
                                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    linkingSubmissions ||
                                    linkableBootcamps.length === 0 ||
                                    selectedBootcampIds.length === 0
                                  }
                                  onClick={async () => {
                                    setLinkingSubmissions(true);
                                    try {
                                      const res = await linkClassroomSubmissions(selectedBootcampIds);
                                      setLinkSubmissionsResult(res);
                                      setUnmatchedStudents(
                                        Array.isArray(res?.unmatched) ? res.unmatched : []
                                      );
                                      if (res?.success) {
                                        setConnectModalOpen(false);
                                        setMarkingsLoading(true);
getTutorClassroomSubmissions({ scope: "queue", refresh: true })
                                        .then((r) => {
                                          setUnmarkedAssignments(Array.isArray(r?.data) ? r.data : []);
                                          setLinkedBootcamps(Array.isArray(r?.bootcamps) ? r.bootcamps : []);
                                        })
                                          .catch(() => {
                                    setUnmarkedAssignments([]);
                                    setReturnedAssignments([]);
                                    setOnTimeScore(null);
                                  })
                                          .finally(() => setMarkingsLoading(false));
                                      }
                                    } finally {
                                      setLinkingSubmissions(false);
                                    }
                                  }}
                                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50"
                                >
                                  {linkingSubmissions ? "Linking…" : "Connect"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-400 text-sm mb-3">
                        Sign in with the Google account you use as a teacher in Classroom. This opens Google in a new tab.
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          disabled={classroomRedirecting}
                          onClick={async () => {
                            setClassroomSignInError(null);
                            setClassroomRedirecting(true);
                            const res = await getTutorGoogleClassroomAuthUrl();
                            if (res?.authUrl) {
                              window.location.href = res.authUrl;
                            } else {
                              setClassroomSignInError(res?.message || "Failed to start sign-in");
                              setClassroomRedirecting(false);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-gray-100 text-gray-800 text-sm font-medium disabled:opacity-50"
                        >
                          {classroomRedirecting ? (
                            <>
                              <Loader size={18} />
                              Redirecting…
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                              </svg>
                              Sign in with Google
                            </>
                          )}
                        </button>
                        {classroomSignInError && (
                          <span className="text-red-400 text-sm">{classroomSignInError}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                )}

                {classroomConnected && !markingsLoading && (
                  <MarkingDesk
                    items={markingsFiltered}
                    returnedItems={returnedFiltered}
                    selectedKey={selectedMarkingKey}
                    onSelect={setSelectedMarkingKey}
                    view={deskView}
                    onViewChange={(next) => {
                      setDeskView(next);
                      if (next === "returned" && !markingsBootcampFilter && markingsBootcamps.length === 1) {
                        setMarkingsBootcampFilter(markingsBootcamps[0].id);
                      }
                    }}
                    returnedLoading={returnedLoading}
                    bootcampFilter={markingsBootcampFilter}
                    onBootcampFilter={setMarkingsBootcampFilter}
                    inTalksFilter={markingsInTalksFilter}
                    onInTalksFilter={setMarkingsInTalksFilter}
                    proposalFilter={markingsProposalFilter}
                    onProposalFilter={setMarkingsProposalFilter}
                    bootcamps={markingsBootcamps}
                    onTimeScore={onTimeScore}
                    unmatchedCount={unmatchedTotal}
                    emptyMessage={markingsMessage}
                    onInTalks={(item) =>
                      setUnmarkedAssignments((prev) =>
                        prev.map((a) =>
                          a.bootcampId === item.bootcampId &&
                          a.assignment?.courseWorkId === item.assignment?.courseWorkId &&
                          a.userId === item.userId
                            ? { ...a, inTalks: true }
                            : a
                        )
                      )
                    }
                    onProposalUpdated={(item, data) =>
                      setUnmarkedAssignments((prev) =>
                        prev.map((a) =>
                          a.bootcampId === item.bootcampId &&
                          a.assignment?.courseWorkId === item.assignment?.courseWorkId &&
                          a.userId === item.userId
                            ? { ...a, proposedMarking: { ...a.proposedMarking, ...data } }
                            : a
                        )
                      )
                    }
                  />
                )}
                {classroomConnected && markingsLoading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader />
                    <p className="text-gray-400 mt-2">Loading unmarked assignments…</p>
                  </div>
                )}

                {deskView === "unmatched" && unmatchedStudents.length > 0 && (
                  <div className="flex-1 min-h-0 overflow-auto mt-3 p-4 rounded-lg bg-gray-800/80 border border-gray-600">
                    <h3 className="text-white font-medium mb-2">Unmatched Classroom students</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      These Classroom students could not be matched by email. Link them to a Zaio student below.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600 text-left">
                            <th className="py-2 pr-4 text-gray-400 font-medium">Classroom name</th>
                            <th className="py-2 pr-4 text-gray-400 font-medium">Classroom email</th>
                            <th className="py-2 pr-4 text-gray-400 font-medium">Bootcamp</th>
                            <th className="py-2 text-gray-400 font-medium">Link to Zaio student</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatchedPaginated.map(({ boot, ...s }) => (
                            <tr key={`${boot.bootcampId}-${s.gcUserId}`} className="border-b border-gray-700">
                              <td className="py-2 pr-4 text-white">{s.name || "—"}</td>
                              <td className="py-2 pr-4 text-gray-300">{s.email}</td>
                              <td className="py-2 pr-4 text-gray-400">{boot.bootcampName}</td>
                              <td className="py-2">
                                <UnmatchedLinkRow
                                  gcStudent={s}
                                  bootcampId={boot.bootcampId}
                                  zaioStudents={boot.zaioStudents || []}
                                  linkingRow={linkingRow}
                                  setLinkingRow={setLinkingRow}
                                  onLinked={() => {
                                    setUnmatchedStudents((prev) =>
                                      prev
                                        .map((b) =>
                                          b.bootcampId === boot.bootcampId
                                            ? { ...b, students: b.students.filter((x) => x.gcUserId !== s.gcUserId) }
                                            : b
                                        )
                                        .filter((b) => b.students.length > 0)
                                    );
                                    setMarkingsLoading(true);
getTutorClassroomSubmissions({ scope: "queue", refresh: true })
                                  .then((r) => {
                                    setUnmarkedAssignments(Array.isArray(r?.data) ? r.data : []);
                                    setLinkedBootcamps(Array.isArray(r?.bootcamps) ? r.bootcamps : []);
                                  })
                                      .catch(() => {
                                    setUnmarkedAssignments([]);
                                    setReturnedAssignments([]);
                                    setOnTimeScore(null);
                                  })
                                      .finally(() => setMarkingsLoading(false));
                                  }}
                                  linkClassroomUserManually={linkClassroomUserManually}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {unmatchedTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-600">
                        <span className="text-gray-400 text-sm">
                          Showing {(unmatchedPage - 1) * UNMATCHED_PER_PAGE + 1}–
                          {Math.min(unmatchedPage * UNMATCHED_PER_PAGE, unmatchedTotal)} of {unmatchedTotal}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={unmatchedPage <= 1}
                            onClick={() => setUnmatchedPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-50 hover:bg-gray-600"
                          >
                            Previous
                          </button>
                          <span className="text-gray-400 text-sm flex items-center">
                            Page {unmatchedPage} of {unmatchedTotalPages}
                          </span>
                          <button
                            type="button"
                            disabled={unmatchedPage >= unmatchedTotalPages}
                            onClick={() => setUnmatchedPage((p) => Math.min(unmatchedTotalPages, p + 1))}
                            className="px-3 py-1 rounded bg-gray-700 text-white text-sm disabled:opacity-50 hover:bg-gray-600"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
          </div>
        )}

                </div>

          </div>
        )}

            {/* My KPIs */}
            {activeTab === "kpis" && (
              <div className="border border-gray-600 rounded-xl bg-gray-900/40 p-4 max-w-4xl">
                <h3 className="text-lg font-semibold text-white mb-3">My KPIs</h3>
                <ul className="divide-y divide-gray-700">
                  {list.map((bootcamp, index) => {
                    const id = bootcamp?._id ?? bootcamp;
                    const name = bootcamp?.bootcampName ?? "Bootcamp";
                    return (
                      <li
                        key={id || index}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <span className="text-white font-medium">{name}</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/tutor/kpi/analytics/${id}`, { state: name })}
                          className="text-blue-400 hover:underline cursor-pointer"
                        >
                          View
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {list.length === 0 && (
                  <p className="text-gray-400 py-4">No KPIs available at the moment.</p>
                )}
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
