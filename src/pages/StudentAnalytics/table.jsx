import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roundOff } from "../../utils/mathUtils";
import { blockUser, unblockUser } from "../../api/student";
import Loader from "../../components/loader/loader";
import { SORTING } from "./learningpath.index";
import { WarningModal } from "./WarningModal";
import { StudentDeferredModal } from "./StudentDeferredModal";
import { formatDate } from "../../utils/dateUtils";
import { StudentPingModal } from "./StudentPingModal";
import { getAllTutors, getEditTilesToken } from "../../api/company";
import { StudentMoreActionsModal } from "./StudentMoreActions";
import { RxCheckCircled } from "react-icons/rx";

const AnalyticsTable = ({
  data,
  total,
  loading,
  searchType,
  getAnalytics,
  user,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rowLoading, setRowLoading] = useState(false);
  const [sortBy, setSortBy] = useState(SORTING.PROGRESS_DESC);
  const [showWarningModal, setShowWarningModal] = useState(null);
  const [showMoreActionsModal, setShowMoreActionsModal] = useState(null);

  const [studentDeferredModalConfig, setStudentDeferredModalConfig] =
    useState(null);
  const [studentPingModalConfig, setStudentPingModalConfig] = useState(null);
  const [tutors, setTutors] = useState([]);

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
    const tutors = await getAllTutors();
    setTutors(tutors?.data);
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  if (loading) return <></>;

  const deferredCount = data?.analytics?.filter(
    (ba) => ba?.deferredDetails?.studentDeferred
  )?.length || 0;
  const totalStudents = data?.analytics?.length || 0;

  return (
    <div>
      <WarningModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={showWarningModal}
        setShowModal={setShowWarningModal}
      />

      <StudentMoreActionsModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={showMoreActionsModal}
        setShowModal={setShowMoreActionsModal}
        tutors={tutors}
        getAnalytics={getAnalytics}
      />

      <StudentDeferredModal
        bootcampId={data?.bootcampDetails?._id}
        showModal={studentDeferredModalConfig}
        setShowModal={setStudentDeferredModalConfig}
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
                </p>
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
                    placeholder="Search by name or email..."
                    onChange={(e) => setSearchQuery(e?.target?.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-[#0D1117] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  />
                  <datalist id="browsers">
                    {data?.analytics?.map((d, idx) => (
                      <option key={idx} value={d?.userid?.username} />
                    ))}
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
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0D1117]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Tutor
                  </th>
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
                      Warnings
                    </th>
                  )}
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Defer Status
                  </th>
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
                {data.analytics
                  ?.filter(
                    (ba) =>
                      ba?.userid?.username
                        ?.toLowerCase()
                        ?.includes(searchQuery?.toLowerCase()) ||
                      ba?.userid?.email
                        ?.toLowerCase()
                        ?.includes(searchQuery?.toLowerCase())
                  )
                  ?.sort((a, b) => {
                    const aTotalProgress = a?.isbootCampPassed ? 100 : (a?.completedPercentage || 0);
                    const bTotalProgress = b?.isbootCampPassed ? 100 : (b?.completedPercentage || 0);

                    if (sortBy === SORTING.PROGRESS_DESC) {
                      return bTotalProgress - aTotalProgress;
                    } else if (sortBy === SORTING.PROGRESS_ASC) {
                      return aTotalProgress - bTotalProgress;
                    } else if (sortBy === SORTING.DEFERRED_ASC) {
                      return (
                        Boolean(b?.deferredDetails?.studentDeferred) -
                        Boolean(a?.deferredDetails?.studentDeferred)
                      );
                    } else if (sortBy === SORTING.DEFERRED_DESC) {
                      return (
                        Boolean(a?.deferredDetails?.studentDeferred) -
                        Boolean(b?.deferredDetails?.studentDeferred)
                      );
                    }
                  })
                  ?.map((ba) => {
                    const totalProgress = ba?.isbootCampPassed ? 100 : (ba?.completedPercentage || 0);
                    const isCompleted = ba?.completedPercentage === 100 || ba?.isbootCampPassed;
                    const isDeferred = ba?.deferredDetails?.studentDeferred;
                    const isBlocked = ba?.userid?.accBlocked;

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
                              <p className="text-xs text-gray-500 truncate">
                                {ba?.userid?.email}
                              </p>
                            </div>
                          </div>
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

                        {/* Tutor */}
                        <td className="px-4 py-4">
                          <span className={`text-sm ${
                            ba?.tutor ? "text-gray-300" : "text-gray-500 italic"
                          }`}>
                            {ba?.tutor?.company_username || ba?.tutor?.email || "Not Assigned"}
                          </span>
                        </td>

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

                        {/* Warnings */}
                        {!["TUTOR"]?.includes(user?.role) && (
                          <td className="px-4 py-4 text-center">
                            <button
                              className="px-3 py-1.5 bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 rounded-lg text-xs font-medium transition-colors"
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowWarningModal(ba);
                              }}
                            >
                              Warning
                            </button>
                          </td>
                        )}

                        {/* Defer Status */}
                        <td className="px-4 py-4 text-center">
                          <span
                            onClick={(event) => {
                              event.stopPropagation();
                              setStudentDeferredModalConfig(ba);
                            }}
                            className="cursor-pointer"
                          >
                            {isDeferred ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400">
                                Deferred
                              </span>
                            ) : !["TUTOR"]?.includes(user?.role) ? (
                              <button className="px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg text-xs font-medium transition-colors">
                                Defer
                              </button>
                            ) : (
                              <span className="text-gray-500 text-xs">Active</span>
                            )}
                          </span>
                        </td>

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
