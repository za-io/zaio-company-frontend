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

const StudentLearningPath = () => {
  const { learningpathid, bootcampid } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const user_id = queryParams.get("user_id");

  console.log("location", user_id);
  const [loading, setLoading] = useState(false);
  const [learningpathId, setLearningpathId] = useState(learningpathid);
  const [courseId, setCourseId] = useState(null);
  const [userId, setUserId] = useState("636d6613a75d3600222f1875");
  const [learningpath, setLearningpath] = useState(null);

  const getAnalytics = () => {
    setLoading(true);
    getUserLearningpathAnalytics(userId, learningpathId)
      .then((res) => {
        console.log("learningpathcouruoeuzoudsouasdou", res);
        setLearningpath(res);
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

      <LearningpathTable
        data={learningpath?.courses}
        total={learningpath?.total}
        loading={loading}
      />

      {loading && <Loader />}
    </div>
  );
};

export default StudentLearningPath;
