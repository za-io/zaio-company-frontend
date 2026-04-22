import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  getAllOCCohorts,
  getCohortStudents,
  getQCTOLearnerEnrollments,
  assignAssessor,
  assignModerator,
  getAllTutors,
  getAllAssessors,
  getAllModerators,
  assignTutorToStudent,
  createAccountsForEmails,
  addStudentsToOCCohort,
  createOrLinkAccountWithStudentNumber,
  getLiveClasses,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
  downloadPoeIdCopiesZip,
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
  /** Multi-select student user ids for bulk tutor assignment */
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkTutorAssign, setBulkTutorAssign] = useState(false);
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
  const [qctoEnrollments, setQctoEnrollments] = useState([]);
  const [qctoEnrollmentsLoading, setQctoEnrollmentsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [liveClasses, setLiveClasses] = useState([]);
  const [liveClassesLoading, setLiveClassesLoading] = useState(false);
  const [showLiveClassModal, setShowLiveClassModal] = useState(false);
  const [editingLiveClass, setEditingLiveClass] = useState(null);
  const [liveClassForm, setLiveClassForm] = useState({
    title: "",
    day: "Monday",
    time: "09:00",
    endTime: "10:00",
    link: "",
    thumbnail: "",
  });
  const [liveClassSubmitting, setLiveClassSubmitting] = useState(false);
  const [liveClassMessage, setLiveClassMessage] = useState(null);
  const [idCopyZipLoading, setIdCopyZipLoading] = useState(null);
  const DEFAULT_LIVE_CLASS_THUMBNAIL =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Crect fill='%23212a34' width='200' height='120'/%3E%3Ctext x='100' y='65' fill='%236b7280' font-size='14' text-anchor='middle' font-family='system-ui'%3ELive Class%3C/text%3E%3C/svg%3E";

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

  const handleCopyQctoToExcel = async () => {
    const headers = [
      "SDP Accreditation Number", "National ID", "LearnerAlternateID", "AlternateIDType",
      "LearnerLastName", "LearnerFirstName", "LearnerMiddleName", "LearnerTitle", "LearnerBirthDate",
      "EquityCode", "NationalityCode", "HomeLanguageCode", "GenderCode", "CitizenStatusCode",
      "SocioeconomicCode", "DisabilityCode", "DisabilityRating", "ImmigrantStatus",
      "HomeAddress1", "HomeAddress2", "HomeAddress3", "PostalAddress1", "PostalAddress2", "PostalAddress3",
      "LearnerHomeAddressPostalCode", "LearnerHomeAddressPhysicalCode",
      "LearnerPhoneNumber", "LearnerCellPhoneNumber", "LearnerFaxNumber", "LearnerEmailAddress",
      "ProvinceCode", "STATSSAAreaCode", "POPIActAgree", "POPIActDate",
      "SkillsProgramme ID", "EmploymentStatus", "LearnerEnrolledDate",
    ];
    const fmtDate = (v) => {
      if (!v) return "";
      const d = new Date(v);
      return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    };
    const rows = qctoEnrollments.map((enr) => [
      enr.sdpAccreditationNumber || "",
      enr.nationalId || "",
      enr.learnerAlternateId || "",
      enr.alternateIdType || "",
      enr.learnerLastName || "",
      enr.learnerFirstName || "",
      enr.learnerMiddleName || "",
      enr.learnerTitle || "",
      fmtDate(enr.learnerBirthDate),
      enr.equityCode || "",
      enr.nationalityCode || "",
      enr.homeLanguageCode || "",
      enr.genderCode || "",
      enr.citizenStatusCode || "",
      enr.socioeconomicCode || "",
      enr.disabilityCode || "",
      enr.disabilityRating || "",
      enr.immigrantStatus || "",
      enr.homeAddress1 || "",
      enr.homeAddress2 || "",
      enr.homeAddress3 || "",
      enr.postalAddress1 || "",
      enr.postalAddress2 || "",
      enr.postalAddress3 || "",
      enr.learnerHomeAddressPostalCode || "",
      enr.learnerHomeAddressPhysicalCode || "",
      enr.learnerPhoneNumber || "",
      enr.learnerCellPhoneNumber || "",
      enr.learnerFaxNumber || "",
      enr.learnerEmailAddress || "",
      enr.provinceCode || "",
      enr.statssaAreaCode || "",
      enr.popiActAgree ? "Yes" : "",
      fmtDate(enr.popiActDate),
      enr.skillsProgrammeId || "",
      enr.employmentStatus || "",
      fmtDate(enr.learnerEnrolledDate),
    ]);
    const tsv = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const getFilenameFromContentDisposition = (header) => {
    if (!header || typeof header !== "string") return null;
    const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8) {
      try {
        return decodeURIComponent(utf8[1].replace(/["']/g, "").trim());
      } catch {
        return null;
      }
    }
    const m = header.match(/filename="([^"]+)"/i) || header.match(/filename=([^;\s]+)/i);
    return m ? m[1].trim() : null;
  };

  const handleDownloadIdCopiesZip = async (program) => {
    if (!program?._id) return;
    setIdCopyZipLoading(program._id);
    try {
      const res = await downloadPoeIdCopiesZip(program._id);
      const blob = res.data;
      const ct = res.headers["content-type"] || "";
      if (ct.includes("application/json") || (blob && blob.type && blob.type.includes("application/json"))) {
        const text = await blob.text();
        const j = JSON.parse(text);
        alert(j.message || "Download failed.");
        return;
      }
      const fromHeader = getFilenameFromContentDisposition(res.headers["content-disposition"]);
      const safe = (program.cohortName || "cohort").replace(/[<>:"/\\|?*]/g, "").trim() || "cohort";
      const filename = fromHeader || `${safe}-id-copies.zip`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const j = JSON.parse(text);
          alert(j.message || "Download failed.");
        } catch {
          alert("Download failed.");
        }
      } else {
        alert(err?.response?.data?.message || err?.message || "Download failed.");
      }
    } finally {
      setIdCopyZipLoading(null);
    }
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

  const canAssignRoles = user?.role && ["SUPER_ADMIN", "COMPANY_ADMIN", "SUPER_STUDENT_ADMIN"].includes(user.role);

  const openModuleTrackerInNewTab = (view) => {
    if (!selectedProgram?._id) return;
    const url = `/oc-programs/${selectedProgram._id}/module-tracker?view=${view}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
        setStudents(response.data || []);
        setSelectedStudentIds([]);
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

  useEffect(() => {
    if (!showStudentsTable || !selectedProgram?._id) return;
    const fetchQctoEnrollments = async () => {
      setQctoEnrollmentsLoading(true);
      try {
        const res = await getQCTOLearnerEnrollments(selectedProgram._id);
        if (res?.success && Array.isArray(res.data)) {
          setQctoEnrollments(res.data);
        } else {
          setQctoEnrollments([]);
        }
      } catch {
        setQctoEnrollments([]);
      } finally {
        setQctoEnrollmentsLoading(false);
      }
    };
    fetchQctoEnrollments();
  }, [showStudentsTable, selectedProgram?._id]);

  useEffect(() => {
    if (!showStudentsTable || !selectedProgram?._id) return;
    const fetchLiveClasses = async () => {
      setLiveClassesLoading(true);
      try {
        const res = await getLiveClasses(selectedProgram._id);
        if (res?.status === 200 && res?.success && Array.isArray(res.data)) {
          setLiveClasses(res.data);
        } else {
          setLiveClasses([]);
        }
      } catch {
        setLiveClasses([]);
      } finally {
        setLiveClassesLoading(false);
      }
    };
    fetchLiveClasses();
  }, [showStudentsTable, selectedProgram?._id]);

  const handleViewStudentDetails = (student) => {
    navigate(`/oc-programs/student/${student.id}`, {
      state: { student, program: selectedProgram },
    });
  };

  const handleViewStudentProfile = (student) => {
    if (!student?.id) return;
    navigate(`/student-profile/${student.id}`);
  };

  const handleAssignTutor = (student) => {
    if (!canAssignRoles) return;
    if (!student.enrollmentId) {
      alert("Error: Student enrollment ID not found. Please refresh and try again.");
      return;
    }
    setBulkTutorAssign(false);
    setSelectedStudent(student);
    setSelectedTutor(student.tutor?.id || "");
    setShowTutorModal(true);
  };

  const handleOpenBulkAssignTutor = () => {
    if (!canAssignRoles) return;
    const picked = students.filter((s) => selectedStudentIds.includes(s.id));
    const missing = picked.filter((s) => !s.enrollmentId);
    if (missing.length > 0) {
      alert("Some selected students are missing enrollment data. Refresh and try again.");
      return;
    }
    if (picked.length === 0) return;
    setBulkTutorAssign(true);
    setSelectedStudent(null);
    setSelectedTutor("");
    setShowTutorModal(true);
  };

  const toggleStudentSelected = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleSelectAllStudents = () => {
    if (students.length === 0) return;
    setSelectedStudentIds((prev) =>
      prev.length === students.length ? [] : students.map((s) => s.id)
    );
  };

  const handleSaveTutor = async () => {
    if (!selectedTutor) return;

    if (bulkTutorAssign) {
      const picked = students.filter((s) => selectedStudentIds.includes(s.id));
      if (picked.length === 0) {
        alert("No students selected.");
        return;
      }
      setLoading(true);
      const failures = [];
      const tutorUpdates = new Map();
      try {
        for (const s of picked) {
          if (!s.enrollmentId) {
            failures.push(`${s.name || s.email}: missing enrollment`);
            continue;
          }
          try {
            const response = await assignTutorToStudent(s.enrollmentId, selectedTutor);
            if (response?.status === 200 && response?.success && response.data?.tutor) {
              tutorUpdates.set(s.id, response.data.tutor);
            } else {
              failures.push(`${s.name || s.email}: ${response?.message || "Request failed"}`);
            }
          } catch (err) {
            failures.push(`${s.name || s.email}: ${err?.message || "Request failed"}`);
          }
        }
        if (tutorUpdates.size > 0) {
          setStudents((prev) =>
            prev.map((st) =>
              tutorUpdates.has(st.id) ? { ...st, tutor: tutorUpdates.get(st.id) } : st
            )
          );
        }
        setShowTutorModal(false);
        setSelectedTutor("");
        setBulkTutorAssign(false);
        setSelectedStudentIds([]);
        if (failures.length > 0) {
          alert(
            `Assigned tutor to ${tutorUpdates.size} learner(s). Failed (${failures.length}):\n${failures.slice(0, 8).join("\n")}${failures.length > 8 ? "\n…" : ""}`
          );
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedStudent) return;

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
        setBulkTutorAssign(false);
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

  const handleOpenAddLiveClass = () => {
    setEditingLiveClass(null);
    setLiveClassForm({
      title: "",
      day: "Monday",
      time: "09:00",
      endTime: "10:00",
      link: "",
      thumbnail: "",
    });
    setLiveClassMessage(null);
    setShowLiveClassModal(true);
  };

  const handleOpenEditLiveClass = (lc) => {
    setEditingLiveClass(lc);
    setLiveClassForm({
      title: lc.title || "",
      day: lc.day || "Monday",
      time: lc.time || "09:00",
      endTime: lc.endTime || "10:00",
      link: lc.link || "",
      thumbnail: lc.thumbnail || "",
    });
    setLiveClassMessage(null);
    setShowLiveClassModal(true);
  };

  const handleSaveLiveClass = async () => {
    const { title, day, time, endTime, link, thumbnail } = liveClassForm;
    if (!title?.trim()) {
      setLiveClassMessage({ type: "error", text: "Title is required." });
      return;
    }
    if (!selectedProgram?._id) return;
    setLiveClassSubmitting(true);
    setLiveClassMessage(null);
    try {
      const payload = { title: title.trim(), day, time, endTime, link: link?.trim() || "", thumbnail: thumbnail?.trim() || "" };
      if (editingLiveClass) {
        const res = await updateLiveClass(selectedProgram._id, editingLiveClass._id, payload);
        if (res?.status === 200 && res?.success) {
          setLiveClasses((prev) =>
            prev.map((lc) => (lc._id === editingLiveClass._id ? res.data : lc))
          );
          setShowLiveClassModal(false);
          setEditingLiveClass(null);
        } else {
          setLiveClassMessage({ type: "error", text: res?.message || "Update failed." });
        }
      } else {
        const res = await createLiveClass(selectedProgram._id, payload);
        if (res?.status === 200 && res?.success) {
          setLiveClasses((prev) => [...prev, res.data]);
          setShowLiveClassModal(false);
        } else {
          setLiveClassMessage({ type: "error", text: res?.message || "Create failed." });
        }
      }
    } catch (err) {
      setLiveClassMessage({
        type: "error",
        text: err?.response?.data?.message || err?.message || "Something went wrong.",
      });
    } finally {
      setLiveClassSubmitting(false);
    }
  };

  const handleDeleteLiveClass = async (lc) => {
    if (!selectedProgram?._id || !window.confirm(`Delete live class "${lc.title}"?`)) return;
    try {
      const res = await deleteLiveClass(selectedProgram._id, lc._id);
      if (res?.status === 200 && res?.success) {
        setLiveClasses((prev) => prev.filter((x) => x._id !== lc._id));
      } else {
        alert(res?.message || "Delete failed.");
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Delete failed.");
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
    <div className="min-h-screen bg-[#0f1419] px-6 md:px-12 lg:px-24 xl:px-36 py-10">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-gray-100 mb-2 tracking-tight">OC Programs</h1>
        <p className="text-gray-500 text-[15px]">View and manage your Occupational Certificate cohorts and students</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader />
          <p className="text-gray-500 mt-4">Loading…</p>
        </div>
      ) : error ? (
        <div className="bg-[#1c2128] border border-gray-700/60 rounded-xl p-6 max-w-2xl">
          <p className="text-red-400/90 text-lg">{error}</p>
        </div>
      ) : showStudentsTable ? (
        <div className="bg-[#1c2128] rounded-2xl border border-gray-700/50 p-8 max-w-7xl shadow-xl shadow-black/10">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <h2 className="text-xl font-medium text-gray-100">
              Students — {selectedProgram?.cohortName}
            </h2>
            <div className="flex flex-wrap gap-2">
              {canAssignRoles && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAssignAssessor(selectedProgram);
                    }}
                    className="bg-purple-500/90 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
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
                    className="bg-indigo-500/90 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                  >
                    Assign Moderator
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddLiveClass}
                    className="inline-flex items-center gap-2 bg-emerald-500/90 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Live Class
                  </button>
                </>
              )}
              <button
                type="button"
                title="View POE documents (ID, CV, qualifications) for all learners in this cohort"
                onClick={() =>
                  selectedProgram?._id &&
                  navigate(`/oc-programs/${selectedProgram._id}/documents`)
                }
                className="inline-flex items-center gap-2 bg-cyan-600/90 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Learner POE documents
              </button>
              <button
                type="button"
                title="Download all learners’ certified ID copies from POE (one folder per learner)"
                disabled={idCopyZipLoading === selectedProgram?._id}
                onClick={() => handleDownloadIdCopiesZip(selectedProgram)}
                className="inline-flex items-center gap-2 bg-amber-500/90 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
              >
                {idCopyZipLoading === selectedProgram?._id ? (
                  <>Preparing zip…</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download ID copies (ZIP)
                  </>
                )}
              </button>
              <div className="inline-flex rounded-lg border border-gray-600/60 overflow-hidden">
                <button
                  type="button"
                  title="Open knowledge module tracker in a new tab"
                  onClick={() => openModuleTrackerInNewTab("km")}
                  className="px-4 py-2 text-sm font-medium transition-colors bg-gray-800/80 text-gray-200 hover:bg-indigo-600/85 hover:text-white"
                >
                  KM view
                </button>
                <button
                  type="button"
                  title="Open practical module tracker in a new tab"
                  onClick={() => openModuleTrackerInNewTab("pm")}
                  className="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-600/60 bg-gray-800/80 text-gray-200 hover:bg-indigo-600/85 hover:text-white"
                >
                  PM view
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStudentsTable(false);
                  setSelectedProgram(null);
                  setStudents([]);
                  setSelectedStudentIds([]);
                }}
                className="bg-gray-600/80 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
              >
                Back to Programs
              </button>
            </div>
          </div>

          {/* Live Classes - shown first for easy access */}
          <div className="mb-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h3 className="text-base font-medium text-gray-200">Live Classes</h3>
              {canAssignRoles && (
                <button
                  type="button"
                  onClick={handleOpenAddLiveClass}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/90 hover:bg-emerald-500 text-white transition-all duration-200 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Live Class
                </button>
              )}
            </div>
            {liveClassesLoading ? (
              <div className="flex items-center gap-2 text-gray-500 py-6">
                <Loader />
                <span>Loading live classes…</span>
              </div>
            ) : liveClasses.length === 0 ? (
              <p className="text-gray-500 py-6 text-[15px]">No live classes yet. Add one to get started.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {liveClasses.map((lc) => (
                  <div
                    key={lc._id}
                    className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600/60 hover:bg-gray-800/50 transition-all duration-200"
                  >
                    <div className="aspect-video bg-gray-800/60 relative">
                      <img
                        src={lc.thumbnail || DEFAULT_LIVE_CLASS_THUMBNAIL}
                        alt={lc.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = DEFAULT_LIVE_CLASS_THUMBNAIL;
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="font-medium text-gray-100 truncate" title={lc.title}>{lc.title}</h4>
                      <p className="text-sm text-gray-500 mt-1.5">
                        {lc.day} • {lc.time} – {lc.endTime}
                      </p>
                      {lc.link && (
                        <a
                          href={lc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400/90 hover:text-blue-400 truncate block mt-1.5"
                        >
                          {lc.link}
                        </a>
                      )}
                      {canAssignRoles && (
                        <div className="flex gap-2 mt-4">
                          <button
                            type="button"
                            onClick={() => handleOpenEditLiveClass(lc)}
                            className="text-xs bg-blue-500/80 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLiveClass(lc)}
                            className="text-xs bg-red-500/80 hover:bg-red-500 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canAssignRoles && students.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
              <span className="text-sm text-gray-400">
                {selectedStudentIds.length === 0
                  ? "Select learners to assign a tutor in bulk."
                  : `${selectedStudentIds.length} learner${selectedStudentIds.length === 1 ? "" : "s"} selected`}
              </span>
              <button
                type="button"
                onClick={toggleSelectAllStudents}
                className="text-sm text-indigo-400/95 hover:text-indigo-300 underline-offset-2 hover:underline"
              >
                {selectedStudentIds.length === students.length ? "Clear selection" : "Select all"}
              </button>
              <button
                type="button"
                disabled={selectedStudentIds.length === 0 || loading}
                onClick={handleOpenBulkAssignTutor}
                className="inline-flex items-center gap-2 bg-emerald-600/90 hover:bg-emerald-600 disabled:opacity-45 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Assign tutor to selected
              </button>
            </div>
          )}

          <div className="rounded-xl border border-gray-700/50 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800/40">
                  {canAssignRoles && (
                    <th className="px-3 py-4 w-12 text-left">
                      <input
                        type="checkbox"
                        className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500/40"
                        checked={students.length > 0 && selectedStudentIds.length === students.length}
                        onChange={toggleSelectAllStudents}
                        title="Select all learners"
                        aria-label="Select all learners"
                      />
                    </th>
                  )}
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID Number</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Start Date</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tutor</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-800/30 transition-colors duration-150">
                    {canAssignRoles && (
                      <td className="px-3 py-4 w-12 align-middle">
                        <input
                          type="checkbox"
                          className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500/40"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudentSelected(student.id)}
                          aria-label={`Select ${student.name || student.email}`}
                        />
                      </td>
                    )}
                    <td className="px-5 py-4 text-sm text-gray-300">{student.name}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{student.email}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{student.idNumber || "—"}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{formatDate(student.startDate)}</td>
                    <td className="px-5 py-4 text-sm">
                      {student.tutor ? (
                        <span className="text-emerald-400/90 font-medium">{student.tutor.name}</span>
                      ) : (
                        <span className="text-gray-500 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {canAssignRoles && (
                          <button
                            type="button"
                            className="bg-emerald-500/80 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
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
                          className="bg-indigo-500/80 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleViewStudentProfile(student);
                          }}
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          className="bg-blue-500/80 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
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

          {/* QCTO Learner Enrollments Table */}
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
              <h3 className="text-base font-medium text-gray-200">QCTO Learner Enrollment Data</h3>
              {qctoEnrollments.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyQctoToExcel}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/90 hover:bg-blue-500 text-white transition-all duration-200 cursor-pointer"
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8V6a2 2 0 00-2-2h-2m-4 0h-2" />
                      </svg>
                      Copy for Excel
                    </>
                  )}
                </button>
              )}
            </div>
            {qctoEnrollmentsLoading ? (
              <div className="flex items-center gap-2 text-gray-500 py-6">
                <Loader />
                <span>Loading QCTO learner enrollments…</span>
              </div>
            ) : qctoEnrollments.length === 0 ? (
              <p className="text-gray-500 py-6 text-[15px]">No QCTO learner enrollment data submitted yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-700/50">
                <table className="w-full border-collapse min-w-[1400px]">
                  <thead>
                    <tr className="bg-gray-800/40">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Student</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">SDP Accreditation Number</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">National ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerAlternateID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">AlternateIDType</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerLastName</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerFirstName</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerMiddleName</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerTitle</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerBirthDate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">EquityCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">NationalityCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">HomeLanguageCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">GenderCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">CitizenStatusCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">SocioeconomicCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">DisabilityCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">DisabilityRating</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">ImmigrantStatus</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">HomeAddress1</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">HomeAddress2</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">HomeAddress3</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">PostalAddress1</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">PostalAddress2</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">PostalAddress3</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerHomeAddressPostalCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerHomeAddressPhysicalCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerPhoneNumber</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerCellPhoneNumber</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerFaxNumber</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerEmailAddress</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">ProvinceCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">STATSSAAreaCode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">POPIActAgree</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">POPIActDate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">SkillsProgramme ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">EmploymentStatus</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">LearnerEnrolledDate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/40">
                    {qctoEnrollments.map((enr) => (
                      <tr key={enr._id} className="hover:bg-gray-800/30 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                          {enr.studentId?.name || enr.studentId?.email || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.sdpAccreditationNumber || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.nationalId || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerAlternateId || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.alternateIdType || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerLastName || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerFirstName || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerMiddleName || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerTitle || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerBirthDate ? formatDate(enr.learnerBirthDate) : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.equityCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.nationalityCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.homeLanguageCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.genderCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.citizenStatusCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.socioeconomicCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.disabilityCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.disabilityRating || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.immigrantStatus || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap max-w-[120px] truncate">{enr.homeAddress1 || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap max-w-[120px] truncate">{enr.homeAddress2 || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap max-w-[120px] truncate">{enr.homeAddress3 || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap max-w-[120px] truncate">{enr.postalAddress1 || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap max-w-[120px] truncate">{enr.postalAddress2 || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap max-w-[120px] truncate">{enr.postalAddress3 || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerHomeAddressPostalCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerHomeAddressPhysicalCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerPhoneNumber || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerCellPhoneNumber || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerFaxNumber || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap max-w-[140px] truncate">{enr.learnerEmailAddress || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.provinceCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.statssaAreaCode || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.popiActAgree ? "Yes" : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.popiActDate ? formatDate(enr.popiActDate) : "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.skillsProgrammeId || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.employmentStatus || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">{enr.learnerEnrolledDate ? formatDate(enr.learnerEnrolledDate) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : ocPrograms.length === 0 ? (
        <div className="bg-[#1c2128] rounded-2xl border border-gray-700/50 p-14 max-w-2xl text-center">
          <div className="w-14 h-14 rounded-xl bg-indigo-500/15 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-indigo-400/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-200 text-lg mb-1.5">No OC programs yet</p>
          <p className="text-gray-500 text-[15px]">Create your first OC cohort to get started.</p>
        </div>
      ) : (
        <div className="bg-[#1c2128] rounded-2xl border border-gray-700/50 p-8 max-w-7xl shadow-xl shadow-black/10">
          <h2 className="text-base font-medium text-gray-200 mb-6">All cohorts</h2>
          <div className="rounded-xl border border-gray-700/50 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800/40">
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cohort Name</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Learning Path</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Students</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date Created</th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {ocPrograms.map((program) => (
                  <tr key={program._id || program.id} className="hover:bg-gray-800/30 transition-colors duration-150">
                    <td className="px-5 py-4 text-sm font-medium text-gray-100">{program.cohortName || "N/A"}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{program.learningPathName || "N/A"}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{program.studentCount ?? 0}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">{formatDate(program.date || program.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {canAssignRoles && (
                          <>
                            <button
                              type="button"
                              className="bg-emerald-500/80 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
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
                              className="bg-teal-500/80 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
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
                          className="bg-blue-500/80 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleViewStudents(program);
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          title="View POE documents learners have uploaded (ID, CV, qualifications)"
                          className="bg-cyan-600/85 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/oc-programs/${program._id}/documents`);
                          }}
                        >
                          POE docs
                        </button>
                        <button
                          type="button"
                          title="Download all learners’ certified ID copies from POE (one folder per learner)"
                          disabled={idCopyZipLoading === program._id}
                          className="bg-amber-500/85 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDownloadIdCopiesZip(program);
                          }}
                        >
                          {idCopyZipLoading === program._id ? "…" : "ID copies (ZIP)"}
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
        contentClassName="bg-[#1c2128] border border-gray-700/50"
        show={showAddSingleStudentModal}
        onHide={() => {
          setShowAddSingleStudentModal(false);
          setAddSingleStudentEmail("");
          setAddSingleStudentNumber("");
          setAddSingleStudentMessage(null);
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/50 text-gray-100 border-gray-700/50">
          <Modal.Title>Add Single student — {selectedProgram?.cohortName || "Cohort"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#1c2128] text-gray-100">
          <p className="text-gray-400 text-sm mb-4">
            Enter email and student number. The student number will be linked to the account (or used as password for new accounts), then the student will be enrolled.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Email address</label>
            <input
              type="email"
              placeholder="student@example.com"
              value={addSingleStudentEmail}
              onChange={(e) => setAddSingleStudentEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Student number</label>
            <input
              type="text"
              placeholder="STU12345"
              value={addSingleStudentNumber}
              onChange={(e) => setAddSingleStudentNumber(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
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
              className="bg-gray-600/80 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={addSingleStudentSubmitting}
              onClick={handleAddSingleStudentSubmit}
              className="bg-teal-500/90 hover:bg-teal-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addSingleStudentSubmitting ? "Enrolling…" : "Add Single student"}
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Add/Edit Live Class modal */}
      <Modal
        centered
        dialogClassName="rounded-xl overflow-hidden"
        contentClassName="bg-[#1c2128] border border-gray-700/50"
        show={showLiveClassModal}
        onHide={() => {
          setShowLiveClassModal(false);
          setEditingLiveClass(null);
          setLiveClassMessage(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/50 text-gray-100 border-gray-700/50">
          <Modal.Title>{editingLiveClass ? "Edit Live Class" : "Add Live Class"} — {selectedProgram?.cohortName || "Cohort"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#1c2128] text-gray-100">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
              <input
                type="text"
                placeholder="e.g. Introduction to Cyber Security"
                value={liveClassForm.title}
                onChange={(e) => setLiveClassForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Day</label>
              <select
                value={liveClassForm.day}
                onChange={(e) => setLiveClassForm((f) => ({ ...f, day: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Start Time</label>
                <input
                  type="time"
                  value={liveClassForm.time}
                  onChange={(e) => setLiveClassForm((f) => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">End Time</label>
                <input
                  type="time"
                  value={liveClassForm.endTime}
                  onChange={(e) => setLiveClassForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Link (optional)</label>
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={liveClassForm.link}
                onChange={(e) => setLiveClassForm((f) => ({ ...f, link: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Thumbnail URL (optional)</label>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={liveClassForm.thumbnail}
                onChange={(e) => setLiveClassForm((f) => ({ ...f, thumbnail: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty to use default thumbnail</p>
            </div>
          </div>
          {liveClassMessage && (
            <p className={`text-sm mt-4 ${liveClassMessage.type === "error" ? "text-red-400" : "text-green-400"}`}>
              {liveClassMessage.text}
            </p>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowLiveClassModal(false);
                setEditingLiveClass(null);
                setLiveClassMessage(null);
              }}
              className="bg-gray-600/80 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={liveClassSubmitting}
              onClick={handleSaveLiveClass}
              className="bg-emerald-500/90 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {liveClassSubmitting ? "Saving…" : editingLiveClass ? "Update" : "Add Live Class"}
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Add students modal */}
      <Modal
        centered
        dialogClassName="rounded-xl overflow-hidden"
        contentClassName="bg-[#1c2128] border border-gray-700/50"
        show={showAddStudentsModal}
        onHide={() => {
          setShowAddStudentsModal(false);
          setAddStudentsEmails("");
          setAddStudentsMessage(null);
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/50 text-gray-100 border-gray-700/50">
          <Modal.Title>Add students — {selectedProgram?.cohortName || "Cohort"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#1c2128] text-gray-100">
          <p className="text-gray-400 text-sm mb-4">
            Enter comma-separated emails. Students will be enrolled in this OC program using the cohort&apos;s learning path and config.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Student emails</label>
            <textarea
              placeholder="student1@example.com, student2@example.com"
              value={addStudentsEmails}
              onChange={(e) => setAddStudentsEmails(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-gray-500"
            />
          </div>
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="add-students-create-accounts"
              checked={addStudentsCreateAccounts}
              onChange={(e) => setAddStudentsCreateAccounts(e.target.checked)}
              className="rounded border-gray-600/60 bg-gray-800/60 text-blue-400 focus:ring-blue-500/50"
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
              className="bg-gray-600/80 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={addStudentsSubmitting}
              onClick={handleAddStudentsSubmit}
              className="bg-emerald-500/90 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        contentClassName="bg-[#1c2128] border border-gray-700/50"
        show={showAssessorModal}
        onHide={() => {
          setShowAssessorModal(false);
          setSelectedAssessor("");
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/50 text-gray-100 border-gray-700/50">
          <Modal.Title>Assign Assessor</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#1c2128] text-gray-100">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Assessor
            </label>
            <select
              value={selectedAssessor}
              onChange={(e) => setSelectedAssessor(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-gray-500"
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
        contentClassName="bg-[#1c2128] border border-gray-700/50"
        show={showModeratorModal}
        onHide={() => {
          setShowModeratorModal(false);
          setSelectedModerator("");
          setSelectedProgram(null);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/50 text-gray-100 border-gray-700/50">
          <Modal.Title>Assign Moderator</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#1c2128] text-gray-100">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Moderator
            </label>
            <select
              value={selectedModerator}
              onChange={(e) => setSelectedModerator(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-gray-500"
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
        contentClassName="bg-[#1c2128] border border-gray-700/50"
        show={showTutorModal}
        onHide={() => {
          setShowTutorModal(false);
          setSelectedTutor("");
          setSelectedStudent(null);
          setBulkTutorAssign(false);
        }}
      >
        <Modal.Header closeButton className="bg-gray-800/50 text-gray-100 border-gray-700/50">
          <Modal.Title>
            {bulkTutorAssign
              ? `Assign Tutor — ${selectedStudentIds.length} learner${selectedStudentIds.length === 1 ? "" : "s"}`
              : `Assign Tutor — ${selectedStudent?.name || "Student"}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-[#1c2128] text-gray-100">
          {bulkTutorAssign && (
            <div className="mb-4 max-h-40 overflow-y-auto rounded-lg border border-gray-700/50 bg-gray-900/40 p-3">
              <p className="text-xs text-gray-500 mb-2">Learners to update</p>
              <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                {students
                  .filter((s) => selectedStudentIds.includes(s.id))
                  .map((s) => (
                    <li key={s.id}>
                      {s.name}{" "}
                      <span className="text-gray-500">({s.email})</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Tutor
            </label>
            <select
              value={selectedTutor}
              onChange={(e) => setSelectedTutor(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-gray-600/60 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-gray-500"
            >
              <option value="">-- Select Tutor --</option>
              {tutors.map((tutor) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.name}
                </option>
              ))}
            </select>
          </div>
          {!bulkTutorAssign && selectedStudent?.tutor && (
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
                setBulkTutorAssign(false);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTutor}
              disabled={!selectedTutor || (bulkTutorAssign && selectedStudentIds.length === 0)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {bulkTutorAssign
                ? `Assign to ${selectedStudentIds.length} learner${selectedStudentIds.length === 1 ? "" : "s"}`
                : selectedStudent?.tutor
                  ? "Update Tutor"
                  : "Assign Tutor"}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ViewOCPrograms;

