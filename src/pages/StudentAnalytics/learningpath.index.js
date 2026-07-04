import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { blockUser, unblockUser } from "../../api/student";
import Loader from "../../components/loader/loader";

export const SORTING = {
  PROGRESS_ASC: "PROGRESS_ASC",
  PROGRESS_DESC: "PROGRESS_DESC",
  DEFERRED_ASC: "DEFERRED_ASC",
  DEFERRED_DESC: "DEFERRED_DESC",
};

const LPAnalyticsTable = ({
  data,
  total,
  loading,
  searchType,
  getAnalytics,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rowLoading, setRowLoading] = useState(false);
  const [sortBy, setSortBy] = useState(SORTING.PROGRESS_DESC);

  const navigate = useNavigate();

  const handleLearningpath = (learningpathId, userid) => {
    navigate(`/student/learningpath/${learningpathId}?user_id=${userid}`);
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

  if (loading) return <></>;

  const totalStudents = data?.learningpathenrolledusers?.length || 0;

  return (
    <div>
      {data?.learningpathenrolledusers?.length > 0 && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 overflow-hidden">
          {/* Table Header Section */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Learning Path Title */}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {data?.learningpathname || "Learning Path Analytics"}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {totalStudents} student{totalStudents !== 1 ? "s" : ""} enrolled
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
                    list="lp-browsers"
                    value={searchQuery}
                    placeholder="Search by name or email..."
                    onChange={(e) => setSearchQuery(e?.target?.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-[#0D1117] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  />
                  <datalist id="lp-browsers">
                    {data?.learningpathenrolledusers?.map((d, idx) => (
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Account Status
                  </th>
                </tr>
              </thead>
              {data && data.learningpathenrolledusers.length !== 0 && (
                <tbody className="divide-y divide-gray-800">
                  {data.learningpathenrolledusers
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
                      if (sortBy === SORTING.PROGRESS_DESC) {
                        return b?.lpProgress - a?.lpProgress;
                      } else if (sortBy === SORTING.PROGRESS_ASC) {
                        return a?.lpProgress - b?.lpProgress;
                      } else if (sortBy === SORTING.DEFERRED_ASC) {
                        const isDeferred = (row) =>
                          ["deferred", "deferred_optin", "in_grace_period"].includes(row?.enrollmentStatus) ||
                          Boolean(row?.deferredDetails?.studentDeferred);
                        return Number(isDeferred(b)) - Number(isDeferred(a));
                      } else if (sortBy === SORTING.DEFERRED_DESC) {
                        const isDeferred = (row) =>
                          ["deferred", "deferred_optin", "in_grace_period"].includes(row?.enrollmentStatus) ||
                          Boolean(row?.deferredDetails?.studentDeferred);
                        return Number(isDeferred(a)) - Number(isDeferred(b));
                      }
                    })
                    ?.map((ba) => {
                      const progress = ba?.lpProgress || 0;
                      const isBlocked = ba?.userid?.accBlocked;

                      return (
                        <tr
                          key={ba?._id}
                          className="hover:bg-[#1C2128] cursor-pointer transition-colors duration-150"
                          onClick={() => {
                            handleLearningpath(
                              ba.learningpathid,
                              ba?.userid?._id
                            );
                          }}
                        >
                          {/* Username */}
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-white">
                              {ba?.userid?.username}
                            </span>
                          </td>

                          {/* Email */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-400">
                              {ba?.userid?.email}
                            </span>
                          </td>

                          {/* Progress */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 w-24">
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      progress >= 100
                                        ? "bg-green-500"
                                        : progress >= 50
                                        ? "bg-blue-500"
                                        : progress >= 25
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                    }`}
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                              </div>
                              <span className={`text-sm font-medium ${
                                progress >= 100 ? "text-green-400" : "text-gray-300"
                              }`}>
                                {progress}%
                              </span>
                            </div>
                          </td>

                          {/* Account Status */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                        </tr>
                      );
                    })}
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      {data && data.learningpathenrolledusers.length === 0 && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Students Enrolled</h3>
          <p className="text-gray-400">No students are currently enrolled in this learning path</p>
        </div>
      )}
    </div>
  );
};

export default LPAnalyticsTable;
