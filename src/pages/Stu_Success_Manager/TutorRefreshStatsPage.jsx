import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/loader/loader";
import { getTutorRefreshStats } from "../../api/student";
import { formatDate } from "../../utils/dateUtils";

export const TutorRefreshStatsPage = () => {
  const { bootcampId, courseId, tutorId } = useParams();
  const [loading, setLoading] = useState(false);
  const [refreshStats, setRefreshStats] = useState([]);
  const navigate = useNavigate();

  const fetchTutorRefreshStats = async () => {
    setLoading(true);
    try {
      const response = await getTutorRefreshStats(
        tutorId,
        bootcampId,
        courseId
      );
      if (response?.success) {
        setRefreshStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching tutor refresh stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bootcampId && courseId) fetchTutorRefreshStats();
  }, [bootcampId, courseId]);

  return (
    <div className="w-100 px-32">
      <div className="mt-3 flex">
        <a
          onClick={(e) => {
            e.preventDefault();
            navigate(`/ssm/tutor/all/`);
          }}
          className="text-blue-400 cursor-pointer me-2"
        >
          All Tutor
        </a>
        {refreshStats?.length >= 1 &&
          refreshStats?.[0]?.tutorid?.company_username && (
            <a
              onClick={(e) => {
                e.preventDefault();
                navigate(`/ssm/tutor/${tutorId}/`);
              }}
              className="text-blue-400 cursor-pointer me-2"
            >
              / {refreshStats?.[0]?.tutorid?.company_username}
            </a>
          )}
        {refreshStats?.length >= 1 &&
          refreshStats?.[0]?.bootcampid?.bootcampName && (
            <a
              onClick={(e) => {
                e.preventDefault();
                navigate(`/ssm/tutor/${tutorId}/bootcamp/${bootcampId}`);
              }}
              className="text-blue-400 cursor-pointer me-2"
            >
              / {refreshStats?.[0]?.bootcampid?.bootcampName}
            </a>
          )}
      </div>

      <div className="py-4">
        {refreshStats?.length >= 1 && (
          <h3 className="text-lg font-semibold text-white">
            Tutor Refresh History for "
            {refreshStats?.[0]?.moduleStats?.activeUsers?.[0]?.coursename}"
            module
          </h3>
        )}
      </div>
      <div className="mt-2 text-white">
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-700 text-left">
            <thead>
              <tr>
                <th className="p-2 border border-gray-600">Refresh Date</th>
                <th className="p-2 border border-gray-600">
                  Last Refresh Comparison Date
                </th>
                <th className="p-2 border border-gray-600">Students Passed</th>
                <th className="p-2 border border-gray-600">
                  Students Passed (Deferred)
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center p-4">
                    <Loader />
                    <p className="text-white text-center">
                      Fetching refresh history...
                    </p>
                  </td>
                  {console.log(refreshStats)}
                </tr>
              ) : refreshStats.length > 0 ? (
                refreshStats.map((entry, index) => {
                  const historyCapturedDate = entry.createdAt
                    ? formatDate(entry.createdAt)
                    : null;

                  const lastComparisonDate = entry.last_refresh_date
                    ? formatDate(entry.last_refresh_date)
                    : null;

                  const newActiveStdCompleted =
                    entry?.moduleStats?.activeUsers?.[0]
                      ?.studentsCompletedDifference;

                  const newDeferredStdCompleted =
                    entry?.moduleStats?.deferredUsers?.[0]
                      ?.studentsCompletedDifference;

                  return (
                    <tr
                      key={index}
                      className="hover:bg-gray-700 cursor-pointer"
                    >
                      <td className="p-2 border border-gray-700">
                        {historyCapturedDate ?? "Starting"}
                      </td>
                      <td className="p-2 border border-gray-700">
                        {lastComparisonDate ?? "Starting"}
                      </td>
                      <td className="p-2 border border-gray-700">
                        {
                          entry?.moduleStats?.activeUsers?.[0]
                            ?.studentsCompleted
                        }{" "}
                        / {entry?.moduleStats?.activeUsers?.[0]?.totalStudents}{" "}
                        <span className="text-green-400">
                          (
                          {newActiveStdCompleted ? (
                            <a
                              onClick={() => {
                                navigate(
                                  `/tutor/${tutorId}/kpi/analytics/${bootcampId}/${entry?.bootcampid?.learningpath}/${entry?.moduleStats?.activeUsers?.[0]?.courseId}/${entry?._id}`,
                                  {
                                    state: {
                                      breadcrumb: {
                                        // bootcamp: state,
                                        // course: row.coursename,
                                      },
                                    },
                                  }
                                );
                              }}
                            >
                              {newActiveStdCompleted} New
                            </a>
                          ) : (
                            "No Difference"
                          )}
                          )
                        </span>
                      </td>
                      <td className="p-2 border border-gray-700">
                        {
                          entry?.moduleStats?.deferredUsers?.[0]
                            ?.studentsCompleted
                        }{" "}
                        /{" "}
                        {entry?.moduleStats?.deferredUsers?.[0]?.totalStudents}{" "}
                        <span className="text-green-400">
                          (
                          {newDeferredStdCompleted
                            ? `${newDeferredStdCompleted} New`
                            : "No Difference"}
                          )
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-gray-400">
                    No refresh history available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
