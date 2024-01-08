import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import AnalyticsTable from "./table";

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

const StudentAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("bootcamp");
  const [bootcampId, setBootcampId] = useState("642b6236fa796e00203ffe0b");
  const [learningpathId, setLearningpathId] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [userId, setUserId] = useState("636d6613a75d3600222f1875");
  const [allBootcamps, setAllBootcamps] = useState([]);
  const [allLearningpaths, setAllLearningpaths] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [bootcamp, setBootcamp] = useState(null);
  const [learningpath, setLearningpath] = useState(null);
  const [course, setCourse] = useState(null);

  const handleBootcampChange = (event) => {
    setBootcampId(event.target.value);
    setSearchType("bootcamp");
  };

  const handleLearningpathChange = (event) => {
    setLearningpathId(event.target.value);
    setSearchType("learningpath");
  };

  const handleCourseChange = (event) => {
    setCourseId(event.target.value);
    setSearchType("course");
  };

  const getBootcamps = () => {
    // setLoading(true);
    getAllBootcamps()
      .then((res) => {
        setAllBootcamps(res?.bootcamps);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getLearningpaths = () => {
    // setLoading(true);
    getAllLearningpaths()
      .then((res) => {
        setAllLearningpaths(res?.learningpaths);
        console.log("learningpaths", res.learningpaths);
      })
      .finally(() => {
        setLoading(false);
      });
  };
  const getCourses = () => {
    // setLoading(true);
    getAllCourses()
      .then((res) => {
        setAllCourses(res?.courses);
        console.log("sasa", res.courses);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const getAnalytics = () => {
    setLoading(true);
    setBootcamp(null);
    setLearningpath(null);
    setCourse(null);
    console.log(searchType);

    if (searchType == "bootcamp") {
      getUserBootcampAnalytics(userId, bootcampId)
        .then((res) => {
          setBootcamp(res);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (searchType == "learningpath") {
      getUserLearningpathAnalytics(userId, learningpathId)
        .then((res) => {
          console.log("learningpathcouruoeuzoudsouasdou", res);
          setLearningpath(res);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (searchType == "course") {
      getUserCourseAnalytics(userId, courseId)
        .then((res) => {
          console.log("coursejhsjdbshjghjsbjsxz", res);
          setCourse(res);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    getBootcamps();
    getLearningpaths();
    getCourses();
  }, []);
  return (
    <div className="px-36 py-12">
      <div>
        <select
          value={bootcampId}
          onChange={handleBootcampChange}
          className={`py-2 rounded
            ${searchType == "bootcamp" ? "bg-red-700 text-gray-100" : null}
          `}
          style={{ marginRight: "20px" }}
        >
          {allBootcamps.map((ab) => {
            return <option value={ab._id}>{ab.bootcampName}</option>;
          })}
        </select>
        <select
          defaultValue="Select learningpath"
          value={learningpathId}
          onChange={handleLearningpathChange}
          className={`py-2 rounded
            ${
              searchType == "learningpath" ? "bg-red-700 text-gray-100" : null
            }`}
          style={{ marginRight: "20px" }}
        >
          {allLearningpaths.map((ab) => {
            return <option value={ab._id}>{ab.learningpathname}</option>;
          })}
        </select>
        <select
          defaultValue="Select course"
          value={courseId}
          onChange={handleCourseChange}
          className={`py-2 rounded
            ${searchType == "course" ? "bg-red-700 text-gray-100" : null}`}
        >
          {allCourses.map((ab) => {
            return <option value={ab._id}>{ab.coursename.trim()}</option>;
          })}
        </select>
        <button
          onClick={getAnalytics}
          className="bg-blue-200 py-2 px-5 my-2 rounded font-small"
        >
          Get Details
        </button>
      </div>

      {/* <h1 className="text-4xl font-bold text-gray-100">
        Program: {bootcamp?.bootcampName}
      </h1> */}
      {searchType == "bootcamp" && (
        <AnalyticsTable
          data={bootcamp?.bootcamp}
          total={bootcamp?.total}
          loading={loading}
          searchType="bootcamp"
        />
      )}
      {searchType == "learningpath" && (
        <AnalyticsTable
          data={learningpath?.learningpath}
          total={learningpath?.total}
          loading={loading}
          searchType="learningpath"
        />
      )}
      {searchType == "course" && (
        <AnalyticsTable
          data={course?.course}
          total={course?.total}
          loading={loading}
          searchType="course"
        />
      )}
      {loading && <Loader />}
    </div>
  );
};

export default StudentAnalytics;
