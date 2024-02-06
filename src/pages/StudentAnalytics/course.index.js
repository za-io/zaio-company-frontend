import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CourseAnalyticsTable = ({ data, total, loading, searchType }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleCourse = (courseId, userid, type) => {
    navigate(`/student/course/${courseId}/${type}/${userid}`);
  };

  if (loading) return <></>;

  return (
    <div>
      {data?.courseenrolledusers?.length > 0 && (
        <>
          <div>
            <input
              list="browsers"
              value={searchQuery}
              placeholder="Search Student"
              onChange={(e) => setSearchQuery(e?.target?.value)}
              className="appearance-none block bg-gray-200 text-gray-700 border border-gray-200 rounded py-2 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
            />
            <datalist id="browsers">
              {data?.courseenrolledusers?.map((d) => (
                <option value={d?.userid?.username} />
              ))}
            </datalist>
          </div>

          <table class=" overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
            <thead className="border-b text-2xl bg-gray-50">
              <tr className="">
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Username
                </th>

                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Challenges
                </th>

                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  MCQs
                </th>

                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Assignments
                </th>
              </tr>
            </thead>
            {data && data.courseenrolledusers.length !== 0 && (
              <tbody className="divide-y divide-gray-200">
                {data.courseenrolledusers
                  ?.filter((ba) => ba?.userid?.username?.includes(searchQuery))
                  ?.map((ba) => {
                    return (
                      <tr
                        key={ba?._id}
                        className={`cursor-pointer hover:bg-gray-100 cursor-pointer`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-800">
                          {ba?.userid?.username}
                        </td>
                        <td
                          onClick={() => {
                            handleCourse(ba.courseid, ba?.userid?._id, "mcq");
                          }}
                          className="px-6 py-4 text-sm font-medium text-gray-800"
                        >
                          View MCQ
                        </td>

                        <td
                          onClick={() => {
                            handleCourse(
                              ba.courseid,
                              ba?.userid?._id,
                              "challenges"
                            );
                          }}
                          className="px-6 py-4 text-sm font-medium text-gray-800"
                        >
                          View challenges
                        </td>

                        <td
                          onClick={() => {
                            handleCourse(
                              ba.courseid,
                              ba?.userid?._id,
                              "assignments"
                            );
                          }}
                          className="px-6 py-4 text-sm font-medium text-gray-800"
                        >
                          View assignments
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            )}
          </table>
        </>
      )}
      {data && data.courseenrolledusers.length === 0 && (
        <div className="text-gray-100">No student enrolled for this course</div>
      )}
    </div>
  );
};

export default CourseAnalyticsTable;
