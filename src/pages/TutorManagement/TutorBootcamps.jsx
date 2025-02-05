import { useEffect, useState } from "react";
import { useUserStore } from "../../store/UserProvider";
import { getAllBootcamps } from "../../api/student";
import Loader from "../../components/loader/loader";
import { Navigate, useNavigate } from "react-router-dom";

export default function TutorBootcamps() {
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(true);
  const { user } = useUserStore();
  const navigate = useNavigate();


  useEffect(()=>{
    if(user){
        setLoading(false)
    }
  },[])

  return (
    <div className="flex h-screen bg-gray-800 text-gray-100">
      {/* Sidebar */}
      <div className="w-1/6 bg-gray-900 p-4">
        <h2 className="text-lg font-bold text-white">Tutor Platform</h2>
        <button
          className={`block w-full text-left p-2 my-2 rounded ${
            activeTab === "students" ? "bg-gray-700" : ""
          } text-gray-100`}
          onClick={() => setActiveTab("students")}
        >
          My Students
        </button>
        <button
          className={`block w-full text-left p-2 my-2 rounded ${
            activeTab === "kpis" ? "bg-gray-700" : ""
          } text-gray-100`}
          onClick={() => setActiveTab("kpis")}
        >
          My KPIs
        </button>
      </div>

      {/* Main Content */}
      <div className="w-3/4 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">My Students</h2>
          <span className="font-bold text-white">Hi {user?.company_username}</span>
        </div>

        {activeTab === "students" && (
          <div className="mt-4 border border-gray-700 rounded p-4">
            <ul>
              {user?.bootcamps?.map((bootcamp, index) => (
                <li key={index} className="flex justify-between p-2 border-b border-gray-700">
                  {bootcamp.bootcampName} <a onClick={(e) => {
                                    e.preventDefault(); 
                                    navigate(`/tutor/analytics/${bootcamp?._id}`)}} className="text-blue-400 cursor-pointer">View</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === "kpis" && (
          <div className="mt-4 border border-gray-700 rounded p-4">
            <h3 className="text-lg font-semibold text-white">My KPIs</h3>
            <p className="text-gray-400">No KPIs available at the moment.</p>
          </div>
        )}

        {loading && (
                <div className="flex flex-col content-center">
                <Loader />
                <p className="m-0 text-white text-center">{loading}</p>
                </div>
        )}
      </div>
    </div>
  );
}
