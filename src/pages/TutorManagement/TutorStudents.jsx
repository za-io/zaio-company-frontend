import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/UserProvider";
import { getUserBootcampAnalyticsForTutor } from "../../api/student";

export default function TutorStudents() {
  const [activeTab, setActiveTab] = useState("students");
  const [bootcamps, setBootcamps] = useState([]);
  const [deferred, setDeferred] = useState([])
  const [loading, setLoading] = useState(false);
  const { user } = useUserStore();
  const { bootcampId } = useParams();
  const isFirstLoad = useRef(true);
  const navigate = useNavigate();
  
  const getUserBootcampAnalytics = async () => {
    try {
      setLoading("Getting Student List...");
      let response;
      if(localStorage.getItem(`bootcampAnalytics_${bootcampId}`)){
        response = JSON.parse(localStorage.getItem(`bootcampAnalytics_${bootcampId}`))
      } else {
        response = await getUserBootcampAnalyticsForTutor(
          user?._id,
          bootcampId
        );
      }
      const deferredList = response?.bootcamp?.analytics?.filter(student => student?.deferredDetails && student?.deferredDetails?.studentDeferred)
      setDeferred(deferredList)
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

  useEffect(() => {
    if(isFirstLoad.current){
      isFirstLoad.current = false;
      if (user?._id && !bootcamps.length) {
        getUserBootcampAnalytics();
      }
    }
  }, []);

  return (
    <div className="flex justify-center bg-navy-800 text-gray-100 min-h-screen">
      {/* Main Content */}
      <div className="w-full max-w-6xl p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            My Students : {bootcamps?.bootcamp?.bootcampDetails?.bootcampName}
          </h2>
          <span className="font-bold text-white">Hi {user?.company_username}</span>
        </div>

         
         <button
          onClick={() => navigate(-1)}  // ✅ Uses React Router for proper navigation
          className="bg-gray-700 text-white px-4 py-2 rounded mt-4 hover:bg-gray-600 transition"
        >
          Back
        </button>


        {activeTab === "students" && (
          <div className="rounded p-2">
            <h3 className="text-lg font-bold text-white">
              Current Course: {bootcamps?.bootcamp?.currentCourse?.coursename}
            </h3>

            {/* Table Wrapper with Controlled Height & Scroll */}
            <div className="overflow-auto max-h-[calc(100vh-200px)] mt-4 rounded border border-gray-700">
              <table className="w-full border-collapse border border-gray-700">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="border border-gray-600 p-3 text-left">Name</th>
                    <th className="border border-gray-600 p-3 text-left">Modules Complete</th>
                    <th className="border border-gray-600 p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="3" className="text-center p-4">
                        Loading Student list...
                      </td>
                    </tr>
                  ) : (
                    bootcamps?.bootcamp?.analytics?.map((student, index) => (
                      <tr key={index} className="border border-gray-600 hover:bg-gray-800 transition">
                        <td className="border border-gray-600 p-3">{student?.userid?.username || "N/A"}</td>
                        <td className="border border-gray-600 p-3">{student?.completedCoursesCount}</td>
                        <td className="border border-gray-600 p-3">
                          <a
                            href={`https://www.zaio.io/app/zaio-profile/${student?.userid?.email}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 mr-4 hover:underline"
                          >
                            View Calendar
                          </a>
                          <a onClick={(e) => {
                                    e.preventDefault(); 
                                    navigate(`/tutor/analytics/${bootcampId}/${student?.userid?._id}`, { state : student });}} className="text-blue-400 hover:underline cursor-pointer">
                            View
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-bold text-white mt-6">
              My Deferred Students : {bootcamps?.bootcamp?.bootcampDetails?.bootcampName}
            </h3>
            <div className="overflow-auto max-h-[calc(100vh-200px)] mt-4 rounded border border-gray-700">
              <table className="w-full border-collapse border border-gray-700">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="border border-gray-600 p-3 text-left">Name</th>
                    <th className="border border-gray-600 p-3 text-left">Modules Complete</th>
                    <th className="border border-gray-600 p-3 text-left">End date</th>
                    <th className="border border-gray-600 p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="text-center p-4">
                        Loading Student list...
                      </td>
                    </tr>
                  ) : (
                    deferred?.map((student, index) => (
                      // bootcamps?.bootcamp?.analytics?.map((student, index) => (
                      <tr key={index} className="border border-gray-600 hover:bg-gray-800 transition">
                        <td className="border border-gray-600 p-3">{student?.userid?.username || "N/A"}</td>
                        <td className="border border-gray-600 p-3">{student?.completedCoursesCount}</td>
                        <td className="border border-gray-600 p-3">{student?.deferredDetails?.newBootcampEndDate}</td>
                        <td className="border border-gray-600 p-3">
                          <a
                            href={`https://www.zaio.io/app/zaio-profile/${student?.userid?.email}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 mr-4 hover:underline"
                          >
                            View Calendar
                          </a>
                          <a onClick={(e) => {
                                    e.preventDefault(); 
                                    navigate(`/tutor/analytics/${bootcampId}/${student?.userid?._id}`, { state : student });}} className="text-blue-400 mr-4 hover:underline cursor-pointer">
                            View
                          </a>
                          <a onClick={(e) => {
                                    e.preventDefault(); 
                                    navigate(`/tutor/analytics/${bootcampId}/${student?.userid?._id}`, { state : student });}} className="text-blue-400 hover:underline cursor-pointer">
                            View Goals
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
