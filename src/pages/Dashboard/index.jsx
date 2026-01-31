import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllBootcamps, getAllOCCohorts } from "../../api/company";
import Loader from "../../components/loader/loader";
import { useProgramStore } from "../../store/programStore";
import { useUserStore } from "../../store/UserProvider";
import { CompanyAppRoles } from "../../utils/appUtils";

const Program = ({ program }) => {
  return (
    <div
      key={program.id}
      className="flex flex-col w-full h-full bg-gray-200 rounded-xl"
    >
      {/* <img src={programImg} alt="programImg" /> */}
      <div className="p-2 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mt-2">{program.bootcampName}</h1>
        {/* <h1 className="text-2xl text-gray-500 mt-2">
          {program.description || "No desc"}
        </h1> */}
        <Link
          to={`/program/${program._id}`}
          state={{
            program,
          }}
          className="w-full"
        >
          <button className="bg-blue-700 w-full py-2 rounded-xl mt-2 text-gray-100">
            View Users
          </button>
        </Link>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [bootcamps, setBootcamps] = useState(null);
  const [ocCohorts, setOcCohorts] = useState(null);
  const [loading, setLoading] = useState(false);
  const setPrograms = useProgramStore((state) => state.setPrograms);
  const { user } = useUserStore();
  const navigate = useNavigate();

  const init = () => {
    setLoading(true);
    
    // For ASSESSOR and MODERATOR, fetch OC cohorts instead of bootcamps
    if (user?.role === "ASSESSOR" || user?.role === "MODERATOR") {
      getAllOCCohorts()
        .then((res) => {
          console.log(res);
          if (res?.status === 200 && res?.success) {
            setOcCohorts(res?.data || []);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // For other roles, fetch bootcamps
      getAllBootcamps({
        company_id: user?._id,
      })
        .then((res) => {
          console.log(res);
          if (res?.status === 200) {
            setBootcamps(res?.allBootcamps);
            setPrograms(res?.allBootcamps);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };
  
  useEffect(() => {
    // Redirect assessors and moderators directly to OC Programs page
    if (user?.role === "ASSESSOR" || user?.role === "MODERATOR") {
      navigate("/oc-programs");
      return;
    }
    
    if (user?.role === "SUPER_STUDENT_ADMIN" || (bootcamps && !ocCohorts) || (!bootcamps && ocCohorts) || !user?._id) return;
    if (user?.role === CompanyAppRoles.STUDENT_SUCCESS_MANAGER) {
      navigate("/ssm/tutor/all");
    }
    init();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="px-36 py-12">
      {user?.role === "SUPER_STUDENT_ADMIN" && (
        <div>
          <Link to={`/student/analytics`} className="w-full">
            <button className="bg-blue-700 py-2 px-16 rounded-xl mt-2 text-gray-100">
              Student Progress Dashboard
            </button>
          </Link>
        </div>
      )}

      {!["SUPER_STUDENT_ADMIN", "TUTOR"]?.includes(user?.role) && (
        <>
          <h1 className="text-4xl font-bold text-gray-100">
            {["ASSESSOR", "MODERATOR"]?.includes(user?.role) ? "My OC Programs" : "My Programs"}
          </h1>
          
          {/* Show OC Cohorts for Assessors and Moderators */}
          {["ASSESSOR", "MODERATOR"]?.includes(user?.role) && (
            <>
              {ocCohorts?.length > 0 && (
                <div className="grid grid-cols-3 gap-16 mt-12">
                  {ocCohorts?.map((cohort) => (
                    <div
                      key={cohort._id}
                      className="flex flex-col w-full h-full bg-gray-200 rounded-xl"
                    >
                      <div className="p-2 flex flex-col items-center justify-center">
                        <h1 className="text-4xl font-bold mt-2">{cohort.cohortName}</h1>
                        <p className="text-lg text-gray-600 mt-2">
                          {cohort.learningPathName || "N/A"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {cohort.studentCount || 0} Students
                        </p>
                        <button
                          onClick={() => navigate("/oc-programs")}
                          className="bg-blue-700 w-full py-2 rounded-xl mt-2 text-gray-100"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && ocCohorts?.length === 0 && (
                <div className="mt-4">
                  <p className="text-xl text-center text-gray-100">
                    No OC Programs assigned to you yet
                  </p>
                  <button
                    onClick={() => navigate("/oc-programs")}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium mt-4 mx-auto block"
                  >
                    View OC Programs
                  </button>
                </div>
              )}
            </>
          )}

          {/* Show Bootcamps for other roles */}
          {!["ASSESSOR", "MODERATOR"]?.includes(user?.role) && (
            <>
              {bootcamps?.length > 0 && (
                <div className="grid grid-cols-3 gap-16 mt-12">
                  {bootcamps?.map((program) => (
                    <Program program={program} />
                  ))}
                </div>
              )}

              {!loading && bootcamps?.length === 0 && (
                <div className="mt-4">
                  <p className="text-xl text-center text-gray-100">
                    No Bootcamps found for {user?.company_name}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {["TUTOR"]?.includes(user?.role) && (
        <>
          {/* <h1 className="text-4xl font-bold text-gray-100">Bootcamps:</h1>
          {user?.bootcamps?.length > 0 && (
            <div className="grid grid-cols-3 gap-16 mt-12">
              {user?.bootcamps?.map((program) => (
                <div
                  key={program.id}
                  className="flex flex-col w-full h-full bg-gray-200 rounded-xl"
                >
                  <div className="p-2 flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-bold mt-2">
                      {program.bootcampName}
                    </h1>

                    <Link
                      to={`/student/analytics?bootcamp=${program._id}`}
                      state={{
                        program,
                      }}
                      className="w-full"
                    >
                      <button className="bg-blue-700 w-full py-2 rounded-xl mt-2 text-gray-100">
                        View Users
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )} */}
          <Link
            to={"/tutor/analytics"}
            className="bg-blue-500 ms-4 px-12 py-3 rounded font-medium text-white"
          >
            Analytics
          </Link>
        </>
      )}

      {loading && <Loader />}
    </div>
  );
};

export default Dashboard;
