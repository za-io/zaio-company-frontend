import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../../store/UserProvider";
import { useEffect, useRef, useState } from "react";
import { getTutorKPIUserModuleSummaryStats } from "../../api/student";

export default function TutorKPIStudentSummary() {
  const navigate = useNavigate();
  const { courseId, bootcampId, learningpathId } = useParams();
  const { user } = useUserStore();
  const bootcampState = useLocation();
  const { state } = bootcampState;
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const isFirstLoad = useRef(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await getTutorKPIUserModuleSummaryStats(
        user._id,
        bootcampId,
        learningpathId,
        courseId
      );
      setSummary(response.data);
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
    }
  }, []);

  return (
    <div className="flex flex-col max-h-max bg-gray-800 text-gray-100 p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">
          MY KPIs / {state?.breadcrumb?.bootcamp} / {state?.breadcrumb?.course}
        </h2>
        <button
          onClick={() => navigate(-1)} // Navigate back
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
              <th className="p-2 border-b border-gray-600">Coding Challenges</th>
              <th className="p-2 border-b border-gray-600">Assignment (GC)</th>
              <th className="p-2 border-b border-gray-600">Platform Progress</th>
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
                    {record.course.analytics[0].completedAssignmentCount}/
                    {record.total.assignment} (
                    {record.course.analytics[0].completedAssignmentCount > 0
                      ? Math.ceil(
                          (record.course.analytics[0].completedAssignmentCount /
                            record.total.assignment) *
                            100
                        )
                      : 0}
                    %)
                  </td>
                  <td className="p-2 border-b border-gray-700">0%</td>
                  <td className="p-2 border-b border-gray-700">0%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center p-4">
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
