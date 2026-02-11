import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserStore } from "../../store/UserProvider";
import { getUserBootcampAnalyticsForTutor } from "../../api/student";
import { RxCheckCircled } from "react-icons/rx";
import Loader from "../../components/loader/loader";

export default function TutorStudents() {
  const [bootcamps, setBootcamps] = useState([]);
  const [bootcampDetails, setBootcampDetails] = useState(null);
  const [deferred, setDeferred] = useState([]);
  const [currentCourse, setCurrentCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useUserStore();
  const { bootcampId } = useParams();
  const isFirstLoad = useRef(true);
  const navigate = useNavigate();

  const getUserBootcampAnalytics = async (isRefresh = false) => {
    try {
      setLoading(true);
      let response;
      if (!isRefresh && localStorage.getItem(`bootcampAnalytics_${bootcampId}`)) {
        response = JSON.parse(localStorage.getItem(`bootcampAnalytics_${bootcampId}`));
      } else {
        response = await getUserBootcampAnalyticsForTutor(user?._id, bootcampId);
      }
      const deferredList =
        response?.bootcamp?.analytics?.filter(
          (student) => student?.deferredDetails?.studentDeferred
        ) ?? [];
      const regularList =
        response?.bootcamp?.analytics?.filter(
          (student) => !student?.deferredDetails?.studentDeferred
        ) ?? [];
      setDeferred(deferredList);
      setBootcamps(regularList);
      setBootcampDetails(response?.bootcamp?.bootcampDetails ?? null);
      setCurrentCourse(response?.bootcamp?.currentCourse?.coursename ?? "");
      if (response) {
        localStorage.setItem(
          `bootcampAnalytics_${bootcampId}`,
          JSON.stringify(response)
        );
      }
    } catch (error) {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => getUserBootcampAnalytics(true);

  useEffect(() => {
    if (isFirstLoad.current && user?._id) {
      isFirstLoad.current = false;
      getUserBootcampAnalytics();
    }
  }, [user?._id]);

  return (
    <div className="flex h-screen bg-gray-800 text-gray-100">
      {/* Sidebar - match TutorBootcamps */}
      <div className="w-1/6 min-w-[200px] bg-gray-900 p-4 flex flex-col">
        <h2 className="text-lg font-bold text-white">Tutor Platform</h2>
        <button
          type="button"
          onClick={() => navigate("/tutor/analytics?q=students")}
          className="block w-full text-left p-2 my-2 rounded bg-gray-700 text-gray-100 hover:bg-gray-600 transition"
        >
          ← Back to bootcamps
        </button>
        <span className="block w-full text-left p-2 my-2 rounded bg-gray-700 text-gray-100 mt-2">
          My Students
        </span>
        <button
          type="button"
          onClick={() => navigate(`/tutor/kpi/analytics/${bootcampId}`, { state: bootcampDetails?.bootcampName })}
          className="block w-full text-left p-2 my-2 rounded text-gray-100 hover:bg-gray-700 transition"
        >
          My KPIs
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <h2 className="text-xl font-bold text-white">
            My Students — {bootcampDetails?.bootcampName ?? "…"}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-gray-300">Hi {user?.company_username}</span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && !bootcamps?.length && !deferred?.length ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader />
            <p className="text-gray-400 mt-2">Loading student list…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current course */}
            <p className="text-gray-300">
              Current course: <span className="text-white font-medium">{currentCourse || "—"}</span>
            </p>

            {/* All students in one table */}
            <div className="border border-gray-600 rounded-xl bg-gray-900/40 p-4 max-w-5xl">
              <h3 className="text-lg font-semibold text-white mb-3">
                All students — {bootcampDetails?.bootcampName ?? "…"}
              </h3>
              <div className="rounded-lg border border-gray-600 overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-700/80">
                      <th className="px-4 py-2 text-left text-sm font-medium text-white">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-white">Status</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-white">Modules complete</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-white">End date</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {!bootcamps?.length && !deferred?.length && !loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                          No students in this bootcamp.
                        </td>
                      </tr>
                    ) : (
                      [...(bootcamps ?? []).map((s) => ({ ...s, _status: "Active" })), ...(deferred ?? []).map((s) => ({ ...s, _status: "Deferred" }))].map((student, index) => {
                        const completed = student?.completedCoursesCount ?? 0;
                        const total = bootcampDetails?.learningpathcourses ?? 0;
                        const pct = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
                        const isDeferred = student?._status === "Deferred";
                        return (
                          <tr
                            key={`${student?.userid?._id ?? index}-${student?._status}`}
                            className="hover:bg-gray-700/40 transition"
                          >
                            <td className="px-4 py-2 text-white font-medium">
                              {student?.userid?.username ?? "N/A"}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-sm font-medium ${isDeferred ? "text-amber-400" : "text-green-400"}`}>
                                {student?._status ?? (isDeferred ? "Deferred" : "Active")}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden shrink-0">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      pct >= 100
                                        ? "bg-green-500"
                                        : pct >= 50
                                        ? "bg-blue-500"
                                        : pct >= 25
                                        ? "bg-amber-500"
                                        : "bg-gray-500"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-gray-300 text-sm tabular-nums">
                                  {completed}/{total}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-gray-300 text-sm">
                              {isDeferred && student?.deferredDetails?.newBootcampEndDate
                                ? new Date(student.deferredDetails.newBootcampEndDate).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <a
                                  href={`https://www.zaio.io/app/zaio-profile/${student?.userid?.email}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline text-sm"
                                >
                                  View Calendar
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(`/tutor/analytics/${bootcampId}/${student?.userid?._id}`, {
                                      state: student,
                                    })
                                  }
                                  className="text-blue-400 hover:underline cursor-pointer text-sm"
                                >
                                  View
                                </button>
                                {student?.isbootCampPassed && (
                                  <span className="text-green-400 inline-flex items-center" title="Bootcamp passed">
                                    <RxCheckCircled className="w-5 h-5" />
                                  </span>
                                )}
                                {isDeferred && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/defer-student/goals?learningpath=${student?.learningpath}&email=${student?.userid?.email}`,
                                        { state: student }
                                      )
                                    }
                                    className="text-blue-400 hover:underline cursor-pointer text-sm"
                                  >
                                    View Goals
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
