import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getOCStudentDetails } from "../../api/company";
import Loader from "../../components/loader/loader";

const OCStudentDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { student, program } = location.state || {};
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!student || !student.id) {
        navigate("/oc-programs");
        return;
      }

      try {
        const response = await getOCStudentDetails(student.id);
        if (response?.status === 200 && response?.success) {
          const data = response.data;
          setStudentData({
            ...student,
            ...data,
            knowledgeModules: (data.knowledgeModules || []).map((module) => ({
              ...module,
              units: [],
            })),
            practicalModules: (data.practicalModules || []).map((module) => ({
              ...module,
              units: [],
            })),
            workplaceModules: data.workplaceModules || [],
            nonQctoLearningPathName: data.nonQctoLearningPathName || null,
            nonQctoModules: data.nonQctoModules || [],
          });
        } else {
          setStudentData({
            ...student,
            knowledgeModules: [],
            practicalModules: [],
            workplaceModules: [],
            nonQctoLearningPathName: null,
            nonQctoModules: [],
          });
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
        setStudentData({
          ...student,
          knowledgeModules: [],
          practicalModules: [],
          workplaceModules: [],
          nonQctoLearningPathName: null,
          nonQctoModules: [],
        });
      }
    };

    fetchStudentData();
  }, [student, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-600 text-white";
      case "In Progress":
        return "bg-amber-500/90 text-gray-900";
      case "Not Started":
        return "bg-gray-600 text-gray-200";
      default:
        return "bg-gray-600 text-gray-200";
    }
  };

  const handleModuleClick = (module, moduleType, e) => {
    e.stopPropagation(); // Prevent row click if needed
    
    // Store module data in sessionStorage for the new page to access
    sessionStorage.setItem(`module-${module.id}`, JSON.stringify({
      module,
      moduleType,
      student: studentData,
      program
    }));
    
    // Open in new tab
    const studentId = studentData?.id || student?.id || 'unknown';
    const url = `/oc-programs/student/${studentId}/module/${module.id}`;
    window.open(url, '_blank');
  };

  if (!studentData) {
    return (
      <div className="min-h-screen bg-[#0D1117] px-6 md:px-12 lg:px-24 xl:px-36 py-8 flex flex-col items-center justify-center">
        <Loader />
        <p className="text-gray-400 mt-4">Loading student details…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D1117] px-6 md:px-12 lg:px-24 xl:px-36 py-8">
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate("/oc-programs")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer mb-4"
        >
          ← Back to OC Programs
        </button>
        <h1 className="text-3xl font-bold text-white mb-1">Student Details</h1>
        <p className="text-gray-400">{studentData.name} — OC progress and modules</p>
      </div>

      <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <p className="text-gray-200 text-lg">{studentData.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <p className="text-gray-200 text-lg">{studentData.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">ID Number</label>
            <p className="text-gray-200 text-lg">{studentData.idNumber || "—"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
            <p className="text-gray-200 text-lg">{formatDate(studentData.startDate)}</p>
          </div>
        </div>
      </div>

      {/* Knowledge Modules */}
      <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Knowledge Modules</h2>
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-800/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Module Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {studentData.knowledgeModules && studentData.knowledgeModules.length > 0 ? (
                studentData.knowledgeModules.map((module) => (
                  <tr
                    key={module.id}
                    className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                    onClick={(e) => handleModuleClick(module, "KM", e)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-200">{module.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                      {module.score !== null && module.score !== undefined ? `${module.score}%` : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    No Knowledge Modules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Practical Modules */}
      <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Practical Modules</h2>
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-800/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Module Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {studentData.practicalModules && studentData.practicalModules.length > 0 ? (
                studentData.practicalModules.map((module) => (
                  <tr
                    key={module.id}
                    className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                    onClick={(e) => handleModuleClick(module, "PM", e)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-200">{module.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                      {module.score !== null && module.score !== undefined ? `${module.score}%` : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    No Practical Modules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workplace Modules */}
      <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Workplace Modules</h2>
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-800/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Module Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {studentData.workplaceModules && studentData.workplaceModules.length > 0 ? (
                studentData.workplaceModules.map((module) => (
                  <tr key={module.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-200">{module.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                      {module.score !== null && module.score !== undefined ? `${module.score}%` : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    No Workplace Modules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Non-QCTO Learning Path (when cohort has dual path) */}
      {studentData.nonQctoModules && studentData.nonQctoModules.length > 0 && (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">
            Non-QCTO Learning Path
          </h2>
          {studentData.nonQctoLearningPathName && (
            <p className="text-gray-400 text-sm mb-4">{studentData.nonQctoLearningPathName}</p>
          )}
          <div className="rounded-lg border border-gray-700 overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-800/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Course / Module</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {studentData.nonQctoModules.map((module) => (
                  <tr key={module.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-200">{module.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                      {module.completedPercentage != null ? `${module.completedPercentage}%` : (module.score != null ? `${module.score}%` : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCStudentDetails;

