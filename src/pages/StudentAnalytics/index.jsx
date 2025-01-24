import React, { useEffect, useState } from "react";
import {
  getAllBootcamps,
  getAllCourses,
  getAllLearningpaths,
  getCourseEnrolledUser,
  getLearningpathEnrolledUser,
  getUserBootcampAnalytics,
} from "../../api/student";
import Loader from "../../components/loader/loader";
import AnalyticsTable from "./table";
import { useSearchParams } from "react-router-dom";
import LPAnalyticsTable from "./learningpath.index";
import CourseAnalyticsTable from "./course.index";
import { useUserStore } from "../../store/UserProvider";

const calcSearchType = (bootcampid, learningpathid, courseid) => {
  if (bootcampid) {
    return "bootcamp";
  } else if (learningpathid) {
    return "learningpath";
  } else if (courseid) {
    return "course";
  } else {
    return null;
  }
};

const StudentAnalytics = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const bootcampid = searchParams.get("bootcamp");
  const learningpathid = searchParams.get("learningpath");
  const courseid = searchParams.get("course");

  const [loading, setLoading] = useState(false);
  const [bootcampId, setBootcampId] = useState(bootcampid ? bootcampid : null);
  const [learningpathId, setLearningpathId] = useState(
    learningpathid ? learningpathid : null
  );
  const [courseId, setCourseId] = useState(courseid ? courseid : null);
  const [userId] = useState("636d6613a75d3600222f1875");
  const [searchType, setSearchType] = useState(
    calcSearchType(bootcampid, learningpathid, courseid)
  );
  const [allBootcamps, setAllBootcamps] = useState([]);
  const [allLearningpaths, setAllLearningpaths] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [bootcamp, setBootcamp] = useState(null);
  const [learningpath, setLearningpath] = useState(null);
  const [course, setCourse] = useState(null);
  const { user } = useUserStore();

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

  const fetchDropdownData = async () => {
    setLoading("Please wait fetching all Bootcamps");
    const bootcamps = await getAllBootcamps();

    setLoading("Please wait fetching all learningpaths");
    const learningpaths = await getAllLearningpaths();

    setLoading("Please wait fetching all courses");
    const courses = await getAllCourses();

    setAllBootcamps(bootcamps?.bootcamps);
    setAllLearningpaths(learningpaths?.learningpaths);
    setAllCourses(courses?.courses);

    if (searchType) {
      getAnalytics();
    } else {
      setLoading(false);
    }
  };

  const setParams = (key, value, deleteArr) => {
    searchParams.set(key, value);

    deleteArr?.forEach((key) => {
      searchParams.delete(key);
    });

    setSearchParams(searchParams);
  };

  const getAnalytics = () => {
    setLoading(true);
    setBootcamp(null);
    setLearningpath(null);
    setCourse(null);
    console.log(searchType);

    if (searchType === "bootcamp") {
      setLoading("Please wait fetching bootcamp data");

      setParams("bootcamp", bootcampId, ["learningpath", "course"]);

      getUserBootcampAnalytics(userId, bootcampId)
        .then((res) => {
          setBootcamp(res);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (searchType === "learningpath") {
      setLoading("Please wait fetching learningpath data");

      setParams("learningpath", learningpathId, ["bootcamp", "course"]);

      getLearningpathEnrolledUser(learningpathId)
        .then((res) => {
          setLearningpath(res);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (searchType === "course") {
      setLoading("Please wait fetching course data");

      setParams("course", courseId, ["bootcamp", "learningpath"]);

      getCourseEnrolledUser(courseId)
        .then((res) => {
          setCourse(res);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchDropdownData();
    // eslint-disable-next-line
  }, []);
  return (
    <div className="px-36 py-12">
      {!loading && !["TUTOR"]?.includes(user?.role) && (
        <div>
          <select
            placeholder="sdad"
            value={bootcampId}
            onChange={handleBootcampChange}
            className={`p-2 rounded
            ${
              searchType === "bootcamp"
                ? "bg-gradient-to-bl from-green-400 to-blue-400 text-gray-100 font-bold"
                : null
            }
          `}
            style={{ marginRight: "20px" }}
          >
            <option disabled selected value>
              {" "}
              -- select a bootcamp --{" "}
            </option>
            {allBootcamps.map((ab) => {
              return (
                <option value={ab._id} className="text-red-500">
                  {ab.bootcampName}
                </option>
              );
            })}
          </select>

          <select
            value={learningpathId}
            onChange={handleLearningpathChange}
            className={`py-2 rounded
            ${
              searchType === "learningpath"
                ? "bg-gradient-to-bl from-green-400 to-blue-400 text-gray-100 font-bold"
                : null
            }`}
            style={{ marginRight: "20px" }}
          >
            <option disabled selected value>
              {" "}
              -- select a learningpath --{" "}
            </option>
            {allLearningpaths.map((ab) => {
              return (
                <option value={ab._id} className="text-red-500">
                  {ab.learningpathname}
                </option>
              );
            })}
          </select>
          <select
            value={courseId}
            onChange={handleCourseChange}
            className={`py-2 rounded
            ${
              searchType === "course"
                ? "bg-gradient-to-bl from-green-400 to-blue-400 text-gray-100 font-bold"
                : null
            }`}
          >
            <option disabled selected value>
              {" "}
              -- select a course --{" "}
            </option>
            {allCourses.map((ab) => {
              return (
                <option value={ab._id} className="text-red-500">
                  {ab.coursename.trim()}
                </option>
              );
            })}
          </select>
          <button
            onClick={getAnalytics}
            className="bg-blue-200 py-2 px-5 my-2 rounded font-small"
          >
            Get Details
          </button>
        </div>
      )}

      {/* <h1 className="text-4xl font-bold text-gray-100">
        Program: {bootcamp?.bootcampName}
      </h1> */}
      {searchType === "bootcamp" && (
        <AnalyticsTable
          data={bootcamp?.bootcamp}
          total={bootcamp?.total}
          loading={loading}
          searchType="bootcamp"
          getAnalytics={getAnalytics}
          user={user}
          setLoading={setLoading}
        />
      )}
      {searchType === "learningpath" && (
        <LPAnalyticsTable
          data={learningpath}
          total={learningpath?.total}
          loading={loading}
          getAnalytics={getAnalytics}
        />
      )}
      {searchType === "course" && (
        <CourseAnalyticsTable
          data={course}
          total={course?.total}
          loading={loading}
        />
      )}
      {loading && (
        <div className="flex flex-col content-center">
          <Loader />
          <p className="m-0 text-white text-center">{loading}</p>
        </div>
      )}
    </div>
  );
};

export default StudentAnalytics;
