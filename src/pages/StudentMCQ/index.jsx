import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  getUserCourseAnalytics,
} from "../../api/student";
import Loader from "../../components/loader/loader";
import MCQTable from "./table";


const StudentMCQ = () => {
  const { courseid, userid } = useParams();
  const location = useLocation();
  const receivedData = location.state?.course;

  const [loading, setLoading] = useState(false);
  const [courseId] = useState(courseid);
  const [course, setCourse] = useState(receivedData);
  const [userId] = useState(userid ? userid : "636d6613a75d3600222f1875");

  const getAnalytics = () => {
    setLoading(true);
    getUserCourseAnalytics(userId, courseId)
      .then((res) => {
        setCourse(res);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    getAnalytics();
    // eslint-disable-next-line 
  }, []);
  return (
    <div className="px-36 py-12">
      <h1 className="text-l font-bold text-gray-100">
        Course Name : {course?.course?.courseName}
      </h1>

      <MCQTable userId={userId} data={course?.submissions?.mcq} loading={loading} type="MCQ" />

      {loading && <Loader />}
    </div>
  );
};

export default StudentMCQ;