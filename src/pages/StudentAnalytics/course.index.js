import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CourseAnalyticsTable = ({ data, total, loading, searchType }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleCourse = (courseId, userid, type) => {
    navigate(`/student/course/${courseId}/${type}/${userid}`);
  };

  if (loading) return <></>;

  const totalStudents = data?.courseenrolledusers?.length || 0;

  return (
    <div>
      {data?.courseenrolledusers?.length > 0 && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 overflow-hidden">
          {/* Table Header Section */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Course Title */}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {data?.coursename || "Course Analytics"}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {totalStudents} student{totalStudents !== 1 ? "s" : ""} enrolled
                </p>
              </div>

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
                  list="course-browsers"
                  value={searchQuery}
                  placeholder="Search by name or email..."
                  onChange={(e) => setSearchQuery(e?.target?.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-[#0D1117] text-gray-300 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                />
                <datalist id="course-browsers">
                  {data?.courseenrolledusers?.map((d, idx) => (
                    <option key={idx} value={d?.userid?.username} />
                  ))}
                </datalist>
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
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    MCQs
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Challenges
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Assignments
                  </th>
                </tr>
              </thead>
              {data && data.courseenrolledusers.length !== 0 && (
                <tbody className="divide-y divide-gray-800">
                  {data.courseenrolledusers
                    ?.filter(
                      (ba) =>
                        ba?.userid?.username
                          ?.toLowerCase()
                          ?.includes(searchQuery?.toLowerCase()) ||
                        ba?.userid?.email
                          ?.toLowerCase()
                          ?.includes(searchQuery?.toLowerCase())
                    )
                    ?.map((ba) => {
                      return (
                        <tr
                          key={ba?._id}
                          className="hover:bg-[#1C2128] transition-colors duration-150"
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

                          {/* MCQs */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                handleCourse(ba.courseid, ba?.userid?._id, "mcq");
                              }}
                              className="px-4 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-medium transition-colors"
                            >
                              View MCQ
                            </button>
                          </td>

                          {/* Challenges */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                handleCourse(
                                  ba.courseid,
                                  ba?.userid?._id,
                                  "challenges"
                                );
                              }}
                              className="px-4 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg text-xs font-medium transition-colors"
                            >
                              View Challenges
                            </button>
                          </td>

                          {/* Assignments */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                handleCourse(
                                  ba.courseid,
                                  ba?.userid?._id,
                                  "assignments"
                                );
                              }}
                              className="px-4 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg text-xs font-medium transition-colors"
                            >
                              View Assignments
                            </button>
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

      {data && data.courseenrolledusers.length === 0 && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-12 text-center">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Students Enrolled</h3>
          <p className="text-gray-400">No students are currently enrolled in this course</p>
        </div>
      )}
    </div>
  );
};

export default CourseAnalyticsTable;
