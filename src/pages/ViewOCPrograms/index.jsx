import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  getAllOCCohorts,
  getCohortStudents,
  assignAssessor,
  assignModerator,
  getAllTutors,
  getAllAssessors,
  getAllModerators,
  assignTutorToStudent,
} from "../../api/company";
import { useUserStore } from "../../store/UserProvider";
import Loader from "../../components/loader/loader";

const ViewOCPrograms = () => {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [ocPrograms, setOcPrograms] = useState([]);
  const [error, setError] = useState(null);
  const [showAssessorModal, setShowAssessorModal] = useState(false);
  const [showModeratorModal, setShowModeratorModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showStudentsTable, setShowStudentsTable] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedAssessor, setSelectedAssessor] = useState("");
  const [selectedModerator, setSelectedModerator] = useState("");
  const [assessors, setAssessors] = useState([]);
  const [moderators, setModerators] = useState([]);
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTutor, setSelectedTutor] = useState("");
  const [tutors, setTutors] = useState([]);

  useEffect(() => {
    const fetchOCPrograms = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getAllOCCohorts(user?._id);
        if (response?.status === 200 && response?.success) {
          setOcPrograms(response.data || []);
        } else {
          setError(response?.message || "Error loading OC programs");
        }
      } catch (err) {
        setError("Error loading OC programs");
        console.error("Error fetching OC programs:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAssessorsAndModerators = async () => {
      try {
        // Fetch assessors, moderators, and tutors separately
        const [assessorsRes, moderatorsRes, tutorsRes] = await Promise.all([
          getAllAssessors(),
          getAllModerators(),
          getAllTutors(),
        ]);

        if (assessorsRes?.data) {
          const assessorList = assessorsRes.data.map((assessor) => ({
            id: assessor._id,
            name: assessor.company_username || assessor.email,
          }));
          setAssessors(assessorList);
        }

        if (moderatorsRes?.data) {
          const moderatorList = moderatorsRes.data.map((moderator) => ({
            id: moderator._id,
            name: moderator.company_username || moderator.email,
          }));
          setModerators(moderatorList);
        }

        if (tutorsRes?.data) {
          const tutorList = tutorsRes.data.map((tutor) => ({
            id: tutor._id,
            name: tutor.company_username || tutor.email,
          }));
          setTutors(tutorList);
        }

        // If no assessors/moderators found, fallback to tutors
        if ((!assessorsRes?.data || assessorsRes.data.length === 0) && 
            (!moderatorsRes?.data || moderatorsRes.data.length === 0)) {
          if (tutorsRes?.data) {
            const tutorList = tutorsRes.data.map((tutor) => ({
              id: tutor._id,
              name: tutor.company_username || tutor.email,
            }));
            setAssessors(tutorList);
            setModerators(tutorList);
          }
        }
      } catch (err) {
        console.error("Error fetching assessors/moderators/tutors:", err);
      }
    };

    if (user?._id) {
      fetchOCPrograms();
      fetchAssessorsAndModerators();
    } else {
      // Even if no user, try to fetch (for assessor login)
      fetchOCPrograms();
      fetchAssessorsAndModerators();
    }
  }, [user]);

  const getStudentCount = (emails) => {
    if (!emails) return 0;
    return emails.split(",").filter((email) => email.trim()).length;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleAssignAssessor = (program) => {
    // Only allow admin roles to assign assessors
    if (!user?.role || !["SUPER_ADMIN", "COMPANY_ADMIN"].includes(user.role)) {
      return;
    }
    setSelectedProgram(program);
    setShowAssessorModal(true);
  };

  const handleAssignModerator = (program) => {
    // Only allow admin roles to assign moderators
    if (!user?.role || !["SUPER_ADMIN", "COMPANY_ADMIN"].includes(user.role)) {
      return;
    }
    setSelectedProgram(program);
    setShowModeratorModal(true);
  };

  const handleSaveAssessor = async () => {
    if (!selectedAssessor || !selectedProgram) return;

    setLoading(true);
    try {
      const response = await assignAssessor(selectedProgram._id, selectedAssessor);
      if (response?.status === 200 && response?.success) {
        // Update the program in the list
        setOcPrograms((prev) =>
          prev.map((p) =>
            p._id === selectedProgram._id ? response.data : p
          )
        );
        setShowAssessorModal(false);
        setSelectedAssessor("");
        setSelectedProgram(null);
      } else {
        alert(response?.message || "Error assigning assessor");
      }
    } catch (error) {
      console.error("Error assigning assessor:", error);
      alert("Error assigning assessor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModerator = async () => {
    if (!selectedModerator || !selectedProgram) return;

    setLoading(true);
    try {
      const response = await assignModerator(selectedProgram._id, selectedModerator);
      if (response?.status === 200 && response?.success) {
        // Update the program in the list
        setOcPrograms((prev) =>
          prev.map((p) =>
            p._id === selectedProgram._id ? response.data : p
          )
        );
        setShowModeratorModal(false);
        setSelectedModerator("");
        setSelectedProgram(null);
      } else {
        alert(response?.message || "Error assigning moderator");
      }
    } catch (error) {
      console.error("Error assigning moderator:", error);
      alert("Error assigning moderator. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = async (program) => {
    setLoading(true);
    try {
      const response = await getCohortStudents(program._id);
      if (response?.status === 200 && response?.success) {
        console.log("Students data:", response.data);
        console.log("User role:", user?.role);
        setStudents(response.data || []);
        setSelectedProgram(program);
        setShowStudentsTable(true);
      } else {
        alert(response?.message || "Error loading students");
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      alert("Error loading students. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudentDetails = (student) => {
    navigate(`/oc-programs/student/${student.id}`, {
      state: { student, program: selectedProgram },
    });
  };

  const handleAssignTutor = (student) => {
    // Only allow admin roles to assign tutors
    if (!user?.role || !["SUPER_ADMIN", "COMPANY_ADMIN"].includes(user.role)) {
      return;
    }
    if (!student.enrollmentId) {
      alert("Error: Student enrollment ID not found. Please refresh and try again.");
      return;
    }
    setSelectedStudent(student);
    setSelectedTutor(student.tutor?.id || "");
    setShowTutorModal(true);
  };

  const handleSaveTutor = async () => {
    if (!selectedTutor || !selectedStudent) return;

    setLoading(true);
    try {
      const response = await assignTutorToStudent(selectedStudent.enrollmentId, selectedTutor);
      if (response?.status === 200 && response?.success) {
        // Update the student in the list
        setStudents((prev) =>
          prev.map((s) =>
            s.id === selectedStudent.id
              ? { ...s, tutor: response.data.tutor }
              : s
          )
        );
        setShowTutorModal(false);
        setSelectedTutor("");
        setSelectedStudent(null);
      } else {
        alert(response?.message || "Error assigning tutor");
      }
    } catch (error) {
      console.error("Error assigning tutor:", error);
      alert("Error assigning tutor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-36 py-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-100">OC Programs</h1>
        {selectedProgram && showStudentsTable && (
          <div className="flex space-x-4">
            {/* Only show Assign Assessor/Moderator buttons for admin roles */}
            {user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(user.role) && (
              <>
                <button
                  onClick={() => handleAssignAssessor(selectedProgram)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  Assign Assessor
                </button>
                <button
                  onClick={() => handleAssignModerator(selectedProgram)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium transition-colors"
                >
                  Assign Moderator
                </button>
              </>
            )}
            <button
              onClick={() => {
                setShowStudentsTable(false);
                setSelectedProgram(null);
                setStudents([]);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-medium transition-colors"
            >
              Back to Programs
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : error ? (
        <div className="text-red-500 text-lg">{error}</div>
      ) : showStudentsTable ? (
        <div className="overflow-x-auto">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">
            Students - {selectedProgram?.cohortName}
          </h2>
          {/* Debug info - remove after testing */}
          <div className="mb-4 p-2 bg-gray-700 rounded text-sm text-yellow-200">
            Debug: User Role = {user?.role || "undefined"} | Is Admin = {user?.role && (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN") ? "YES" : "NO"} | Students Count = {students.length}
          </div>
          <table className="overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
            <thead className="border-b text-2xl bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  ID Number
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Start Date
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Tutor
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-gray-100"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {student.idNumber}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {formatDate(student.startDate)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {student.tutor ? (
                      <span className="text-green-600 font-semibold">
                        {student.tutor.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not Assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    <div className="flex space-x-2">
                      {user?.role && (user.role === "SUPER_ADMIN" || user.role === "COMPANY_ADMIN") && (
                        <button
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                          onClick={() => handleAssignTutor(student)}
                        >
                          {student.tutor ? "Change Tutor" : "Assign Tutor"}
                        </button>
                      )}
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => handleViewStudentDetails(student)}
                    >
                      View Details
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : ocPrograms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white text-xl">
            No OC programs found. Create your first OC cohort to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="overflow-hidden border rounded-lg min-w-full divide-y divide-gray-200 bg-white my-4">
            <thead className="border-b text-2xl bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Cohort Name
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Learning Path
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Number of Students
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Date Created
                </th>
                <th className="px-6 py-3 text-xs font-bold text-left text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ocPrograms.map((program) => (
                <tr
                  key={program._id || program.id}
                  className="hover:bg-gray-100"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {program.cohortName || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {program.learningPathName || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {program.studentCount || 0}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {formatDate(program.date || program.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => handleViewStudents(program)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Assessor Modal */}
      <Modal
        centered
        show={showAssessorModal}
        onHide={() => {
          setShowAssessorModal(false);
          setSelectedAssessor("");
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800 text-white border-gray-700">
          <Modal.Title>Assign Assessor</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Assessor
            </label>
            <select
              value={selectedAssessor}
              onChange={(e) => setSelectedAssessor(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Assessor --</option>
              {assessors.map((assessor) => (
                <option key={assessor.id} value={assessor.id}>
                  {assessor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowAssessorModal(false);
                setSelectedAssessor("");
                setSelectedProgram(null);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAssessor}
              disabled={!selectedAssessor}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Assign Moderator Modal */}
      <Modal
        centered
        show={showModeratorModal}
        onHide={() => {
          setShowModeratorModal(false);
          setSelectedModerator("");
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800 text-white border-gray-700">
          <Modal.Title>Assign Moderator</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Moderator
            </label>
            <select
              value={selectedModerator}
              onChange={(e) => setSelectedModerator(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Moderator --</option>
              {moderators.map((moderator) => (
                <option key={moderator.id} value={moderator.id}>
                  {moderator.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowModeratorModal(false);
                setSelectedModerator("");
                setSelectedProgram(null);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveModerator}
              disabled={!selectedModerator}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Assign Tutor Modal */}
      <Modal
        centered
        show={showTutorModal}
        onHide={() => {
          setShowTutorModal(false);
          setSelectedTutor("");
          setSelectedStudent(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800 text-white border-gray-700">
          <Modal.Title>
            Assign Tutor - {selectedStudent?.name || "Student"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-gray-800 text-white">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Tutor
            </label>
            <select
              value={selectedTutor}
              onChange={(e) => setSelectedTutor(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">-- Select Tutor --</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.name}
                </option>
              ))}
            </select>
          </div>
          {selectedStudent?.tutor && (
            <div className="mb-4 p-3 bg-gray-700 rounded">
              <p className="text-sm text-gray-300">
                Current Tutor: <span className="font-semibold text-white">{selectedStudent.tutor.name}</span>
              </p>
            </div>
          )}
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => {
                setShowTutorModal(false);
                setSelectedTutor("");
                setSelectedStudent(null);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTutor}
              disabled={!selectedTutor}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {selectedStudent?.tutor ? "Update Tutor" : "Assign Tutor"}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ViewOCPrograms;

