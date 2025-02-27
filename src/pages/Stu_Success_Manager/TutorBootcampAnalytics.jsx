import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/loader/loader";
import { getTutorKPIUserModuleStats } from "../../api/student";

export const ViewTutorBootcampAnalytics = () => {
  const { tutorId, bootcampId } = useParams();
  const [loading, setLoading] = useState(false);
  const [moduleStats, setModuleStats] = useState(null);

  const navigate = useNavigate();

  const fetchTutorDetails = async () => {
    setLoading(true);
    try {
      const resp = await getTutorKPIUserModuleStats(tutorId, bootcampId);
      console.log(resp);
      if (resp?.success) {
        setModuleStats(resp);
      }
    } catch (err) {
      console.log("Error getting bootcamps", err)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tutorId && bootcampId) fetchTutorDetails();
  }, [tutorId, bootcampId]);

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
        {moduleStats?.tutorDetails?.company_username && (
          <a
            onClick={(e) => {
              e.preventDefault();
              navigate(`/ssm/tutor/${tutorId}/`);
            }}
            className="text-blue-400 cursor-pointer me-2"
          >
            / {moduleStats?.tutorDetails?.company_username}
          </a>
        )}
        {moduleStats?.bootcampDetails?.bootcampName && (
          <p
            className="
          m-0 text-white"
          >
            / {moduleStats?.bootcampDetails?.bootcampName}
          </p>
        )}
      </div>
      <div className="py-4">
        {moduleStats?.bootcampDetails?.bootcampName && (
          <h3 className="text-lg mb-4 font-semibold text-white">
            Modules for "{moduleStats?.bootcampDetails?.bootcampName}" Bootcamp
          </h3>
        )}
        <div className="mt-2 text-white">
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-700 text-left">
              <thead>
                <tr>
                  <th className="p-2 border-b border-gray-600">Module Name</th>
                  <th className="p-2 border-b border-gray-600">
                    Students Passed
                  </th>
                  <th className="p-2 border-b border-gray-600">
                    Students Passed (Deferred)
                  </th>
                  <th className="p-2 border-b border-gray-600">
                    View Refresh History
                  </th>
                </tr>
              </thead>
              <tbody>
                {moduleStats?.stats?.activeUsers?.length > 0 ? (
                  moduleStats.stats.activeUsers.map((row, index) => {
                    const deferredStats = moduleStats.stats.deferredUsers[
                      index
                    ] || {
                      studentsCompleted: 0,
                      totalStudents: 0,
                    };

                    return (
                      <tr
                        key={index}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(
                            `/tutor/${tutorId}/kpi/analytics/${bootcampId}/${moduleStats.learningpath}/${row.courseId}/all`,
                            {
                              state: {
                                breadcrumb: {
                                  course: row.coursename,
                                },
                              },
                            }
                          );
                        }}
                        className="hover:bg-gray-700 cursor-pointer"
                      >
                        <td className="p-2 border-b border-gray-700">
                          {row.coursename || "N/A"}
                        </td>
                        <td className="p-2 border-b border-gray-700">
                          {row.studentsCompleted}/{row.totalStudents}
                        </td>
                        <td className="p-2 border-b border-gray-700">
                          {deferredStats.studentsCompleted}/
                          {deferredStats.totalStudents}
                        </td>
                        <td className="p-2 border-b border-gray-700">
                          <Link
                          onClick={e => {
                            e?.stopPropagation()
                          }}
                            to={`/ssm/tutor/${tutorId}/bootcamp/${bootcampId}/course/${row?.courseId}/history`}
                            className="font-medium text-blue-600 underline dark:text-blue-500 hover:no-underline"
                          >
                            View History
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                   {loading && <td colSpan="4" className="text-center p-4">
                      <div className="flex flex-col items-center">
                        <Loader />
                        <p className="m-0 text-white text-center">
                          Getting Module Stats...
                        </p>
                      </div>
                    </td>}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!loading && !moduleStats && (
            <p className="text-gray-400">
              No Bootcamps available at the moment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
