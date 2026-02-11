import { useEffect, useState } from "react";
import { useUserStore } from "../../store/UserProvider";
import { getTutorBootcampsWithProgress } from "../../api/student";
import Loader from "../../components/loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function TutorBootcamps() {
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(true);
  const [bootcampsWithProgress, setBootcampsWithProgress] = useState([]);
  const [params] = useSearchParams();
  const { user } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (params.get("q")) setActiveTab(params.get("q"));
  }, [params]);

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getTutorBootcampsWithProgress(user._id)
      .then((data) => {
        setBootcampsWithProgress(Array.isArray(data) ? data : []);
      })
      .catch(() => setBootcampsWithProgress([]))
      .finally(() => setLoading(false));
  }, [user?._id]);

  const list = bootcampsWithProgress.length > 0
    ? bootcampsWithProgress
    : (user?.bootcamps ?? []).map((b) => ({
        _id: b?._id ?? b,
        bootcampName: b?.bootcampName ?? (typeof b === "string" ? "Bootcamp" : "Bootcamp"),
        studentCount: 0,
        averageProgress: null,
      }));

  return (
    <div className="flex h-screen bg-gray-800 text-gray-100">
      {/* Sidebar - match image: selected item with blue border */}
      <div className="w-1/6 min-w-[200px] bg-gray-900 p-4">
        <h2 className="text-lg font-bold text-white">Tutor Platform</h2>
        <button
          type="button"
          className={`block w-full text-left p-2 my-2 rounded text-gray-100 transition ${
            activeTab === "students"
              ? "bg-gray-700 ring-1 ring-blue-500 border border-blue-500/50"
              : "hover:bg-gray-700/70"
          }`}
          onClick={() => setActiveTab("students")}
        >
          My Students
        </button>
        <button
          type="button"
          className={`block w-full text-left p-2 my-2 rounded text-gray-100 transition ${
            activeTab === "kpis"
              ? "bg-gray-700 ring-1 ring-blue-500 border border-blue-500/50"
              : "hover:bg-gray-700/70"
          }`}
          onClick={() => setActiveTab("kpis")}
        >
          My KPIs
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <h2 className="text-xl font-bold text-white">
            {activeTab === "students" ? "My Students" : "My KPIs"}
          </h2>
          <span className="text-gray-300">Hi {user?.company_username}</span>
        </div>

        {loading && list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader />
            <p className="text-gray-400 mt-2">Loading bootcamps…</p>
          </div>
        ) : (
          <>
            {/* My Students - card with list and progress like super student admin */}
            {activeTab === "students" && (
              <div className="border border-gray-600 rounded-xl bg-gray-900/40 p-4 max-w-4xl">
                <ul className="divide-y divide-gray-700">
                  {list.map((bootcamp, index) => {
                    const id = bootcamp?._id ?? bootcamp;
                    const name = bootcamp?.bootcampName ?? "Bootcamp";
                    const progress = bootcamp?.averageProgress ?? null;
                    const studentCount = bootcamp?.studentCount ?? 0;
                    return (
                      <li
                        key={id || index}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-4">
                          <span className="text-white font-medium truncate">{name}</span>
                          {progress !== null && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    progress >= 100
                                      ? "bg-green-500"
                                      : progress >= 50
                                      ? "bg-blue-500"
                                      : progress >= 25
                                      ? "bg-amber-500"
                                      : "bg-gray-500"
                                  }`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-400 w-10">
                                {progress}%
                              </span>
                              {studentCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  {studentCount} student{studentCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/tutor/analytics/${id}`)}
                          className="text-blue-400 hover:underline cursor-pointer shrink-0 ml-2"
                        >
                          View
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {list.length === 0 && (
                  <p className="text-gray-400 py-4">No bootcamps allocated. Ask an admin to assign you to bootcamps.</p>
                )}
              </div>
            )}

            {/* My KPIs */}
            {activeTab === "kpis" && (
              <div className="border border-gray-600 rounded-xl bg-gray-900/40 p-4 max-w-4xl">
                <h3 className="text-lg font-semibold text-white mb-3">My KPIs</h3>
                <ul className="divide-y divide-gray-700">
                  {list.map((bootcamp, index) => {
                    const id = bootcamp?._id ?? bootcamp;
                    const name = bootcamp?.bootcampName ?? "Bootcamp";
                    return (
                      <li
                        key={id || index}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <span className="text-white font-medium">{name}</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/tutor/kpi/analytics/${id}`, { state: name })}
                          className="text-blue-400 hover:underline cursor-pointer"
                        >
                          View
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {list.length === 0 && (
                  <p className="text-gray-400 py-4">No KPIs available at the moment.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
