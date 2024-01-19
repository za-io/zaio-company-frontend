import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import MCQTable from "./StudentMCQ/table";
import Loader from "../components/loader/loader";
import { getUserCourseAnalytics } from "../api/student";


const StudentChallenges = () => {
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

      <MCQTable userId={userId} data={course?.submissions?.challenge} loading={loading} type="Challenges" />

      {loading && <Loader />}
    </div>
  );
};

export default StudentChallenges;
