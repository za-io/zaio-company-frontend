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
  createAccountsForEmails,
  addStudentsToOCCohort,
  createOrLinkAccountWithStudentNumber,
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
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [addStudentsEmails, setAddStudentsEmails] = useState("");
  const [addStudentsCreateAccounts, setAddStudentsCreateAccounts] = useState(true);
  const [addStudentsMessage, setAddStudentsMessage] = useState(null);
  const [addStudentsSubmitting, setAddStudentsSubmitting] = useState(false);
  const [showAddSingleStudentModal, setShowAddSingleStudentModal] = useState(false);
  const [addSingleStudentEmail, setAddSingleStudentEmail] = useState("");
  const [addSingleStudentNumber, setAddSingleStudentNumber] = useState("");
  const [addSingleStudentMessage, setAddSingleStudentMessage] = useState(null);
  const [addSingleStudentSubmitting, setAddSingleStudentSubmitting] = useState(false);

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

  const canAssignRoles = user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN", "SUPER_STUDENT_ADMIN"].includes(user.role);

  const handleAssignAssessor = (program) => {
    if (!canAssignRoles) return;
    setSelectedProgram(program);
    setShowAssessorModal(true);
  };

  const handleAssignModerator = (program) => {
    if (!canAssignRoles) return;
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
    if (!canAssignRoles) return;
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

  const handleOpenAddStudents = (program) => {
    setSelectedProgram(program);
    setAddStudentsEmails("");
    setAddStudentsMessage(null);
    setShowAddStudentsModal(true);
  };

  const handleOpenAddSingleStudent = (program) => {
    setSelectedProgram(program);
    setAddSingleStudentEmail("");
    setAddSingleStudentNumber("");
    setAddSingleStudentMessage(null);
    setShowAddSingleStudentModal(true);
  };

  const handleAddSingleStudentSubmit = async () => {
    const email = addSingleStudentEmail.trim().toLowerCase();
    const studentNumber = addSingleStudentNumber.trim();
    if (!email) {
      setAddSingleStudentMessage({ type: "error", text: "Enter email address." });
      return;
    }
    if (!studentNumber) {
      setAddSingleStudentMessage({ type: "error", text: "Enter student number." });
      return;
    }
    if (!selectedProgram?._id) return;
    setAddSingleStudentSubmitting(true);
    setAddSingleStudentMessage(null);
    try {
      const linkRes = await createOrLinkAccountWithStudentNumber({ email, student_number: studentNumber });
      if (!linkRes?.success) {
        setAddSingleStudentMessage({ type: "error", text: linkRes?.message || "Failed to create or link account." });
        setAddSingleStudentSubmitting(false);
        return;
      }
      const res = await addStudentsToOCCohort(selectedProgram._id, { emails: email });
      if (res?.status === 200 && res?.success) {
        setAddSingleStudentMessage({
          type: "success",
          text: res.message + (res.missingEmails?.length ? ` ${res.missingEmails.length} email(s) not found.` : ""),
        });
        setAddSingleStudentEmail("");
        setAddSingleStudentNumber("");
        const listRes = await getAllOCCohorts(user?._id);
        if (listRes?.status === 200 && listRes?.data) setOcPrograms(listRes.data);
        setTimeout(() => {
          setShowAddSingleStudentModal(false);
          setSelectedProgram(null);
        }, 2000);
      } else {
        setAddSingleStudentMessage({ type: "error", text: res?.message || "Enrollment failed." });
      }
    } catch (err) {
      setAddSingleStudentMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Something went wrong.",
      });
    } finally {
      setAddSingleStudentSubmitting(false);
    }
  };

  const handleAddStudentsSubmit = async () => {
    const emails = addStudentsEmails
      .split(/[\s,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.length) {
      setAddStudentsMessage({ type: "error", text: "Enter at least one email." });
      return;
    }
    if (!selectedProgram?._id) return;
    setAddStudentsSubmitting(true);
    setAddStudentsMessage(null);
    try {
      if (addStudentsCreateAccounts) {
        await createAccountsForEmails({ emails });
      }
      const res = await addStudentsToOCCohort(selectedProgram._id, { emails: emails.join(",") });
      if (res?.status === 200 && res?.success) {
        setAddStudentsMessage({
          type: "success",
          text: res.message + (res.missingEmails?.length ? ` ${res.missingEmails.length} email(s) not found.` : ""),
        });
        setAddStudentsEmails("");
        const listRes = await getAllOCCohorts(user?._id);
        if (listRes?.status === 200 && listRes?.data) setOcPrograms(listRes.data);
        setTimeout(() => {
          setShowAddStudentsModal(false);
          setSelectedProgram(null);
        }, 2000);
      } else {
        setAddStudentsMessage({ type: "error", text: res?.message || "Enrollment failed." });
      }
    } catch (err) {
      setAddStudentsMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Something went wrong.",
      });
    } finally {
      setAddStudentsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1117] px-6 md:px-12 lg:px-24 xl:px-36 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">OC Programs</h1>
        <p className="text-gray-400">View and manage your Occupational Certificate cohorts and students</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader />
          <p className="text-gray-400 mt-4">Loading…</p>
        </div>
      ) : error ? (
        <div className="bg-[#161B22] border border-gray-800 rounded-xl p-6 max-w-2xl">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      ) : showStudentsTable ? (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6 max-w-7xl">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-white">
              Students — {selectedProgram?.cohortName}
            </h2>
            <div className="flex flex-wrap gap-3">
              {canAssignRoles && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAssignAssessor(selectedProgram);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Assign Assessor
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAssignModerator(selectedProgram);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                  >
                    Assign Moderator
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowStudentsTable(false);
                  setSelectedProgram(null);
                  setStudents([]);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Back to Programs
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">ID Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Tutor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-200">{student.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{student.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{student.idNumber || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{formatDate(student.startDate)}</td>
                    <td className="px-4 py-3 text-sm">
                      {student.tutor ? (
                        <span className="text-emerald-400 font-medium">{student.tutor.name}</span>
                      ) : (
                        <span className="text-gray-500 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canAssignRoles && (
                          <button
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAssignTutor(student);
                            }}
                          >
                            {student.tutor ? "Change Tutor" : "Assign Tutor"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleViewStudentDetails(student);
                          }}
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
        </div>
      ) : ocPrograms.length === 0 ? (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-12 max-w-2xl text-center">
          <div className="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-300 text-lg mb-1">No OC programs yet</p>
          <p className="text-gray-500 text-sm">Create your first OC cohort to get started.</p>
        </div>
      ) : (
        <div className="bg-[#161B22] rounded-xl border border-gray-800 p-6 max-w-7xl">
          <h2 className="text-lg font-semibold text-white mb-4">All cohorts</h2>
          <div className="rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Cohort Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Learning Path</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {ocPrograms.map((program) => (
                  <tr key={program._id || program.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{program.cohortName || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{program.learningPathName || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{program.studentCount ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{formatDate(program.date || program.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canAssignRoles && (
                          <>
                            <button
                              type="button"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenAddStudents(program);
                              }}
                            >
                              Add students
                            </button>
                            <button
                              type="button"
                              className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenAddSingleStudent(program);
                              }}
                            >
                              Add Single student
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleViewStudents(program);
                          }}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Single student modal */}
      <Modal
        centered
        dialogClassName="rounded-xl overflow-hidden"
        contentClassName="bg-[#161B22] border border-gray-800"
        show={showAddSingleStudentModal}
        onHide={() => {
          setShowAddSingleStudentModal(false);
          setAddSingleStudentEmail("");
          setAddSingleStudentNumber("");
          setAddSingleStudentMessage(null);
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/90 text-white border-gray-700">
          <Modal.Title>Add Single student — {selectedProgram?.cohortName || "Cohort"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#161B22] text-white">
          <p className="text-gray-400 text-sm mb-4">
            Enter email and student number. The student number will be linked to the account (or used as password for new accounts), then the student will be enrolled.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Email address</label>
            <input
              type="email"
              placeholder="student@example.com"
              value={addSingleStudentEmail}
              onChange={(e) => setAddSingleStudentEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Student number</label>
            <input
              type="text"
              placeholder="STU12345"
              value={addSingleStudentNumber}
              onChange={(e) => setAddSingleStudentNumber(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {addSingleStudentMessage && (
            <p className={`text-sm mb-4 ${addSingleStudentMessage.type === "error" ? "text-red-400" : "text-green-400"}`}>
              {addSingleStudentMessage.text}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddSingleStudentModal(false);
                setAddSingleStudentEmail("");
                setAddSingleStudentNumber("");
                setAddSingleStudentMessage(null);
                setSelectedProgram(null);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={addSingleStudentSubmitting}
              onClick={handleAddSingleStudentSubmit}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addSingleStudentSubmitting ? "Enrolling…" : "Add Single student"}
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Add students modal */}
      <Modal
        centered
        dialogClassName="rounded-xl overflow-hidden"
        contentClassName="bg-[#161B22] border border-gray-800"
        show={showAddStudentsModal}
        onHide={() => {
          setShowAddStudentsModal(false);
          setAddStudentsEmails("");
          setAddStudentsMessage(null);
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/90 text-white border-gray-700">
          <Modal.Title>Add students — {selectedProgram?.cohortName || "Cohort"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#161B22] text-white">
          <p className="text-gray-400 text-sm mb-4">
            Enter comma-separated emails. Students will be enrolled in this OC program using the cohort&apos;s learning path and config.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Student emails</label>
            <textarea
              placeholder="student1@example.com, student2@example.com"
              value={addStudentsEmails}
              onChange={(e) => setAddStudentsEmails(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="add-students-create-accounts"
              checked={addStudentsCreateAccounts}
              onChange={(e) => setAddStudentsCreateAccounts(e.target.checked)}
              className="rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="add-students-create-accounts" className="text-sm text-gray-300">
              Create accounts and email students who don&apos;t have an account
            </label>
          </div>
          {addStudentsMessage && (
            <p className={`text-sm mb-4 ${addStudentsMessage.type === "error" ? "text-red-400" : "text-green-400"}`}>
              {addStudentsMessage.text}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddStudentsModal(false);
                setAddStudentsEmails("");
                setAddStudentsMessage(null);
                setSelectedProgram(null);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={addStudentsSubmitting}
              onClick={handleAddStudentsSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addStudentsSubmitting ? (addStudentsCreateAccounts ? "Enrolling…" : "Adding…") : "Add students"}
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Assign Assessor Modal */}
      <Modal
        centered
        dialogClassName="rounded-xl overflow-hidden"
        contentClassName="bg-[#161B22] border border-gray-800"
        show={showAssessorModal}
        onHide={() => {
          setShowAssessorModal(false);
          setSelectedAssessor("");
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/90 text-white border-gray-700">
          <Modal.Title>Assign Assessor</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#161B22] text-white">
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
        dialogClassName="rounded-xl overflow-hidden"
        contentClassName="bg-[#161B22] border border-gray-800"
        show={showModeratorModal}
        onHide={() => {
          setShowModeratorModal(false);
          setSelectedModerator("");
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/90 text-white border-gray-700">
          <Modal.Title>Assign Moderator</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#161B22] text-white">
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
        dialogClassName="rounded-xl overflow-hidden"
        contentClassName="bg-[#161B22] border border-gray-800"
        show={showTutorModal}
        onHide={() => {
          setShowTutorModal(false);
          setSelectedTutor("");
          setSelectedStudent(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/90 text-white border-gray-700">
          <Modal.Title>
            Assign Tutor — {selectedStudent?.name || "Student"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#161B22] text-white">
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

