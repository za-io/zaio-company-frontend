import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getTutorKPIUserModuleStats,
  getUserBootcampAnalyticsForTutor,
} from "../../api/student";
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "../../store/UserProvider";

export default function TutorKPISummary() {
    const navigate = useNavigate();
    const { bootcampId } = useParams(); // Get KPI ID from the URL params
    const bootcampState = useLocation();
    const { state } = bootcampState;
    const { user } = useUserStore();
    const [bootcamps, setBootcamps] = useState([]);
    const [moduleStats, setModuleStats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deferred, setDeferred] = useState([]);
    const isFirstLoad = useRef(true);
  
    const getUserBootcampAnalytics = async () => {
      try {
        setLoading("Getting Student List...");
        let response;
        if (localStorage.getItem(`bootcampAnalytics_${bootcampId}`)) {
          response = JSON.parse(
            localStorage.getItem(`bootcampAnalytics_${bootcampId}`)
          );
        } else {
          response = await getUserBootcampAnalyticsForTutor(
            user?._id,
            bootcampId
          );
        }
        const deferredList = response?.bootcamp?.analytics?.filter(
          (student) =>
            student?.deferredDetails && student?.deferredDetails?.studentDeferred
        );
        setDeferred(deferredList);
        setBootcamps(response);
  
        // Cache the data in localStorage
        localStorage.setItem(
          `bootcampAnalytics_${bootcampId}`,
          JSON.stringify(response)
        );
      } catch (error) {
        setLoading(`${error?.message} || Error getting list`);
      } finally {
        setLoading(false);
      }
    };
  
    const getTutorKPIModuleStats = async () => {
      try {
        let response = await getTutorKPIUserModuleStats(user?._id, bootcampId);
        setModuleStats(response);
      } catch (error) {
        setLoading(`${error?.message} || Error getting list`);
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        if (user?._id && !bootcamps.length) {
          getUserBootcampAnalytics();
          getTutorKPIModuleStats();
        }
        if(state) localStorage.setItem('kpi_summary', state)
      }
    }, []);
  
    return (
      <div className="flex flex-col h-screen bg-gray-800 text-gray-100 p-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">MY KPIs / {state || localStorage.getItem('kpi_summary')}</h2>
          <button
            onClick={() => navigate('/tutor/analytics?q=kpis')} // Navigate back to KPI list
            className="text-blue-400 cursor-pointer"
          >
            Back
          </button>
        </div>
        {/* Summary Information */}
        <p className="text-gray-400 mb-4">
          Allocated: {bootcamps?.bootcamp?.analytics?.length + deferred?.length}{" "}
          Students
        </p>
        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-700 text-left">
            <thead>
              <tr>
                <th className="p-2 border-b border-gray-600">Module Name</th>
                <th className="p-2 border-b border-gray-600">Students Passed</th>
                <th className="p-2 border-b border-gray-600">
                  Students Passed (Deferred)
                </th>
              </tr>
            </thead>
            <tbody>
              {moduleStats?.stats?.activeUsers?.length > 0 ? (
                moduleStats.stats.activeUsers.map((row, index) => {
                  const deferredStats = moduleStats.stats.deferredUsers[index] || {
                    studentsCompleted: 0,
                    totalStudents: 0,
                  };
  
                  return (
                    <tr
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/tutor/kpi/analytics/${bootcampId}/${moduleStats.learningpath}/${row.courseId}`, {state : { breadcrumb: { bootcamp: state, course: row.coursename}}});
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
                        {deferredStats.studentsCompleted}/{deferredStats.totalStudents}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="text-center p-4">
                    Getting Module Stats...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
