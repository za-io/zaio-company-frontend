import { useNavigate } from "react-router-dom";
import { roundOff } from "../../utils/mathUtils";
import { useUserStore } from "../../store/UserProvider";
import { useState } from "react";
import { getCourseItemDetails } from "../../api/student";

// Modal component for showing item details - Dark theme
const ItemDetailsModal = ({ isOpen, onClose, title, items, loading, type }) => {
  if (!isOpen) return null;

  const completedCount = items.filter((i) => i.completed).length;
  const incompleteCount = items.filter((i) => !i.completed).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161B22] rounded-xl border border-gray-800 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-400">Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-400">No items found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="flex gap-3 mb-5">
                <div className="flex-1 bg-green-600/10 border border-green-600/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{completedCount}</p>
                  <p className="text-xs text-green-400/70">Completed</p>
                </div>
                <div className="flex-1 bg-red-600/10 border border-red-600/30 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{incompleteCount}</p>
                  <p className="text-xs text-red-400/70">Incomplete</p>
                </div>
              </div>

              {/* Items list */}
              {items.map((item, idx) => (
                <div
                  key={item._id || idx}
                  className={`p-4 rounded-lg border flex items-center justify-between transition-colors ${
                    item.completed
                      ? "bg-green-600/5 border-green-600/20 hover:bg-green-600/10"
                      : "bg-red-600/5 border-red-600/20 hover:bg-red-600/10"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-200 block truncate">{item.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      {type === "mcqs" && item.completed && (
                        <span className="text-xs text-blue-400 bg-blue-600/20 px-2 py-0.5 rounded">
                          Score: {Math.round((item.score || 0) * 100)}%
                        </span>
                      )}
                      {type === "challenges" && item.type && (
                        <span className="text-xs text-purple-400 bg-purple-600/20 px-2 py-0.5 rounded capitalize">
                          {item.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3 ${
                      item.completed ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                    }`}
                  >
                    {item.completed ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const LearningpathTable = ({
  data,
  userData,
  loading,
  userId,
  learningpath,
}) => {
  const navigate = useNavigate();
  const { user, setUser } = useUserStore();
  const [searchQuery, setSearchQuery] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalItems, setModalItems] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalType, setModalType] = useState("");

  const handleItemClick = async (courseId, courseName, type) => {
    setModalOpen(true);
    setModalLoading(true);
    setModalType(type);
    setModalTitle(`${courseName} - ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    setModalItems([]);

    const result = await getCourseItemDetails(courseId, userId, type);
    if (result?.success) {
      setModalItems(result.items || []);
    }
    setModalLoading(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalItems([]);
    setModalTitle("");
  };

  // Calculate overall averages
  const challengesAvg = roundOff(
    (learningpath?.learningpath?.analytics[0]?.score?.challenge?.marks /
      learningpath?.learningpath?.analytics[0]?.score?.challenge?.total) *
      100
  ) || 0;

  const mcqAvgOverall = roundOff(
    (learningpath?.learningpath?.analytics[0]?.score?.mcq?.marks /
      learningpath?.learningpath?.analytics[0]?.score?.mcq?.total) *
      100
  ) || 0;

  return (
    <div>
      {!loading && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 overflow-hidden">
          {/* Header Section with Student Info */}
          <div className="p-6 border-b border-gray-800">
            {/* Back Button and Title */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {user?.email && (
                  <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white">Course Progress</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {learningpath?.learningpath?.learningpathname || "Learning Path"}
                  </p>
                </div>
              </div>
            </div>

            {/* Student Info Card */}
            <div className="bg-[#0D1117] rounded-xl p-5 border border-gray-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Student Details */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {userData?.username?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{userData?.username}</h2>
                    <p className="text-gray-400 text-sm">{userData?.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4">
                  <div className="bg-[#161B22] rounded-lg px-5 py-3 border border-gray-700">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">MCQ Average</p>
                    <p className={`text-xl font-bold ${
                      mcqAvgOverall >= 70 ? "text-green-400" : mcqAvgOverall >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {mcqAvgOverall}%
                    </p>
                  </div>
                  <div className="bg-[#161B22] rounded-lg px-5 py-3 border border-gray-700">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Challenges Avg</p>
                    <p className={`text-xl font-bold ${
                      challengesAvg >= 70 ? "text-green-400" : challengesAvg >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {challengesAvg}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Section */}
          {data && (
            <div className="px-6 py-4 border-b border-gray-800 bg-[#0D1117]/50">
              <div className="relative max-w-md">
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
                  list="lectures"
                  placeholder="Search by lecture name or ID..."
                  onChange={(e) => setSearchQuery(e?.target?.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#161B22] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                />
                <datalist id="lectures">
                  {learningpath?.allLectures?.map((d, idx) => (
                    <option key={idx} value={d?.lectureId}>{d?.lecturename}</option>
                  ))}
                </datalist>
              </div>
            </div>
          )}

          {/* Courses Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0D1117]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Course Name
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Lectures
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    MCQs
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Challenges
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Assignments
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              {data && (
                <tbody className="divide-y divide-gray-800">
                  {data
                    ?.filter((course) =>
                      searchQuery && searchQuery?.length === 24
                        ? course?.lectures?.filter(
                            (lecture) => lecture?.lectureId === searchQuery
                          )?.length > 0
                        : true
                    )
                    ?.map((course) => {
                      const challAvg =
                        roundOff(
                          (course?.analytics[0]?.completedChallengesCount /
                            course?.total?.challenge) *
                            100
                        ) || 0;

                      const AssiAvg =
                        roundOff(
                          (course?.analytics[0]?.completedAssignmentCount /
                            course?.total?.assignment) *
                            100
                        ) || 0;

                      const lecsAvg =
                        roundOff(
                          (course?.analytics[0]?.completedLecturesCount /
                            course?.total?.lectures) *
                            100
                        ) || 0;

                      const mcqAvg = roundOff(course?.analytics[0]?.avgMcqMarks) || 0;

                      const totalProgress = roundOff(
                        (((course?.analytics[0]?.completedChallengesCount || 0) +
                          (course?.analytics[0]?.completedMCQCount || 0) +
                          (course?.analytics[0]?.completedLecturesCount || 0) +
                          (course?.analytics[0]?.completedAssignmentCount || 0)) /
                          Object.values(course?.total).reduce(
                            (val, tot) => (val ?? 0) + tot,
                            0
                          )) *
                          100
                      );

                      return (
                        <tr
                          className="hover:bg-[#1C2128] transition-colors duration-150"
                          key={course._id}
                        >
                          {/* Course Name */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-white">
                              {course.courseName}
                            </span>
                          </td>

                          {/* Lectures */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(course._id, course.courseName, "lectures");
                              }}
                              className="inline-flex flex-col items-center px-3 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 transition-colors group"
                            >
                              <span className="text-sm font-medium text-blue-400 group-hover:text-blue-300">
                                {course?.analytics[0]?.completedLecturesCount}/{course?.total?.lectures}
                              </span>
                              <span className="text-xs text-gray-500">({lecsAvg}%)</span>
                            </button>
                          </td>

                          {/* MCQs */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(course._id, course.courseName, "mcqs");
                              }}
                              className="inline-flex flex-col items-center px-3 py-2 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/20 transition-colors group"
                            >
                              <span className="text-sm font-medium text-purple-400 group-hover:text-purple-300">
                                {course?.analytics[0]?.completedMCQCount}/{course?.total?.mcq}
                              </span>
                              <span className="text-xs text-gray-500">({mcqAvg}%)</span>
                            </button>
                          </td>

                          {/* Challenges */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(course._id, course.courseName, "challenges");
                              }}
                              className="inline-flex flex-col items-center px-3 py-2 rounded-lg bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/20 transition-colors group"
                            >
                              <span className="text-sm font-medium text-orange-400 group-hover:text-orange-300">
                                {course?.analytics[0]?.completedChallengesCount}/{course?.total?.challenge}
                              </span>
                              <span className="text-xs text-gray-500">({challAvg}%)</span>
                            </button>
                          </td>

                          {/* Assignments */}
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => {
                                navigate(
                                  `/student/course/${course._id}/assignments/${userId}`
                                );
                              }}
                              className="inline-flex flex-col items-center px-3 py-2 rounded-lg bg-green-600/10 hover:bg-green-600/20 border border-green-600/20 transition-colors group"
                            >
                              <span className="text-sm font-medium text-green-400 group-hover:text-green-300">
                                {course?.analytics[0]?.completedAssignmentCount}/{course?.total?.assignment}
                              </span>
                              <span className="text-xs text-gray-500">({AssiAvg}%)</span>
                            </button>
                          </td>

                          {/* Progress */}
                          <td className="px-6 py-4">
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
                              <span className={`text-sm font-semibold min-w-[3rem] text-right ${
                                totalProgress >= 100 ? "text-green-400" : "text-gray-300"
                              }`}>
                                {totalProgress}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              )}
            </table>
          </div>

          {/* Empty State */}
          {(!data || data.length === 0) && !loading && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Courses Found</h3>
              <p className="text-gray-400">No course data available for this learning path</p>
            </div>
          )}
        </div>
      )}

      {/* Item Details Modal */}
      <ItemDetailsModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        items={modalItems}
        loading={modalLoading}
        type={modalType}
      />
    </div>
  );
};

export default LearningpathTable;
