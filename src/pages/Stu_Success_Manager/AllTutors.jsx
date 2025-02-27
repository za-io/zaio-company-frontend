import { useEffect, useState } from "react";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";
import { useNavigate } from "react-router-dom";
import { getAllTutors } from "../../api/company";
import moment from "moment";
import { saveTutorProgress } from "../../api/student";

export default function AllTutors() {
  const [activeTab, setActiveTab] = useState("tutors");
  const [loading, setLoading] = useState(true);
  const { user } = useUserStore();
  const [allTutors, setAllTutors] = useState(null);
  const [refLoading, setRefLoading] = useState(null);

  const navigate = useNavigate();

  const fetchTutors = async () => {
    setLoading(true);
    const tutors = await getAllTutors();
    setAllTutors(tutors?.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  const handleRefreshTutor = async (tutorId) => {
    setRefLoading(tutorId);
    try {
      await saveTutorProgress({ tutorId });
      fetchTutors();
    } catch (err) {
    } finally {
      setRefLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-800 text-gray-100">
      {/* Sidebar */}
      <div className="w-1/6 bg-gray-900 p-4">
        <h2 className="text-lg font-bold text-white">
          Student Success Manager
        </h2>
        <button
          className={`block w-full text-left p-2 my-2 rounded ${
            activeTab === "students" ? "bg-gray-700" : ""
          } text-gray-100`}
          onClick={() => setActiveTab("tutors")}
        >
          My Tutor
        </button>
      </div>

      {/* Main Content */}
      <div className="w-3/4 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {activeTab === "tutors" ? "My Tutors" : ""}
          </h2>
          <span className="font-bold text-white">
            Hi {user?.company_username}
          </span>
        </div>
        {/* Render "My Tutors" */}
        {activeTab === "tutors" && (
          <div className="rounded py-4">
            <table className="w-full border-collapse border border-gray-700">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-700 p-2 text-left">
                    Tutor Username
                  </th>
                  <th className="border border-gray-700 p-2 text-left">
                    Email
                  </th>
                  <th className="border border-gray-700 p-2 text-left">
                    Last Login
                  </th>
                  <th className="border border-gray-700 p-2 text-left">
                    Last Refresh
                  </th>
                  <th className="border border-gray-700 p-2 text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {allTutors?.map((tutor, index) => (
                  <tr key={index} className="border border-gray-700">
                    <td className="border border-gray-700 p-2">
                      {tutor?.company_username}
                    </td>
                    <td className="border border-gray-700 p-2">
                      {tutor?.email}
                    </td>
                    <td className="border border-gray-700 p-2">
                      {tutor?.last_login
                        ? moment(tutor?.last_login).fromNow()
                        : "Never"}
                    </td>
                    <td className="border border-gray-700 p-2">
                      {tutor?.last_refresh
                        ? moment(tutor?.last_refresh).fromNow()
                        : "Never"}
                    </td>
                    <td className="border border-gray-700 p-2 flex justify-around items-center">
                      <a
                        onClick={(e) => {
                          if (refLoading) return;
                          e.preventDefault();
                          navigate(`/ssm/tutor/${tutor?._id}/`);
                        }}
                        className="text-blue-400 cursor-pointer"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        disabled={refLoading}
                        onClick={() => {
                          handleRefreshTutor(tutor?._id);
                        }}
                        className="btn btn-primary"
                      >
                        Refresh
                      </button>
                      {refLoading === tutor?._id ? <Loader size={18} /> : <div className="w-7" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loader */}
        {loading && (
          <div className="flex flex-col items-center">
            <Loader />
            <p className="m-0 text-white text-center">Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
