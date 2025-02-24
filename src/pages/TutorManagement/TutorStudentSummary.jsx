import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import moment from 'moment';
import { RxCross1 } from "react-icons/rx";
import { addClassroomAssignmentBootcamp, getBootcampAssignment, getLearningPathUserProfile, getUserBootcampAnalyticsCourseWise, markCourseCompleted, setBootcampFinalProjectMark } from "../../api/student";
import Loader from "../../components/loader/loader";


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
    <div className="w-full max-w-6xl text-white m-4">
      <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold">
              {`${assignmentModule.locationState.userid.username} / ${assignmentModule.module.coursename} / Assignments`}
            </h1>
            <button
              
              className="cursor-p text-xl font-bold text-red-700"
              onClick={()=>setAssignmentState(false)}
            >
              <RxCross1/>
            </button>
      </div>
      <div className="text-right mb-2">Avg mark: {calculateAverage()}%</div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 bg-gray-800 p-2 font-bold text-white">
          <div>Assignment Name</div>
          <div>Final mark from Classroom</div>
        </div>

        {load ? <Loader/> : assignments.map((assignment, index) => (
          <div key={index} className="grid grid-cols-2 p-2 border-t border-gray-700 text-white">
            <div>{assignment.name}</div>
            <div>{assignment.mark}%</div>
          </div>
        ))}

        {showInputRow && (
          <div className="grid grid-cols-2 p-2 border-t border-gray-700 text-white">
            <input
              type="text"
              placeholder="Assignment name"
              value={newAssignment.name}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, name: e.target.value })
              }
              className="w-full bg-gray-600 text-white placeholder-gray-400 mr-2"
            />
            <input
              type="number"
              placeholder="%"
              value={newAssignment.mark}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, mark: e.target.value })
              }
              className="w-full bg-gray-600 text-white placeholder-gray-400"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end items-center gap-4 mt-4">
          <button
            onClick={addAssignment}
            className="p-1 bg-blue-500 text-white max-w-max"
          >
            Add Assignment Data
          </button>
          <button
            onClick={saveAssignment}
            disabled={!showInputRow}
            className={`p-1 text-white max-w-max ${showInputRow ? 'bg-green-700' : 'bg-gray-700'}`}
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

  // Handler to save final project mark
  const handleSaveProjectMark = async () => {
    try {
      const res = await setBootcampFinalProjectMark(bootcampId, userid, finalProjectMark);
      if(!res.success)
      throw "Marks didn't set"
    } catch (error) {
      setLoading(`${error?.message} || Error setting mark`);
    } finally {
      setIsEditingProjectMark(false);
    }
  };


  const calcAverage = (data) => {
    const reducedData = data.reduce((acc, summary) => {
      acc.mcq.total += summary.total.mcq
      acc.mcq.completed += summary.completed.mcq
      acc.challenge.total += summary.total.challenge
      acc.challenge.completed += summary.completed.challenge
      acc.assignment.total += summary.total.assignment
      acc.assignment.completed += summary.completed.assignment
      return acc
    }, { mcq: { total: 0, completed: 0}, challenge: {total: 0, completed: 0}, assignment: { total: 0, completed: 0}});
    const calculatedAverages = {
      mcq : Math.ceil((reducedData.mcq.completed/reducedData.mcq.total)*100),
      challenge : Math.ceil((reducedData.challenge.completed/reducedData.challenge.total)*100),
      assignment : Math.ceil((reducedData.assignment.completed/reducedData.assignment.total)*100)
    }
    setAverage(calculatedAverages)
  }



  const fetchUserSummary = async () => {
    try {
      setLoading(true);
      const res = await getUserBootcampAnalyticsCourseWise(bootcampId, userid);
      const platformData = await getLearningPathUserProfile(state?.learningpath, state?.userid?.email)
      const platformDict = platformData?.data?.learningpathcourses?.reduce((acc, mod)=> {
        acc[mod._id] = mod.completedPercentage
        return acc;
      }, {});
      if (res.data.length) {
        const userSummaryWithAvg = await Promise.all(
          res.data.map(async (module) => {
            const assignmentAvg = await fetchAssignmentAverage(userid, module.course._id);
            // Calculate module mark
            const moduleMark = calculateModuleMark({
              assignmentAvg: parseFloat(assignmentAvg) || 0,
              mcqCompleted: module.completed.mcq,
              mcqTotal: module.total.mcq,
              challengeCompleted: module.completed.challenge,
              challengeTotal: module.total.challenge,
            });

            return { ...module, assignmentAvg, moduleMark, platformProgress: platformDict[module.course._id] };
          })
        );

        const totalmodulemark = userSummaryWithAvg.reduce((acc, module)=> {
         return acc + parseFloat(module?.moduleMark || 0)
        },0);
        const totalmodulemarkAvg = totalmodulemark/userSummaryWithAvg.length;

        setModuleMarkAvg(Math.min(100, totalmodulemarkAvg.toFixed(2)));
        setUserSummary(userSummaryWithAvg);
        setFinalProjectMark(res.data[0].finalprojectmark);
        setCourseMark(Math.min(100, Math.ceil((0.65*parseFloat(totalmodulemarkAvg.toFixed(2) || 0) + 0.35* parseFloat(res.data[0].finalprojectmark || 0))).toFixed(2)))
      }
    } catch (error) {
      setLoading(`${error?.message} || Error getting list`);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateModuleMark = ({ assignmentAvg, mcqCompleted, mcqTotal, challengeCompleted, challengeTotal }) => {
    // Calculate percentages
    const mcqPercentage = mcqTotal > 0 ? (mcqCompleted / mcqTotal) * 100 : null;
    const challengePercentage = challengeTotal > 0 ? (challengeCompleted / challengeTotal) * 100 : null;
    const weightage = {
      '1':{
        weight: 1
      },
      '2':{
        weight: 0.5
      },
      '3':{
        weight: 0.4
      }
    }
    // Rules:
    const calcAttributes = []
    if(challengePercentage>0) calcAttributes.push(challengePercentage)
    if(assignmentAvg>0) calcAttributes.push(assignmentAvg)
    if(mcqPercentage>0) calcAttributes.push(mcqPercentage)

    let moduleMarkPercent = 0
    if(calcAttributes.length===1) moduleMarkPercent =  weightage['1'].weight*calcAttributes[0];
    else if(calcAttributes.length===2) moduleMarkPercent = weightage['2'].weight*(calcAttributes[0] + calcAttributes[1]);
    else if(calcAttributes.length===3) moduleMarkPercent = (weightage['3'].weight*(calcAttributes[0] + calcAttributes[1])) + (1- 2*weightage['3'].weight)*calcAttributes[2];
    return moduleMarkPercent.toFixed(2);
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
  
  useEffect(()=>{
    if(isFirstLoad.current){
      setLoading(true)
      isFirstLoad.current = false;
      fetchUserSummary()
      if(state)
      localStorage.setItem('summaryState', JSON.stringify(state))
    }
  },[state])

  return (
    <div className="min-h-screen bg-[#0A1F44] flex flex-col items-center p-6">
      {/* Top Navigation */}
      <div className="w-full max-w-6xl flex items-center">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/tutor/analytics/${bootcampId}`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Back</span>
        </button>
      </div>

      {/* Student Summary Card */}
       { !assignmentState ? <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-6xl mt-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Summary Page
        </h2>
        <p className="text-gray-700 font-semibold">{`Name: ${state?.userid?.username || JSON.parse(localStorage.getItem('summaryState') || {}).userid.username} `}</p>
        <p className="text-gray-700">{`Final Module Mark: ${modulemarkAvg}%`}</p>
        <p className="text-gray-700">
          Final Project Mark:{" "}
          {isEditingProjectMark ? (
            <span>
              <input
                type="number"
                min={0}
                max={100}
                value={finalProjectMark}
                onChange={(e) => setFinalProjectMark(e.target.value)}
                className="w-16 p-1 border border-gray-300 rounded"
              />
              <button
                onClick={handleSaveProjectMark}
                className="ml-2 p-1 rounded-md text-white text-sm bg-green-500 hover:bg-green-700"
              >
                Save
              </button>
            </span>
          ) : (
            <span>
              {finalProjectMark}%
              <button
                onClick={() => setIsEditingProjectMark(true)}
                className="ml-2 p-1 rounded-md text-white text-sm bg-indigo-500 hover:bg-blue-700"
              >
                Edit
              </button>
            </span>
          )}
        </p>
        {/* <p className="text-gray-700">{`Coding Challenges Avg: ${average.challenge}%`}</p> */}
        {/* <p className="text-gray-700">{`Assignments Avg: ${average.assignment}%`}</p> */}

        {/* Course Mark Label */}
        <h3 className="text-lg font-semibold text-gray-700 mt-4">{`Course Mark: ${courseMark}%`}</h3>

        {/* Table Container with Wider Width */}
        <div className="overflow-x-auto max-h-[450px] mt-2 rounded-lg border border-gray-300 w-full">
          <table className="w-full bg-white">
            <thead className="bg-gray-200">
              <tr className="text-gray-700">
                <th className="p-2 text-left border w-1/5">Module Name</th>
                <th className="p-2 text-left border w-1/6">MCQs</th>
                <th className="p-2 text-left border w-1/6">Coding Challenges</th>
                <th className="p-2 text-left border w-1/6">Assignments (GC)</th>
                <th className="p-2 text-left border w-1/6">Platform Progress</th>
                <th className="p-2 text-left border w-1/6">Module Mark</th>
                <th className="p-2 text-left border w-1/6">Expected Completion Date</th>
              </tr>
            </thead>
            <tbody>
            {loading ? (<tr>
                      <td colSpan="7" className="text-center p-4">
                        {(loading?.length>0) ? loading : 'fetching summary... may take a while'}
                      </td>
                    </tr>) : 
              (userSummary.map((module, index) => (
                <tr
                  key={index}
                  className="border-t hover:bg-gray-100 transition duration-200"
                >
                  <td className="p-2 border">{module.coursename}</td>
                  <td className="p-2 border">{module.completed.mcq + '/' + module.total.mcq} {`(${module.completed.mcq > 0 ? Math.ceil((module.completed.mcq/module.total.mcq)*100) : 0}%)`}</td>
                  <td className="p-2 border">{module.completed.challenge + '/' + module.total.challenge} {`(${module.completed.challenge > 0 ? Math.ceil((module.completed.challenge/module.total.challenge)*100) : 0}%)`}</td>
                  <td className="p-2 border">
                    {/* {module.completed.assignment + '/' + module.total.assignment} {`(${module.completed.assignment > 0 ? Math.ceil((module.completed.assignment/module.total.assignment)*100) : 0}%)`} */}
                    {`${module.assignmentAvg}%`}
                    <button className="ml-2 p-1 rounded-md text-white text-sm bg-indigo-500 hover:bg-blue-700" onClick={()=>handleClassroomAssignment(userid, module, state || JSON.parse(localStorage.getItem('summaryState') || {}))}>Edit</button>
                    </td>
                  <td className="p-2 border">{module.platformProgress}%</td>
                  <td className="p-2 border flex items-center space-x-2">
                    <span>{module.moduleMark}%</span>
                    <button className="px-3 py-1 text-xs bg-green-600 text-white rounded shadow-md hover:bg-green-700" onClick={()=>handleMarkCourseComplete(userid, module)}>
                      Mark as Complete
                    </button>
                  </td>
                  <td className="p-2 border">{(state?.bootcampEndDate || JSON.parse(localStorage.getItem('summaryState') || {}).bootcampEndDate) && moment(state?.bootcampEndDate || JSON.parse(localStorage.getItem('summaryState') || {}).bootcampEndDate).format('DD MMMM YYYY')}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div> : <Assignments setAssignmentState={setAssignmentState} assignmentModule={assignmentModule}/> }
    </div>
  );
};

export default StudentSummary;
