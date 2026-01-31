import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getOCModuleDetails } from "../../api/company";
import Loader from "../../components/loader/loader";
import { useUserStore } from "../../store/UserProvider";
import { FaPlay, FaFileAlt, FaBook, FaTools } from "react-icons/fa";

const OCModuleDetails = () => {
  const { studentId, moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [moduleData, setModuleData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [moduleType, setModuleType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedUnits, setExpandedUnits] = useState({});
  const [completedItems, setCompletedItems] = useState({}); // Track completed lectures, assignments, quizzes
  const isReadOnly = user?.role === "TUTOR"; // Tutors have read-only access

  useEffect(() => {
    const fetchModuleData = async () => {
      // Get module data from sessionStorage as fallback
      const storedData = sessionStorage.getItem(`module-${moduleId}`);
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          setStudentData(parsed.student);
          setModuleType(parsed.moduleType);
        } catch (error) {
          console.error("Error parsing stored data:", error);
        }
      }

      // Fetch module details from API
      try {
        const response = await getOCModuleDetails(studentId, moduleId);
        if (response?.status === 200 && response?.success) {
          setModuleData(response.data);
        } else {
          // Fallback to stored data if API fails
          if (storedData) {
            const parsed = JSON.parse(storedData);
            setModuleData(parsed.module);
          } else {
            navigate("/oc-programs");
          }
        }
      } catch (error) {
        console.error("Error fetching module details:", error);
        // Fallback to stored data
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            setModuleData(parsed.module);
          } catch (e) {
            navigate("/oc-programs");
          }
        } else {
          navigate("/oc-programs");
        }
      } finally {
        setLoading(false);
      }
    };

    if (studentId && moduleId) {
      fetchModuleData();
    } else {
      navigate("/oc-programs");
    }
  }, [moduleId, studentId, navigate]);

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

  const toggleUnit = (unitId) => {
    setExpandedUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  // Check if an item is completed
  const isItemCompleted = (item, itemType) => {
    // If item is an object with a 'completed' property, use that
    if (item && typeof item === 'object' && 'completed' in item) {
      return item.completed;
    }
    // Otherwise, check if it's a string and look it up in completedItems
    if (typeof item === 'string') {
      const key = `${itemType}-${item}`;
      return completedItems[key] || false;
    }
    return false;
  };

  // Get item name (handle both string and object formats)
  const getItemName = (item) => {
    if (item && typeof item === 'object' && 'name' in item) {
      return item.name;
    }
    return item;
  };

  // Get lecture/assignment type icon
  const getItemIcon = (item) => {
    if (!item || typeof item !== 'object') {
      return <FaFileAlt className="w-5 h-5 text-gray-500 mr-2 flex-shrink-0" />;
    }

    // Check for QCTO Summative Assessment
    if (item.type === "qctosa" || item.isQCTOAssessment || item.qctosummativeid) {
      return <FaFileAlt className="w-5 h-5 text-purple-500 mr-2 flex-shrink-0" />;
    }

    // Check for QCTO Learner Workbook
    if (item.type === "qctolw" || item.isQCTOLW || item.qctolwid) {
      return <FaBook className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />;
    }

    // Check for QCTO Practical Module Task
    if (item.type === "qctopmt" || item.isQCTOPMT || item.qctopmtid) {
      return <FaTools className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0" />;
    }

    // Default: Regular video lecture (for lectures) or assignment (for assignments)
    if (item.type === "lecture" || item.lecturename) {
      return <FaPlay className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" />;
    }

    return <FaFileAlt className="w-5 h-5 text-gray-500 mr-2 flex-shrink-0" />;
  };

  // Handle lecture click - open in watch page
  const handleLectureClick = (lecture, unit) => {
    if (!lecture || typeof lecture !== 'object') return;
    
    const baseUrl = window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://www.zaio.io";
    
    // Check if it's a QCTO Summative Assessment - if so, open assessor view
    if (lecture.type === "qctosa" || lecture.isQCTOAssessment) {
      // Get the user token from localStorage to pass as auth
      const token = localStorage.getItem("TOKEN");
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const assessorUrl = `${baseUrl}/assessor/qcto-assessment/${lecture.qctosummativeid || lecture.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Check if it's a QCTO PM - if so, open assessor view
    if (lecture.type === "qctopmt" || lecture.isQCTOPMT) {
      // Get the user token from localStorage to pass as auth
      const token = localStorage.getItem("TOKEN");
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const assessorUrl = `${baseUrl}/assessor/qcto-pmt/${lecture.qctopmtid || lecture.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Check if it's a QCTO Learner Workbook - if so, open assessor view
    if (lecture.type === "qctolw" || lecture.isQCTOLW) {
      // Get the user token from localStorage to pass as auth
      const token = localStorage.getItem("TOKEN");
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const assessorUrl = `${baseUrl}/assessor/qctolw/${lecture.qctolwid || lecture.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Regular lecture - open in watch page
    const watchUrl = `${baseUrl}/watch/${lecture.courseid}/${lecture.courseunitid}/${lecture.id}?userid=${studentId}`;
    window.open(watchUrl, '_blank');
  };

  // Handle assignment click - open assignment page
  const handleAssignmentClick = (assignment) => {
    const baseUrl = window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://www.zaio.io";
    
    // Get the user token from localStorage to pass as auth
    const token = localStorage.getItem("TOKEN");
    
    // Check if it's a QCTO Summative Assessment
    if (assignment && typeof assignment === 'object' && assignment.isQCTOAssessment) {
      // Open in zaio-frontend for assessor to view submissions
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const assessorUrl = `${baseUrl}/assessor/qcto-assessment/${assignment.qctosummativeid || assignment.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Check if it's a QCTO PM
    if (assignment && typeof assignment === 'object' && (assignment.type === "qctopmt" || assignment.isQCTOPMT)) {
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const assessorUrl = `${baseUrl}/assessor/qcto-pmt/${assignment.qctopmtid || assignment.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Check if it's a QCTO Learner Workbook
    if (assignment && typeof assignment === 'object' && (assignment.type === "qctolw" || assignment.isQCTOLW)) {
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const assessorUrl = `${baseUrl}/assessor/qctolw/${assignment.qctolwid || assignment.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // For other assignments, show alert for now
    console.log("Opening assignment:", assignment);
    alert(`Opening assignment: ${getItemName(assignment)}`);
  };

  // Handle quiz click - open quiz page
  const handleQuizClick = (quiz) => {
    // TODO: Implement quiz viewing
    // For now, we can show an alert or navigate to quiz page
    console.log("Opening quiz:", quiz);
    // You can implement navigation to quiz details page here
    alert(`Opening quiz: ${getItemName(quiz)}`);
  };

  // Initialize expanded state for all units (all expanded by default)
  useEffect(() => {
    if (moduleData && moduleData.units) {
      const initialExpanded = {};
      moduleData.units.forEach((unit) => {
        initialExpanded[unit.id] = true; // Start with all units expanded
      });
      setExpandedUnits(initialExpanded);
    }
  }, [moduleData]);

  if (loading) {
    return (
      <div className="px-36 py-12">
        <p className="text-white">Loading module details...</p>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="px-36 py-12">
        <p className="text-white">Module not found</p>
        <button
          onClick={() => navigate("/oc-programs")}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium mt-4"
        >
          ← Back to OC Programs
        </button>
      </div>
    );
  }

  return (
    <div className="px-36 py-12">
      <div className="mb-6">
        <button
          onClick={() => window.close()}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium mb-4"
        >
          ← Close Tab
        </button>
        <h1 className="text-4xl font-bold text-gray-100 mb-2">{moduleData.name}</h1>
        <div className="flex items-center space-x-4">
          <span
            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full text-white ${getStatusColor(
              moduleData.status
            )}`}
          >
            {moduleData.status}
          </span>
          {moduleData.score !== null && (
            <span className="text-white text-lg">Score: {moduleData.score}%</span>
          )}
          {studentData && (
            <span className="text-gray-300">Student: {studentData.name}</span>
          )}
        </div>
      </div>

      {moduleData.units && moduleData.units.length > 0 ? (
        <div className="space-y-4">
          {moduleData.units.map((unit) => {
            const isExpanded = expandedUnits[unit.id] !== false; // Default to true
            return (
              <div key={unit.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Unit Header - Clickable */}
                <button
                  onClick={() => toggleUnit(unit.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-xl font-bold text-gray-800">{unit.name}</h2>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      isExpanded ? "transform rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200">
                    {unit.lectures && unit.lectures.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-3">Lectures</h3>
                        <ul className="space-y-2">
                          {unit.lectures.map((lecture, idx) => {
                            const isCompleted = isItemCompleted(lecture, "lecture");
                            const lectureName = getItemName(lecture);
                            const isClickable = lecture && typeof lecture === 'object' && lecture.id;
                            return (
                              <li
                                key={lecture.id || idx}
                                className={`flex items-center text-gray-700 pl-4 ${
                                  isClickable ? "cursor-pointer hover:bg-gray-50 rounded px-2 py-1" : ""
                                }`}
                                onClick={() => isClickable && handleLectureClick(lecture, unit)}
                              >
                                {/* Type icon */}
                                {getItemIcon(lecture)}
                                {/* Completion checkmark */}
                                {isCompleted && (
                                  <svg
                                    className="w-4 h-4 text-green-500 mr-1 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                                <span className={isClickable ? "text-blue-600 hover:text-blue-800 hover:underline" : ""}>
                                  {lectureName}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                          {unit.assignments && unit.assignments.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-3">Assignments</h3>
                        <ul className="space-y-2">
                          {unit.assignments.map((assignment, idx) => {
                            const isCompleted = isItemCompleted(assignment, "assignment");
                            const assignmentName = getItemName(assignment);
                            return (
                              <li
                                key={assignment.id || idx}
                                className="flex items-center text-gray-700 pl-4 cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                onClick={() => handleAssignmentClick(assignment)}
                              >
                                {/* Type icon */}
                                {getItemIcon(assignment)}
                                {/* Completion checkmark */}
                                {isCompleted && (
                                  <svg
                                    className="w-4 h-4 text-green-500 mr-1 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                                <span className="text-blue-600 hover:text-blue-800 hover:underline">
                                  {assignmentName}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {unit.quizzes && unit.quizzes.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-3">Quizzes</h3>
                        <ul className="space-y-2">
                          {unit.quizzes.map((quiz, idx) => {
                            const isCompleted = isItemCompleted(quiz, "quiz");
                            const quizName = getItemName(quiz);
                            return (
                              <li
                                key={quiz.id || idx}
                                className="flex items-center text-gray-700 pl-4 cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                                onClick={() => handleQuizClick(quiz)}
                              >
                                {isCompleted ? (
                                  <svg
                                    className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  <div className="w-5 h-5 mr-2 flex-shrink-0" />
                                )}
                                <span className="text-blue-600 hover:text-blue-800 hover:underline">
                                  {quizName}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-600">No units available for this module.</p>
        </div>
      )}
    </div>
  );
};

export default OCModuleDetails;

