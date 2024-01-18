import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getBootcampDetails } from "../../api/company";
import {
  getAllBootcamps,
  getAllCourses,
  getAllLearningpaths,
  getUserBootcampAnalytics,
  getUserCourseAnalytics,
  getUserLearningpathAnalytics,
} from "../../api/student";
import Loader from "../../components/loader/loader";
import BootcampTable from "../StudentBootcamp/table";
import LearningpathTable from "../StudentLearningPath/table";
import CourseTable from "../StudentCourse/table";
import MCQTable from "./table";

const StylesConfig = {
  completed: {
    styles: "bg-green-500 text-white",
    color: "white",
  },
  late: {
    styles: "bg-yellow-500 text-white",
    color: "white",
  },
  pending: {
    styles: "bg-red-500 text-white",
    color: "white",
  },
  blocked: {
    styles: "bg-gray-500 text-white",
    color: "white",
  },
  advanced: {
    styles: "bg-blue-500 text-white",
    color: "white",
  },
};

const StudentMCQ = () => {
  const { courseid, userid } = useParams();
  const location = useLocation();
  const receivedData = location.state?.course;

  const [loading, setLoading] = useState(false);
  const [courseId, setCourseId] = useState(courseid);
  const [course, setCourse] = useState(receivedData);
  const [userId, setUserId] = useState(userid ? userid : "636d6613a75d3600222f1875");

  const getAnalytics = () => {
    setLoading(true);
    getUserCourseAnalytics(userId, courseId)
      .then((res) => {
        setCourse(res.submissions);
        console.log("res,course", res.submissions);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    getAnalytics();
  }, []);
  return (
    <div className="px-36 py-12">
      {/* <h1 className="text-4xl font-bold text-gray-100">
        Program: {bootcamp?.bootcampName}
      </h1> */}

      <MCQTable userId={userId} data={course?.mcq} loading={loading} type="MCQ" />

      {loading && <Loader />}
    </div>
  );
};

export default StudentMCQ;
