import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../../store/UserProvider";
import { useEffect, useRef, useState } from "react";
import {
  getTutorKPIUserModulePlatfromProgress,
  getTutorKPIUserModuleSummaryStats,
} from "../../api/student";

export default function TutorKPIStudentSummary() {
  const navigate = useNavigate();
  const { courseId, bootcampId, learningpathId, tutorRefreshId, tutorId } =
    useParams();
  const bootcampState = useLocation();
  const { state } = bootcampState;
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const isFirstLoad = useRef(true);

  const calculateModuleMark = ({
    assignmentAvg,
    mcqCompleted,
    mcqTotal,
    challengeCompleted,
    challengeTotal,
  }) => {
    // Calculate percentages
    const mcqPercentage = mcqTotal > 0 ? (mcqCompleted / mcqTotal) * 100 : null;
    const challengePercentage =
      challengeTotal > 0 ? (challengeCompleted / challengeTotal) * 100 : null;
    const weightage = {
      1: {
        weight: 1,
      },
      2: {
        weight: 0.5,
      },
      3: {
        weight: 0.4,
      },
    };
    // Rules:
    const calcAttributes = [];
    if (challengePercentage > 0) calcAttributes.push(challengePercentage);
    if (assignmentAvg > 0) calcAttributes.push(assignmentAvg);
    if (mcqPercentage > 0) calcAttributes.push(mcqPercentage);

    let moduleMarkPercent = 0;
    if (calcAttributes.length === 1)
      moduleMarkPercent = weightage["1"].weight * calcAttributes[0];
    else if (calcAttributes.length === 2)
      moduleMarkPercent =
        weightage["2"].weight * (calcAttributes[0] + calcAttributes[1]);
    else if (calcAttributes.length === 3)
      moduleMarkPercent =
        weightage["3"].weight * (calcAttributes[0] + calcAttributes[1]) +
        (1 - 2 * weightage["3"].weight) * calcAttributes[2];
    return moduleMarkPercent.toFixed(2);
  };

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await getTutorKPIUserModuleSummaryStats(
        tutorId,
        bootcampId,
        learningpathId,
        courseId,
        tutorRefreshId
      );
      if (response.data.length > 0) {
        const calcResponse = response.data.map((module) => {
          const moduleMark = calculateModuleMark({
            assignmentAvg: parseFloat(module.bootcampcourseassginment) || 0,
            mcqCompleted: module.course.analytics[0].completedMCQCount,
            mcqTotal: module.total.mcq,
            challengeCompleted:
              module.course.analytics[0].completedChallengesCount,
            challengeTotal: module.total.challenge,
          });
          return { ...module, moduleMark };
        });
        setSummary(calcResponse);
      }
    } catch (error) {
      setLoading(`${error?.message} || Error getting list`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      fetchSummary();
      if (state)
        localStorage.setItem("kpi_course_summary", state?.breadcrumb?.course);
    }
  }, []);

  return (
    <div className="flex flex-col max-h-max bg-gray-800 text-gray-100 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        {tutorRefreshId === "all" && (
          <h2 className="text-xl font-bold text-white">
            MY KPIs /{" "}
            {state?.breadcrumb?.bootcamp || localStorage.getItem("kpi_summary")}{" "}
            /{" "}
            {state?.breadcrumb?.course ||
              localStorage.getItem("kpi_course_summary")}
          </h2>
        )}
        <button
          onClick={() =>
            tutorRefreshId === "all"
              ? navigate(`/tutor/kpi/analytics/${bootcampId}`)
              : navigate(-1)
          } // Navigate back
          className="text-blue-400 cursor-pointer"
        >
          Back
        </button>
      </div>

      {/* Summary Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-700 text-left">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="p-2 border-b border-gray-600">Name</th>
              <th className="p-2 border-b border-gray-600">MCQs</th>
              <th className="p-2 border-b border-gray-600">
                Coding Challenges
              </th>
              <th className="p-2 border-b border-gray-600">Assignment (GC)</th>
              <th className="p-2 border-b border-gray-600">
                Platform Progress
              </th>
              <th className="p-2 border-b border-gray-600">Module Mark</th>
            </tr>
          </thead>
          <tbody>
            {summary.length > 0 ? (
              summary.map((record, index) => (
                <tr
                  key={index}
                  className={`even:bg-gray-800 odd:bg-gray-700 hover:bg-gray-600 cursor-pointer`}
                >
                  <td className="p-2 border-b border-gray-700">
                    {record.userData.username}
                  </td>
                  <td className="p-2 border-b border-gray-700">
                    {record.course.analytics[0].completedMCQCount}/
                    {record.total.mcq} (
                    {record.course.analytics[0].completedMCQCount > 0
                      ? Math.ceil(
                          (record.course.analytics[0].completedMCQCount /
                            record.total.mcq) *
                            100
                        )
                      : 0}
                    %)
                  </td>
                  <td className="p-2 border-b border-gray-700">
                    {record.course.analytics[0].completedChallengesCount}/
                    {record.total.challenge} (
                    {record.course.analytics[0].completedChallengesCount > 0
                      ? Math.ceil(
                          (record.course.analytics[0].completedChallengesCount /
                            record.total.challenge) *
                            100
                        )
                      : 0}
                    %)
                  </td>
                  <td className="p-2 border-b border-gray-700">
                    {/* {record.course.analytics[0].completedAssignmentCount}/
                    {record.total.assignment} (
                    {record.course.analytics[0].completedAssignmentCount > 0
                      ? Math.ceil(
                          (record.course.analytics[0].completedAssignmentCount /
                            record.total.assignment) *
                            100
                        )
                      : 0}
                    %) */}
                    {parseFloat(record.bootcampcourseassginment).toFixed(2)}%
                  </td>
                  <td className="p-2 border-b border-gray-700">
                    {record.platfromProgress}%
                  </td>
                  <td className="p-2 border-b border-gray-700">
                    {record.moduleMark}%
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center p-4">
                  {loading ? "Getting Module Stats..." : "No data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
