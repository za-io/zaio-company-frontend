import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import MCQTable from "./StudentMCQ/table";
import Loader from "../components/loader/loader";
import { getUserCourseAnalytics } from "../api/student";
import AssignmentTable from "./StudentMCQ/AssignmentTable";

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

const StudentAssignments = () => {
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

      <AssignmentTable data={course?.assignment} loading={loading} type="Challenges" />

      {loading && <Loader />}
    </div>
  );
};

export default StudentAssignments;
