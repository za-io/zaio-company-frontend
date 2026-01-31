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
          // Add units data to modules (this will be fetched when module is clicked)
          const data = response.data;
          setStudentData({
            ...student,
            ...data,
            knowledgeModules: (data.knowledgeModules || []).map((module) => ({
              ...module,
              units: [], // Units will be loaded when module is opened
            })),
            practicalModules: (data.practicalModules || []).map((module) => ({
              ...module,
              units: [], // Units will be loaded when module is opened
            })),
          });
        } else {
          // Fallback to example data if API fails
          setStudentData({
            ...student,
            knowledgeModules: [],
            practicalModules: [],
            workplaceModules: [],
          });
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
        // Fallback to example data
        setStudentData({
          ...student,
          knowledgeModules: [],
          practicalModules: [],
          workplaceModules: [],
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
        return "bg-green-500";
      case "In Progress":
        return "bg-yellow-500";
      case "Not Started":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
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
      <div className="px-36 py-12">
        <Loader />
      </div>
    );
  }

  return (
    <div className="px-36 py-12">
      <div className="mb-6">
        <button
          onClick={() => navigate("/oc-programs")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium mb-4"
        >
          ← Back to OC Programs
        </button>
        <h1 className="text-4xl font-bold text-gray-100">Student Details</h1>
      </div>

      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Personal Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <p className="text-gray-900 text-lg">{studentData.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900 text-lg">{studentData.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
            <p className="text-gray-900 text-lg">{studentData.idNumber}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <p className="text-gray-900 text-lg">{formatDate(studentData.startDate)}</p>
          </div>
        </div>
      </div>

      {/* Knowledge Modules */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Knowledge Modules</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Module Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentData.knowledgeModules && studentData.knowledgeModules.length > 0 ? (
                studentData.knowledgeModules.map((module) => (
                <tr 
                  key={module.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => handleModuleClick(module, "KM", e)}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {module.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(
                        module.status
                      )}`}
                    >
                      {module.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {module.score !== null ? `${module.score}%` : "N/A"}
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                    No Knowledge Modules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Practical Modules */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Practical Modules</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Module Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentData.practicalModules && studentData.practicalModules.length > 0 ? (
                studentData.practicalModules.map((module) => (
                <tr 
                  key={module.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => handleModuleClick(module, "PM", e)}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {module.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(
                        module.status
                      )}`}
                    >
                      {module.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {module.score !== null ? `${module.score}%` : "N/A"}
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                    No Practical Modules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workplace Modules */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Workplace Modules</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Module Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentData.workplaceModules && studentData.workplaceModules.length > 0 ? (
                studentData.workplaceModules.map((module) => (
                <tr key={module.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {module.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(
                        module.status
                      )}`}
                    >
                      {module.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {module.score !== null ? `${module.score}%` : "N/A"}
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                    No Workplace Modules found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OCStudentDetails;

