import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import moment from 'moment';
import { getUserBootcampAnalyticsCourseWise, markCourseCompleted } from "../../api/student";

const StudentSummary = () => {
  const navigate = useNavigate();
  const studentState = useLocation();
  const { state } = studentState
  const [userSummary, setUserSummary] = useState([]);
  const [average, setAverage] = useState({mcq: 0, challenge: 0, assignment: 0});
  const { bootcampId, userid } = useParams();
  const [loading, setLoading] = useState(false);
  const isFirstLoad = useRef(true);

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
      const res = await getUserBootcampAnalyticsCourseWise(bootcampId, userid);
      if(res.data.length){
        calcAverage(res.data);
        setUserSummary(res.data)
      }
    } catch (error) {
      setLoading(`${error?.message} || Error getting list`);
    } finally {
      setLoading(false)
    }
  }

  const handleMarkCourseComplete = async (userid, module) => {
    try {
      setLoading('Marking Module')
      const res = await markCourseCompleted(userid, module.course._id);
      if(res.success){
        alert('Module marked as completed')
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
    }
  },[state])

  return (
    <div className="min-h-screen bg-[#0A1F44] flex flex-col items-center p-6">
      {/* Top Navigation */}
      <div className="w-full max-w-6xl flex items-center">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>←</span>
          <span>Back</span>
        </button>
      </div>

      {/* Student Summary Card */}
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-6xl mt-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Summary Page
        </h2>
        <p className="text-gray-700 font-semibold">{`Name: ${state?.userid?.username}`}</p>
        <p className="text-gray-700">{`MCQs Avg: ${average.mcq}%`}</p>
        <p className="text-gray-700">{`Coding Challenges Avg: ${average.challenge}%`}</p>
        <p className="text-gray-700">{`Assignments Avg: ${average.assignment}%`}</p>

        {/* Course Mark Label */}
        <h3 className="text-lg font-semibold text-gray-700 mt-4">{`Course Mark: ${0}`}</h3>

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
                  <td className="p-2 border">{module.completed.assignment + '/' + module.total.assignment} {`(${module.completed.assignment > 0 ? Math.ceil((module.completed.assignment/module.total.assignment)*100) : 0}%)`}</td>
                  <td className="p-2 border">0</td>
                  <td className="p-2 border flex items-center space-x-2">
                    <span>00</span>
                    <button className="px-3 py-1 text-xs bg-green-600 text-white rounded shadow-md hover:bg-green-700" onClick={()=>handleMarkCourseComplete(userid, module)}>
                      Mark as Complete
                    </button>
                  </td>
                  <td className="p-2 border">{state?.bootcampEndDate && moment(state?.bootcampEndDate).format('DD MMMM YYYY')}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentSummary;
