import React, { useEffect, useState } from "react";
import {
  getAllBootcamps,
  getAllCourses,
  getAllLearningpaths,
  getUserBootcampAnalytics,
  getUserCourseAnalytics,
  getUserLearningpathAnalytics,
} from "../../api/student";
import Loader from "../../components/loader/loader";
import AnalyticsTable from "./table";
import { useSearchParams } from "react-router-dom";

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

  const getAnalytics = () => {
    setLoading(true);
    setBootcamp(null);
    setLearningpath(null);
    setCourse(null);
    console.log(searchType);

    if (searchType === "bootcamp") {
      setLoading("Please wait fetching bootcamp data");

      searchParams.set("bootcamp", bootcampId);
      setSearchParams(searchParams);

      getUserBootcampAnalytics(userId, bootcampId)
        .then((res) => {
          setBootcamp(res);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (searchType === "learningpath") {
      setLoading("Please wait fetching learningpath data");
      searchParams.set("learningpath", learningpathId);
      setSearchParams(searchParams);

      getUserLearningpathAnalytics(userId, learningpathId)
        .then((res) => {
          setLearningpath(res);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (searchType === "course") {
      setLoading("Please wait fetching course data");
      searchParams.set("course", courseId);
      setSearchParams(searchParams);

      getUserCourseAnalytics(userId, courseId)
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
      {!loading && (
        <div>
          <select
            value={bootcampId}
            onChange={handleBootcampChange}
            className={`py-2 rounded
            ${searchType === "bootcamp" ? "bg-red-700 text-gray-100" : null}
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
              searchType === "learningpath" ? "bg-red-700 text-gray-100" : null
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
            ${searchType === "course" ? "bg-red-700 text-gray-100" : null}`}
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
        />
      )}
      {searchType === "learningpath" && (
        <AnalyticsTable
          data={learningpath?.learningpath}
          total={learningpath?.total}
          loading={loading}
          searchType="learningpath"
        />
      )}
      {searchType === "course" && (
        <AnalyticsTable
          data={course?.course}
          total={course?.total}
          loading={loading}
          searchType="course"
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
