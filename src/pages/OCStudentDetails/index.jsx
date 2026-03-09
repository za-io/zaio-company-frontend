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
        return "bg-emerald-500/20 text-emerald-400";
      case "In Progress":
        return "bg-amber-500/20 text-amber-400";
      case "Not Started":
        return "bg-slate-600/40 text-slate-400";
      default:
        return "bg-slate-600/40 text-slate-400";
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center antialiased">
        <Loader />
        <p className="text-slate-400 mt-4 text-sm">Loading student details…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 sm:px-6 md:px-10 lg:px-20 py-10 text-slate-200 antialiased">
      <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <button
          type="button"
          onClick={() => navigate("/oc-programs")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 text-slate-300 text-sm font-medium hover:bg-slate-700/60 hover:text-slate-100 transition-colors cursor-pointer mb-4"
        >
          ← Back to OC Programs
        </button>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100 mb-2 leading-tight">Student Details</h1>
        <p className="text-slate-400 text-sm">{studentData.name} — OC progress and modules</p>
      </div>

      <div className="bg-slate-800/40 rounded-2xl p-6 mb-8">
        <h2 className="text-base font-medium text-slate-200 mb-4 tracking-wide">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Name</label>
            <p className="text-slate-200 text-sm">{studentData.name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Email</label>
            <p className="text-slate-200 text-sm">{studentData.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">ID Number</label>
            <p className="text-slate-200 text-sm">{studentData.idNumber || "—"}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Start Date</label>
            <p className="text-slate-200 text-sm">{formatDate(studentData.startDate)}</p>
          </div>
        </div>
      </div>

      {/* Knowledge Modules */}
      <div className="bg-slate-800/40 rounded-2xl p-6 mb-8">
        <h2 className="text-base font-medium text-slate-200 mb-4 tracking-wide">Knowledge Modules</h2>
        <div className="rounded-xl overflow-hidden bg-slate-800/30">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700/30">
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Module Name</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody>
              {studentData.knowledgeModules && studentData.knowledgeModules.length > 0 ? (
                studentData.knowledgeModules.map((module) => (
                  <tr
                    key={module.id}
                    className="border-t border-slate-700/30 hover:bg-slate-800/40 transition-colors cursor-pointer first:border-t-0"
                    onClick={(e) => handleModuleClick(module, "KM", e)}
                  >
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-200">{module.name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-400">
                      {module.score !== null && module.score !== undefined ? `${module.score}%` : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                    No Knowledge Modules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Practical Modules */}
      <div className="bg-slate-800/40 rounded-2xl p-6 mb-8">
        <h2 className="text-base font-medium text-slate-200 mb-4 tracking-wide">Practical Modules</h2>
        <div className="rounded-xl overflow-hidden bg-slate-800/30">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700/30">
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Module Name</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody>
              {studentData.practicalModules && studentData.practicalModules.length > 0 ? (
                studentData.practicalModules.map((module) => (
                  <tr
                    key={module.id}
                    className="border-t border-slate-700/30 hover:bg-slate-800/40 transition-colors cursor-pointer first:border-t-0"
                    onClick={(e) => handleModuleClick(module, "PM", e)}
                  >
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-200">{module.name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-400">
                      {module.score !== null && module.score !== undefined ? `${module.score}%` : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
                    No Practical Modules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workplace Modules */}
      <div className="bg-slate-800/40 rounded-2xl p-6 mb-8">
        <h2 className="text-base font-medium text-slate-200 mb-4 tracking-wide">Workplace Modules</h2>
        <div className="rounded-xl overflow-hidden bg-slate-800/30">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-700/30">
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Module Name</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody>
              {studentData.workplaceModules && studentData.workplaceModules.length > 0 ? (
                studentData.workplaceModules.map((module) => (
                  <tr key={module.id} className="border-t border-slate-700/30 hover:bg-slate-800/40 transition-colors first:border-t-0">
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-200">{module.name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-400">
                      {module.score !== null && module.score !== undefined ? `${module.score}%` : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-500">
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
        <div className="bg-slate-800/40 rounded-2xl p-6 mb-8">
          <h2 className="text-base font-medium text-slate-200 mb-1 tracking-wide">
            Non-QCTO Learning Path
          </h2>
          {studentData.nonQctoLearningPathName && (
            <p className="text-slate-400 text-sm mb-4">{studentData.nonQctoLearningPathName}</p>
          )}
          <div className="rounded-xl overflow-hidden bg-slate-800/30">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700/30">
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Course / Module</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Progress</th>
                </tr>
              </thead>
              <tbody>
                {studentData.nonQctoModules.map((module) => (
                  <tr key={module.id} className="border-t border-slate-700/30 hover:bg-slate-800/40 transition-colors first:border-t-0">
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-200">{module.name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-400">
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
    </div>
  );
};

export default OCStudentDetails;

