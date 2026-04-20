import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getOCModuleDetails } from "../../api/company";
import Loader from "../../components/loader/loader";
import { useUserStore } from "../../store/UserProvider";
import { FaPlay, FaFileAlt, FaBook, FaTools } from "react-icons/fa";
import QctoSubmissionSummary from "./QctoSubmissionSummary";
import styles from "./OCModuleDetails.module.css";

/** Resolve QCTOSA / PMT / Learner Workbook id for API + assessor links */
function getQctoTaskSpec(item) {
  if (!item || typeof item !== "object") return null;
  if (item.type === "qctosa" || item.isQCTOAssessment || item.qctosummativeid) {
    const id = item.qctosummativeid || item.id;
    return id ? { kind: "qctosa", id: String(id) } : null;
  }
  if (item.type === "qctopmt" || item.isQCTOPMT || item.qctopmtid) {
    const id = item.qctopmtid || item.id;
    return id ? { kind: "qctopmt", id: String(id) } : null;
  }
  if (item.type === "qctolw" || item.isQCTOLW || item.qctolwid) {
    const id = item.qctolwid || item.id;
    return id ? { kind: "qctolw", id: String(id) } : null;
  }
  return null;
}

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
  const isAssessor = user?.role === "ASSESSOR" || user?.role === "MODERATOR"; // Assessors see only tasks, not videos
  const canViewQctoSubmissionDetails =
    user?.role === "ASSESSOR" ||
    user?.role === "MODERATOR" ||
    user?.role === "TUTOR" ||
    user?.role === "SUPER_STUDENT_ADMIN";

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

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed":
        return styles.completed;
      case "In Progress":
        return styles.inProgress;
      case "Not Started":
        return styles.notStarted;
      default:
        return styles.notStarted;
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

  // Get lecture/assignment type icon and icon class for navy theme
  const getItemIcon = (item) => {
    if (!item || typeof item !== 'object') {
      return <FaFileAlt className={`${styles.itemIcon} ${styles.default}`} />;
    }
    if (item.type === "qctosa" || item.isQCTOAssessment || item.qctosummativeid) {
      return <FaFileAlt className={`${styles.itemIcon} ${styles.qctosa}`} />;
    }
    if (item.type === "qctolw" || item.isQCTOLW || item.qctolwid) {
      return <FaBook className={`${styles.itemIcon} ${styles.qctolw}`} />;
    }
    if (item.type === "qctopmt" || item.isQCTOPMT || item.qctopmtid) {
      return <FaTools className={`${styles.itemIcon} ${styles.qctopmt}`} />;
    }
    if (item.type === "lecture" || item.lecturename) {
      return <FaPlay className={`${styles.itemIcon} ${styles.lecture}`} />;
    }
    return <FaFileAlt className={`${styles.itemIcon} ${styles.default}`} />;
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
      const lectureIdParam = lecture.id ? `&lectureId=${encodeURIComponent(lecture.id)}` : '';
      const assessorUrl = `${baseUrl}/assessor/qcto-assessment/${lecture.qctosummativeid || lecture.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}${lectureIdParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Check if it's a QCTO PM - if so, open assessor view
    if (lecture.type === "qctopmt" || lecture.isQCTOPMT) {
      // Get the user token from localStorage to pass as auth
      const token = localStorage.getItem("TOKEN");
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const lectureIdParam = lecture.id ? `&lectureId=${encodeURIComponent(lecture.id)}` : '';
      const assessorUrl = `${baseUrl}/assessor/qcto-pmt/${lecture.qctopmtid || lecture.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}${lectureIdParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Check if it's a QCTO Learner Workbook - if so, open assessor view
    if (lecture.type === "qctolw" || lecture.isQCTOLW) {
      // Get the user token from localStorage to pass as auth
      const token = localStorage.getItem("TOKEN");
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const lectureIdParam = lecture.id ? `&lectureId=${encodeURIComponent(lecture.id)}` : '';
      const assessorUrl = `${baseUrl}/assessor/qctolw/${lecture.qctolwid || lecture.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}${lectureIdParam}`;
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
      const lectureIdParam = assignment.id ? `&lectureId=${encodeURIComponent(assignment.id)}` : '';
      const assessorUrl = `${baseUrl}/assessor/qcto-assessment/${assignment.qctosummativeid || assignment.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}${lectureIdParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Check if it's a QCTO PM
    if (assignment && typeof assignment === 'object' && (assignment.type === "qctopmt" || assignment.isQCTOPMT)) {
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const lectureIdParam = assignment.id ? `&lectureId=${encodeURIComponent(assignment.id)}` : '';
      const assessorUrl = `${baseUrl}/assessor/qcto-pmt/${assignment.qctopmtid || assignment.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}${lectureIdParam}`;
      window.open(assessorUrl, '_blank');
      return;
    }
    
    // Check if it's a QCTO Learner Workbook
    if (assignment && typeof assignment === 'object' && (assignment.type === "qctolw" || assignment.isQCTOLW)) {
      const readOnlyParam = isReadOnly ? '&readOnly=true' : '';
      const lectureIdParam = assignment.id ? `&lectureId=${encodeURIComponent(assignment.id)}` : '';
      const assessorUrl = `${baseUrl}/assessor/qctolw/${assignment.qctolwid || assignment.id}?studentId=${studentId}&token=${token || ''}${readOnlyParam}${lectureIdParam}`;
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
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Loader />
          <p>Loading module details…</p>
        </div>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className={styles.page}>
        <div className={styles.errorWrap}>
          <p className={styles.errorText}>Module not found</p>
          <button
            type="button"
            onClick={() => navigate("/oc-programs")}
            className={styles.backToPrograms}
          >
            ← Back to OC Programs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          onClick={() => window.close()}
          className={styles.backBtn}
        >
          ← Close Tab
        </button>
        <h1 className={styles.title}>{moduleData.name}</h1>
        <div className={styles.meta}>
          <span className={`${styles.statusBadge} ${getStatusClass(moduleData.status)}`}>
            {moduleData.status}
          </span>
          {studentData && (
            <span className={styles.studentName}>Student: {studentData.name}</span>
          )}
        </div>
      </div>

      {(() => {
        const unitsToShow = moduleData.units && moduleData.units.length > 0
          ? (isAssessor
              ? moduleData.units.filter((unit) => {
                  const hasQctoTasks = unit.lectures?.some((l) =>
                    l && typeof l === "object" && (l.type === "qctosa" || l.type === "qctolw" || l.type === "qctopmt"
                      || l.qctosummativeid || l.qctolwid || l.qctopmtid)
                  );
                  const hasAssignments = unit.assignments && unit.assignments.length > 0;
                  const hasQuizzes = unit.quizzes && unit.quizzes.length > 0;
                  return hasQctoTasks || hasAssignments || hasQuizzes;
                })
              : moduleData.units)
          : [];
        return unitsToShow.length > 0 ? (
        <div className={styles.unitList}>
          {unitsToShow.map((unit) => {
            const isExpanded = expandedUnits[unit.id] !== false;
            return (
              <div key={unit.id} className={styles.unitCard}>
                <button
                  type="button"
                  onClick={() => toggleUnit(unit.id)}
                  className={styles.unitHeader}
                >
                  <h2 className={styles.unitTitle}>{unit.name}</h2>
                  <svg
                    className={`${styles.chevron} ${isExpanded ? styles.expanded : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className={styles.unitBody}>
                    {(() => {
                      // For assessors: show only QCTO tasks (qctosa, qctolw, qctopmt), hide video lectures
                      const lecturesToShow = unit.lectures && unit.lectures.length > 0
                        ? (isAssessor
                            ? unit.lectures.filter((l) => {
                                if (!l || typeof l !== "object") return false;
                                return l.type === "qctosa" || l.type === "qctolw" || l.type === "qctopmt"
                                  || l.isQCTOAssessment || l.isQCTOLW || l.isQCTOPMT
                                  || l.qctosummativeid || l.qctolwid || l.qctopmtid;
                              })
                            : unit.lectures)
                        : [];
                      return lecturesToShow.length > 0 ? (
                      <>
                        <h3 className={styles.sectionTitle}>{isAssessor ? "Tasks" : "Lectures"}</h3>
                        <ul className={styles.itemList}>
                          {lecturesToShow.map((lecture, idx) => {
                            const isCompleted = isItemCompleted(lecture, "lecture");
                            const lectureName = getItemName(lecture);
                            const isClickable = lecture && typeof lecture === "object" && lecture.id;
                            const qctoSpec = getQctoTaskSpec(lecture);
                            const useQctoStack = qctoSpec && canViewQctoSubmissionDetails;
                            const row = (
                              <>
                                {getItemIcon(lecture)}
                                {isCompleted && (
                                  <svg className={styles.checkIcon} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <span className={styles.itemName}>{lectureName}</span>
                              </>
                            );
                            if (useQctoStack) {
                              return (
                                <li key={lecture.id || idx} className={styles.itemStack}>
                                  <div
                                    className={styles.itemRow}
                                    onClick={() => isClickable && handleLectureClick(lecture, unit)}
                                    onKeyDown={(e) =>
                                      isClickable &&
                                      (e.key === "Enter" || e.key === " ") &&
                                      handleLectureClick(lecture, unit)
                                    }
                                    role={isClickable ? "button" : null}
                                    tabIndex={isClickable ? 0 : undefined}
                                  >
                                    {row}
                                  </div>
                                  <QctoSubmissionSummary
                                    kind={qctoSpec.kind}
                                    resourceId={qctoSpec.id}
                                    studentId={studentId}
                                    onOpenFullView={() => handleLectureClick(lecture, unit)}
                                  />
                                </li>
                              );
                            }
                            return (
                              <li
                                key={lecture.id || idx}
                                className={styles.item}
                                onClick={() => isClickable && handleLectureClick(lecture, unit)}
                                onKeyDown={(e) => isClickable && (e.key === "Enter" || e.key === " ") && handleLectureClick(lecture, unit)}
                                role={isClickable ? "button" : null}
                                tabIndex={isClickable ? 0 : undefined}
                              >
                                {row}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                      ) : null;
                    })()}

                    {unit.assignments && unit.assignments.length > 0 && (
                      <>
                        <h3 className={styles.sectionTitle}>Assignments</h3>
                        <ul className={styles.itemList}>
                          {unit.assignments.map((assignment, idx) => {
                            const isCompleted = isItemCompleted(assignment, "assignment");
                            const assignmentName = getItemName(assignment);
                            const qctoSpec = getQctoTaskSpec(assignment);
                            const useQctoStack = qctoSpec && canViewQctoSubmissionDetails;
                            const row = (
                              <>
                                {getItemIcon(assignment)}
                                {isCompleted && (
                                  <svg className={styles.checkIcon} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                                <span className={styles.itemName}>{assignmentName}</span>
                              </>
                            );
                            if (useQctoStack) {
                              return (
                                <li key={assignment.id || idx} className={styles.itemStack}>
                                  <div
                                    className={styles.itemRow}
                                    onClick={() => handleAssignmentClick(assignment)}
                                    onKeyDown={(e) =>
                                      (e.key === "Enter" || e.key === " ") && handleAssignmentClick(assignment)
                                    }
                                    role="button"
                                    tabIndex={0}
                                  >
                                    {row}
                                  </div>
                                  <QctoSubmissionSummary
                                    kind={qctoSpec.kind}
                                    resourceId={qctoSpec.id}
                                    studentId={studentId}
                                    onOpenFullView={() => handleAssignmentClick(assignment)}
                                  />
                                </li>
                              );
                            }
                            return (
                              <li
                                key={assignment.id || idx}
                                className={styles.item}
                                onClick={() => handleAssignmentClick(assignment)}
                                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleAssignmentClick(assignment)}
                                role="button"
                                tabIndex={0}
                              >
                                {row}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}

                    {unit.quizzes && unit.quizzes.length > 0 && (
                      <>
                        <h3 className={styles.sectionTitle}>Quizzes</h3>
                        <ul className={styles.itemList}>
                          {unit.quizzes.map((quiz, idx) => {
                            const isCompleted = isItemCompleted(quiz, "quiz");
                            const quizName = getItemName(quiz);
                            return (
                              <li
                                key={quiz.id || idx}
                                className={styles.item}
                                onClick={() => handleQuizClick(quiz)}
                                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleQuizClick(quiz)}
                                role="button"
                                tabIndex={0}
                              >
                                {isCompleted ? (
                                  <svg className={styles.checkIcon} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <span className={styles.checkIcon} style={{ visibility: "hidden" }} aria-hidden>✓</span>
                                )}
                                <span className={styles.itemName}>{quizName}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        ) : (
        <div className={styles.emptyState}>
          <p>{isAssessor ? "No assessable tasks available for this module." : "No units available for this module."}</p>
        </div>
      );
      })()}
    </div>
  );
};

export default OCModuleDetails;

