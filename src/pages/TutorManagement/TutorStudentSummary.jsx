import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import moment from 'moment';
import { RxCross1 } from "react-icons/rx";
import { addClassroomAssignmentBootcamp, getBootcampAssignment, getStudentGoogleClassroomAssignments, getUserBootcampAnalyticsCourseWise, markBootcampCompleted, markCourseCompleted, setBootcampFinalProjectMark } from "../../api/student";
import Loader from "../../components/loader/loader";
import "../../components/ActiveBootcamps/ActiveBootcampsTable.css";


function Assignments({setAssignmentState, assignmentModule}) {
  const [assignments, setAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState({ name: "", mark: "" });
  const [showInputRow, setShowInputRow] = useState(false);
  const [load,setLoad] = useState(false); 

  const addAssignment = () => setShowInputRow(true);


  const fetchCourseAssignment = async (userid, courseid) => {
    try {
      setLoad(true)
      const res = await getBootcampAssignment(userid, courseid);
      if(res.data && res.data.bootcampassignment){
        setAssignments(res.data.bootcampassignment)
      }
    } catch (error) {
      setLoad(false);
    } finally {
      setLoad(false)
    }
  }

  useEffect(()=>{
    if(assignmentModule?.userid && assignmentModule?.module?.course?._id)
    fetchCourseAssignment(assignmentModule?.userid, assignmentModule?.module?.course?._id)
  },[])

  const saveAssignment = async () => {
    if (newAssignment.name.length && newAssignment.mark) {
      const response = await addClassroomAssignmentBootcamp(newAssignment, assignmentModule?.userid, assignmentModule?.module?.course?._id);
      setAssignments([...assignments, newAssignment]);
      setNewAssignment({ name: "", mark: "" });
      setShowInputRow(false);
    }
  };

  const calculateAverage = () => {
    if (assignments.length === 0) return 0;
    const total = assignments.reduce((acc, curr) => acc + Number(curr.mark), 0);
    return (total / assignments.length).toFixed(2);
  };

  return (
    <div className="w-full max-w-3xl text-gray-100 p-4">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-lg font-bold text-white">
          {assignmentModule?.locationState?.userid?.username} / {assignmentModule?.module?.coursename} / Assignments
        </h1>
        <button
          type="button"
          className="p-2 rounded text-red-400 hover:bg-gray-700 transition"
          onClick={() => setAssignmentState(false)}
          aria-label="Close"
        >
          <RxCross1 className="w-5 h-5" />
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-3">Avg mark: {calculateAverage()}%</p>

      <div className="border border-gray-600 rounded-xl overflow-hidden bg-gray-900/40">
        <div className="grid grid-cols-2 bg-gray-700/80 px-4 py-3 text-sm font-medium text-white">
          <div>Assignment Name</div>
          <div>Final mark from Classroom</div>
        </div>
        {load ? (
          <div className="p-6 flex justify-center"><Loader /></div>
        ) : (
          assignments.map((assignment, index) => (
            <div key={index} className="grid grid-cols-2 px-4 py-3 border-t border-gray-700 text-gray-300">
              <div>{assignment.name}</div>
              <div>{assignment.mark}%</div>
            </div>
          ))
        )}
        {showInputRow && (
          <div className="grid grid-cols-2 gap-2 px-4 py-3 border-t border-gray-700">
            <input
              type="text"
              placeholder="Assignment name"
              value={newAssignment.name}
              onChange={(e) => setNewAssignment({ ...newAssignment, name: e.target.value })}
              className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="%"
              value={newAssignment.mark}
              onChange={(e) => setNewAssignment({ ...newAssignment, mark: e.target.value })}
              className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end items-center gap-3 mt-4">
        <button
          type="button"
          onClick={addAssignment}
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition text-sm"
        >
          Add Assignment Data
        </button>
        <button
          type="button"
          onClick={saveAssignment}
          disabled={!showInputRow}
          className={`px-4 py-2 rounded text-sm transition ${showInputRow ? "bg-green-700 hover:bg-green-600 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
        >
          Save
        </button>
      </div>
    </div>
  );
}


const StudentSummary = () => {
  const navigate = useNavigate();
  const studentState = useLocation();
  const { state } = studentState
  const [userSummary, setUserSummary] = useState([]);
  const [average, setAverage] = useState({mcq: 0, challenge: 0, assignment: 0});
  const { bootcampId, userid } = useParams();
  const [loading, setLoading] = useState(false);
  const [assignmentState, setAssignmentState] = useState(false);
  const [assignmentModule,setAssignmentModule] = useState(null)
  const isFirstLoad = useRef(true);
  const [isEditingProjectMark, setIsEditingProjectMark] = useState(false);
  const [finalProjectMark, setFinalProjectMark] = useState(0);
  const [modulemarkAvg, setModuleMarkAvg] = useState(0)
  const [courseMark, setCourseMark] = useState(0);
  const [allAssignments, setAllAssignments] = useState([]);
  const [showWorking, setShowWorking] = useState(false);

  // Handler to save final project mark
  const handleSaveProjectMark = async () => {
    try {
      const res = await setBootcampFinalProjectMark(bootcampId, userid, finalProjectMark);
      if(!res.success)
      throw "Marks didn't set";
      setCourseMark(Math.min(100, Math.round(modulemarkAvg * 0.6 + finalProjectMark * 0.4)));
    } catch (error) {
      setLoading(`${error?.message} || Error setting mark`);
    } finally {
      setIsEditingProjectMark(false);
    }
  };


  const calcAverage = (data) => {
    if (!data || data.length === 0) return;
    const reducedData = data.reduce((acc, summary) => {
      acc.mcq.total += summary.total.mcq;
      acc.mcq.marksTotal += summary.averageMarks?.mcq?.total ?? 0;
      acc.mcq.marksGot += summary.averageMarks?.mcq?.marks ?? 0;
      acc.challenge.total += summary.total.challenge;
      acc.challenge.marksTotal += summary.averageMarks?.challenge?.total ?? 0;
      acc.challenge.marksGot += summary.averageMarks?.challenge?.marks ?? 0;
      acc.assignment.total += summary.total.assignment;
      acc.assignment.completed += summary.completed.assignment;
      return acc;
    }, { mcq: { total: 0, marksTotal: 0, marksGot: 0 }, challenge: { total: 0, marksTotal: 0, marksGot: 0 }, assignment: { total: 0, completed: 0 } });
    const calculatedAverages = {
      mcq: reducedData.mcq.marksTotal > 0 ? Math.ceil((reducedData.mcq.marksGot / reducedData.mcq.marksTotal) * 100) : 0,
      challenge: reducedData.challenge.marksTotal > 0 ? Math.ceil((reducedData.challenge.marksGot / reducedData.challenge.marksTotal) * 100) : 0,
      assignment: reducedData.assignment.total > 0 ? Math.ceil((reducedData.assignment.completed / reducedData.assignment.total) * 100) : 0,
    };
    setAverage(calculatedAverages);
  };



  const fetchUserSummary = async () => {
    try {
      setLoading(true);
      const res = await getUserBootcampAnalyticsCourseWise(bootcampId, userid);
      if (res.data && res.data.length) {
        const userSummaryWithAvg = res.data.map((module) => {
          const assignmentAvg = module.assignmentAvg != null ? module.assignmentAvg : 0;
          const moduleMark = calculateModuleMark(module);
          return {
            ...module,
            assignmentAvg,
            moduleMark,
            platformProgress: module.platformProgress != null ? module.platformProgress : undefined,
          };
        });

        // Final Module Mark = (Avg of all module marks × 0.5) + (Avg mark of all Assignments × 0.5)
        const totalmodulemark = userSummaryWithAvg.reduce((acc, m) => acc + parseFloat(m?.moduleMark || 0), 0);
        const avgModuleMarks = totalmodulemark / userSummaryWithAvg.length;
        const avgAssignments = userSummaryWithAvg.length > 0
          ? userSummaryWithAvg.reduce((acc, m) => acc + parseFloat(m?.assignmentAvg || 0), 0) / userSummaryWithAvg.length
          : 0;
        const finalModuleMark = Math.min(100, parseFloat((avgModuleMarks * 0.5 + avgAssignments * 0.5).toFixed(2)));

        // Final Mark = Final Module Mark × 0.6 + Project mark × 0.4
        const projectMark = Number(res.data[0]?.finalprojectmark) || 0;
        const newFinalMark = Math.min(100, Math.round(finalModuleMark * 0.6 + projectMark * 0.4));

        // Fetch Google Classroom assignments for this bootcamp and use for calculation + display
        const bootcampIdStr = String(bootcampId ?? "");
        let flat = [];
        let gcAssignmentAvg = avgAssignments;
        try {
          const gcRes = await getStudentGoogleClassroomAssignments(userid);
          if (gcRes?.success && Array.isArray(gcRes.data)) {
            const normalizeId = (id) => (id == null ? "" : (id._id != null ? String(id._id) : String(id)));
            let forBootcamp = (gcRes.data || []).filter((d) => {
              const dId = normalizeId(d.bootcampId);
              return dId && bootcampIdStr && dId === bootcampIdStr;
            });
            if (forBootcamp.length === 0 && (gcRes.data || []).length > 0) {
              forBootcamp = gcRes.data || [];
            }
            forBootcamp.forEach((d) => {
              const courseName = d.googleClassroomCourseName || d.bootcampName || "Classroom";
              (d.assignments || []).forEach((a) => {
                flat.push({
                  courseName,
                  name: a.title || "—",
                  title: a.title,
                  dueDate: a.dueDate,
                  submittedAt: a.submittedAt,
                  graded: !!a.graded,
                  assignedGrade: a.assignedGrade,
                  draftGrade: a.draftGrade,
                  maxPoints: a.maxPoints,
                  courseWorkId: a.courseWorkId,
                  mark: a.graded && (a.assignedGrade != null || a.draftGrade != null)
                    ? (a.maxPoints != null && a.maxPoints > 0
                      ? Math.min(100, ((a.assignedGrade ?? a.draftGrade) / a.maxPoints) * 100)
                      : Number(a.assignedGrade ?? a.draftGrade))
                    : null,
                  source: "google_classroom",
                });
              });
            });
            if (flat.length > 0) {
              const sum = flat.reduce((acc, a) => acc + (a.mark != null && !Number.isNaN(Number(a.mark)) ? Number(a.mark) : 0), 0);
              gcAssignmentAvg = sum / flat.length;
            }
          }
        } catch (_) {}
        if (flat.length === 0) {
          const assignmentPromises = userSummaryWithAvg.map((m) =>
            m.course?._id
              ? getBootcampAssignment(userid, m.course._id).then((data) => {
                  const raw = Array.isArray(data) ? [] : (data?.bootcampassignment ?? data?.data?.bootcampassignment ?? []);
                  const list = (Array.isArray(raw) ? raw : [])
                    .filter((a) => a.source === "google_classroom")
                    .map((a) => ({ courseName: m.coursename, name: a.name, title: a.name, dueDate: null, submittedAt: null, graded: a.mark != null, assignedGrade: a.mark, draftGrade: null, maxPoints: null, mark: a.mark, source: a.source || "google_classroom" }));
                  return { list };
                })
              : Promise.resolve({ list: [] })
          );
          const assignmentResults = await Promise.all(assignmentPromises);
          flat = assignmentResults.flatMap((r) => r.list || []);
        }

        const finalModuleMarkWithGc = Math.min(100, parseFloat((avgModuleMarks * 0.5 + gcAssignmentAvg * 0.5).toFixed(2)));
        const newFinalMarkWithGc = Math.min(100, Math.round(finalModuleMarkWithGc * 0.6 + (Number(res.data[0]?.finalprojectmark) || 0) * 0.4));

        setModuleMarkAvg(finalModuleMarkWithGc);
        setUserSummary(userSummaryWithAvg);
        setFinalProjectMark(res.data[0].finalprojectmark);
        setCourseMark(newFinalMarkWithGc);
        setAllAssignments(flat);
      }
    } catch (error) {
      setLoading(`${error?.message} || Error getting list`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchUserSummary();
  }
  
  // MCQ % = actual marks (e.g. 79%), not completion (14/14). Same for challenges: use averageMarks.
  const getMcqPercent = (module) => {
    const t = module.averageMarks?.mcq?.total;
    if (!t || t === 0) return 0;
    return (module.averageMarks.mcq.marks / t) * 100;
  };
  const getChallengePercent = (module) => {
    const t = module.averageMarks?.challenge?.total;
    if (!t || t === 0) return 0;
    return (module.averageMarks.challenge.marks / t) * 100;
  };

  // Per-module: only MCQs = MCQ%; only Challenges = Challenge%; both = (MCQ % × 0.4) + (Challenge % × 0.6).
  // Uses marks-based percentages (bracket %), not completion ratio.
  const calculateModuleMark = (module) => {
    const hasMcq = (module.total?.mcq || 0) > 0;
    const hasChallenge = (module.total?.challenge || 0) > 0;
    const mcqPercentage = getMcqPercent(module);
    const challengePercentage = getChallengePercent(module);
    if (!hasMcq && !hasChallenge) return "0.00";
    if (hasMcq && !hasChallenge) return Math.min(100, mcqPercentage).toFixed(2);
    if (!hasMcq && hasChallenge) return Math.min(100, challengePercentage).toFixed(2);
    return (mcqPercentage * 0.4 + challengePercentage * 0.6).toFixed(2);
  };

  
  const fetchAssignmentAverage = async (userid, courseid) => {
    try {
      const res = await getBootcampAssignment(userid, courseid);
      if (res.data && res.data.bootcampassignment) {
        const assignments = res.data.bootcampassignment;
        const totalMarks = assignments.reduce((acc, curr) => acc + Number(curr.mark), 0);
        return assignments.length > 0 ? (totalMarks / assignments.length).toFixed(2) : 0;
      }
    } catch (error) {
      console.error(`Error fetching assignments for course ${courseid}:`, error);
    }
    return 0; // Return 0 if no assignments or an error occurs
  };

  const handleMarkCourseComplete = async (userid, module) => {
    try {
      setLoading('Marking Module')
      const res = await markCourseCompleted(bootcampId, userid, module.course._id);
      if(res.success){
        alert('Module marked as completed')
      }
    } catch (error) {
      setLoading(`${error?.message} || Unable to mark as completed`);
    } finally {
      setLoading(false)
    }
  }

  const handleClassroomAssignment = (userid, module, locationState) => {
    setAssignmentState(true)
    setAssignmentModule({
      userid, module, locationState
    })
  }

  const handlePassBootcamp = async () => {
    try {
      setLoading('Marking Bootcamp as Passed...')
      if(courseMark<65 && finalProjectMark<70){
        alert(`Cannot be passed as course mark and final project mark criteria violated`)
        return
      }
      const res = await markBootcampCompleted(bootcampId, userid);
      if(res.success){
        alert('Bootcamp marked as completed')
      }
    } catch (error) {
      setLoading(`${error?.message} || Unable to mark as completed`);
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(()=>{
    if(isFirstLoad.current){
      setLoading(true)
      isFirstLoad.current = false;
      fetchUserSummary()
      if(state)
      localStorage.setItem('summaryState', JSON.stringify(state))
    }
  },[state])

  const summaryStateResolved = state || (() => {
    try { return JSON.parse(localStorage.getItem("summaryState") || "{}"); } catch { return {}; }
  })();

  return (
    <div className="flex h-screen bg-gray-800 text-gray-100">
      {/* Sidebar - match TutorStudents */}
      <div className="w-1/6 min-w-[200px] bg-gray-900 p-4 flex flex-col">
        <h2 className="text-lg font-bold text-white">Tutor Platform</h2>
        <button
          type="button"
          onClick={() => navigate(`/tutor/analytics/${bootcampId}`)}
          className="block w-full text-left p-2 my-2 rounded bg-gray-700 text-gray-100 hover:bg-gray-600 transition"
        >
          ← Back to bootcamps
        </button>
        <span className="block w-full text-left p-2 my-2 rounded bg-gray-700 text-gray-100 mt-2">
          Student Summary
        </span>
        <button
          type="button"
          onClick={() => navigate(`/tutor/kpi/analytics/${bootcampId}`, { state: summaryStateResolved?.bootcampName })}
          className="block w-full text-left p-2 my-2 rounded text-gray-100 hover:bg-gray-700 transition"
        >
          My KPIs
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {assignmentState ? (
          <Assignments setAssignmentState={setAssignmentState} assignmentModule={assignmentModule} />
        ) : (
          <>
            {/* Top actions */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => navigate(`/tutor/analytics/${bootcampId}`)}
                className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition text-sm"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={!!loading}
                className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition text-sm disabled:opacity-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={handlePassBootcamp}
                className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-500 transition text-sm"
              >
                Pass Bootcamp
              </button>
            </div>

            {/* Summary card - dark theme */}
            <div className="border border-gray-600 rounded-xl bg-gray-900/40 p-4 max-w-7xl w-full mb-4">
              <h2 className="text-xl font-bold text-white mb-2">Summary Page</h2>
              <p className="text-gray-300 font-semibold">
                Name: {summaryStateResolved?.userid?.username ?? "—"}
              </p>
              <p className="text-gray-300">{`Final Module Mark: ${modulemarkAvg}%`}</p>
              <p className="text-gray-300">
                Final Project Mark:{" "}
                {isEditingProjectMark ? (
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={finalProjectMark}
                      onChange={(e) => setFinalProjectMark(Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSaveProjectMark}
                      className="px-2 py-1 rounded text-sm bg-green-600 text-white hover:bg-green-500"
                    >
                      Save
                    </button>
                  </span>
                ) : (
                  <span>
                    {finalProjectMark}%
                    <button
                      type="button"
                      onClick={() => setIsEditingProjectMark(true)}
                      className="ml-2 px-2 py-1 rounded text-sm bg-gray-600 text-white hover:bg-gray-500"
                    >
                      Edit
                    </button>
                  </span>
                )}
              </p>
              <h3 className="text-lg font-semibold text-white mt-4">
                Final Mark: {courseMark}% (Final Module Mark × 0.6 + Project × 0.4)
              </h3>
              <button
                type="button"
                onClick={() => setShowWorking((v) => !v)}
                className="mt-3 px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500 transition text-sm font-medium"
              >
                {showWorking ? "Hide working" : "Show working"}
              </button>
            </div>

            {/* Step-by-step working (student's actual marks) */}
            {showWorking && userSummary.length > 0 && (() => {
              const n = userSummary.length;
              const avgModuleMarks = userSummary.reduce((acc, m) => acc + parseFloat(m?.moduleMark || 0), 0) / n;
              const assignmentAvgUsed = allAssignments.length > 0
                ? allAssignments.reduce((acc, a) => acc + (a.mark != null && !Number.isNaN(Number(a.mark)) ? Number(a.mark) : 0), 0) / allAssignments.length
                : userSummary.reduce((acc, m) => acc + parseFloat(m?.assignmentAvg || 0), 0) / n;
              const finalModuleMark = Math.min(100, parseFloat((avgModuleMarks * 0.5 + assignmentAvgUsed * 0.5).toFixed(2)));
              const projectMark = Number(finalProjectMark) || 0;
              const finalMark = Math.min(100, Math.round(finalModuleMark * 0.6 + projectMark * 0.4));
              return (
                <div className="border border-gray-600 rounded-xl bg-gray-900/60 p-4 max-w-7xl w-full mb-4 text-gray-200 text-sm space-y-4">
                  <h3 className="text-lg font-semibold text-white">Step-by-step working</h3>
                  <div className="space-y-2">
                    <p className="font-medium text-gray-300">1. Per-module mark (MCQ% and Challenge%)</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                      {userSummary.map((module, i) => {
                        const mcqPct = getMcqPercent(module);
                        const chPct = getChallengePercent(module);
                        const hasMcq = module.total.mcq > 0;
                        const hasCh = module.total.challenge > 0;
                        let formula = "";
                        if (hasMcq && !hasCh) formula = `MCQ only → ${mcqPct.toFixed(1)}%`;
                        else if (!hasMcq && hasCh) formula = `Challenges only → ${chPct.toFixed(1)}%`;
                        else formula = `(${mcqPct.toFixed(1)}% × 0.4) + (${chPct.toFixed(1)}% × 0.6) = ${module.moduleMark}%`;
                        return (
                          <li key={i} className="text-gray-300">
                            <span className="font-medium text-gray-200">{module.coursename}:</span>{" "}
                            MCQ {module.completed.mcq}/{module.total.mcq} = {mcqPct.toFixed(1)}%, Challenges {module.completed.challenge}/{module.total.challenge} = {chPct.toFixed(1)}% → {formula}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-300">2. Average of module marks</p>
                    <p className="text-gray-400 font-mono">
                      ({userSummary.map((m) => `${m.moduleMark}`).join(" + ")}) ÷ {n} = {avgModuleMarks.toFixed(2)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-300">3. Assignments average (Google Classroom)</p>
                    <p className="text-gray-400">
                      {allAssignments.length > 0
                        ? `${allAssignments.length} assignment(s): average = ${assignmentAvgUsed.toFixed(2)}%`
                        : `Per-module assignment averages: ${assignmentAvgUsed.toFixed(2)}%`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-300">4. Final Module Mark</p>
                    <p className="text-gray-400 font-mono">
                      (Avg module marks × 0.5) + (Assignments avg × 0.5) = ({avgModuleMarks.toFixed(2)} × 0.5) + ({assignmentAvgUsed.toFixed(2)} × 0.5) = {finalModuleMark}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-300">5. Final Mark</p>
                    <p className="text-gray-400 font-mono">
                      (Final Module Mark × 0.6) + (Project × 0.4) = ({finalModuleMark} × 0.6) + ({projectMark} × 0.4) = {finalMark}%
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Table - SUPER_STUDENT_ADMIN (ActiveBootcamps) design */}
            <div className="max-w-7xl w-full">
              <h3 className="active-bootcamps-title mb-3">Module progress</h3>
              <div className="active-bootcamps-table-wrap overflow-x-auto">
                <table className="active-bootcamps-table">
                  <thead>
                    <tr>
                      <th>Module Name</th>
                      <th>MCQs</th>
                      <th>Coding Challenges</th>
                      <th>Platform Progress</th>
                      <th>Module Mark</th>
                      <th>Expected Completion Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="active-bootcamps-loading">
                          <Loader size={32} />
                          {typeof loading === "string" ? loading : "Fetching summary…"}
                        </td>
                      </tr>
                    ) : (
                      userSummary.map((module, index) => (
                        <tr key={index} className="active-bootcamps-row">
                          <td className="bootcamp-name">{module.coursename}</td>
                          <td>
                            {module.completed.mcq}/{module.total.mcq} ({module.averageMarks?.mcq?.total > 0 ? Math.ceil((module.averageMarks.mcq.marks / module.averageMarks.mcq.total) * 100) : 0}%)
                          </td>
                          <td>
                            {module.completed.challenge}/{module.total.challenge} ({module.averageMarks?.challenge?.total > 0 ? Math.ceil((module.averageMarks.challenge.marks / module.averageMarks.challenge.total) * 100) : 0}%)
                          </td>
                          <td>{module.platformProgress != null && module.platformProgress !== "" ? `${module.platformProgress}%` : "—"}</td>
                          <td>
                            {module.moduleMark}%
                            <button
                              type="button"
                              className="ml-2 px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-500 transition whitespace-nowrap"
                              onClick={() => handleMarkCourseComplete(userid, module)}
                            >
                              Mark as Complete
                            </button>
                          </td>
                          <td>
                            {summaryStateResolved?.bootcampEndDate
                              ? moment(summaryStateResolved.bootcampEndDate).format("DD MMMM YYYY")
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Google Classroom assignments section – always visible */}
            <div className="max-w-7xl w-full mt-6">
              <h3 className="active-bootcamps-title mb-3">Assignments (Google Classroom)</h3>
              {allAssignments.length > 0 ? (
                <div className="active-bootcamps-table-wrap overflow-x-auto">
                  <table className="active-bootcamps-table">
                    <thead>
                      <tr>
                        <th>Classroom</th>
                        <th>Assignment</th>
                        <th>Due date</th>
                        <th>Submitted date</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAssignments.map((a, idx) => {
                        const formatDate = (d) => (d ? moment(d).format("D MMM YYYY") : "—");
                        return (
                          <tr key={a.courseWorkId || idx} className="active-bootcamps-row">
                            <td>{a.courseName || "—"}</td>
                            <td>{a.title || a.name || "—"}</td>
                            <td>{formatDate(a.dueDate)}</td>
                            <td>{formatDate(a.submittedAt)}</td>
                            <td>
                              {a.graded && (a.assignedGrade != null || a.draftGrade != null) ? (
                                <span className="text-green-400">
                                  {a.assignedGrade != null ? a.assignedGrade : a.draftGrade}
                                  {a.maxPoints != null ? ` / ${a.maxPoints}` : ""}
                                </span>
                              ) : (
                                <span className="text-gray-500">Not graded</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-sm py-4">
                  No Google Classroom assignments for this bootcamp. If the student has linked a classroom, they can refresh assignments on their Google Classroom page.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentSummary;
