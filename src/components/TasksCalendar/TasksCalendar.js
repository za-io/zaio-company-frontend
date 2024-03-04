import useDate from "hooks/useDate";
import { useContext, useEffect, useRef, useState } from "react";
import Calendar from "component/TasksCalendar/Calendar";
import { TasksModal } from "./TasksModal";
import CalendarHeader from "./CalendarHeader";
import bootcamp from "actions/services/bootcamp.service";
import BarLoader from "react-spinners/BarLoader";
import ChatBubble from "pages/DashBoard/ChatBubble";
import DashboardNavbar from "component/navbar/Navbar";
import { useHistory, useLocation } from "react-router-dom";
import { UserContext } from "context/UserProvider";
import { getQueryParameters } from "Utils/AppUtils";
import classes from "./TasksCalendar.module.scss";

function CalendarPage({ onlyCalendar, email = null, fromProfile = false }) {
  const date = useDate();
  const history = useHistory();
  const canScrollMonthRef = useRef(true);
  const [tasks, setTasks] = useState(null);
  const [bootcampData, setBootcampData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { commitedTime } = history?.location?.state || {};
  const { user } = useContext(UserContext);
  const { search } = useLocation();
  const { learningpath: learningpath_ } = getQueryParameters(search);
  const [learningpath, setLearningpath] = useState(learningpath_);
  const [enrolledBootcamps, setEnrolledBootcamps] = useState(null);
  const [enrollAPIloading, setEnrollAPILoading] = useState(false);
  const handleWheelScroll = (e) => {
    if (!canScrollMonthRef.current) return;
    canScrollMonthRef.current = false;

    if (e.deltaY > 0) {
      date.getNextMonth();
    } else {
      date.getPreviousMonth();
    }
    setTimeout(() => {
      canScrollMonthRef.current = true;
    }, 200);
  };

  useEffect(() => {
    if (enrolledBootcamps) return;
    setEnrollAPILoading(true);
    bootcamp
      .fetchAllEnrolledBootcamps({
        email: email ? email : user.email,
      })
      .then((res) => {
        setEnrolledBootcamps(res?.enrolledBootcamps);
        //Make first bootcamp as default if learningpath is not present in url
        if (res?.enrolledBootcamps?.length > 0 && !learningpath) {
          setLearningpath(res?.enrolledBootcamps[0]?.learningpath?._id);
        }
      })
      .catch(() => {})
      .finally(() => {
        setEnrollAPILoading(false);
      });
  }, []);

  const init = () => {
    console.log(user, email, learningpath, "learningpath");
    if (!user || !learningpath) return;
    setLoading(true || tasks);
    bootcamp
      .enrollIntoBootcamp({
        learningpath,
        commitedMins: commitedTime,
        email: email ? email : user.email,
      })
      .then((res) => {
        // console.log("BOOTCAMPTASKS", res, res?.enrollDocData?.bootcampTasks);
        setTasks(res?.enrollDocData?.bootcampTasks);
        date.setDate(new Date(res?.enrollDocData?.bootcampTasks?.[0]?.date));
        setBootcampData(res?.enrollDocData);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDataUpdate = (data) => {
    setTasks(data?.enrollDocData?.bootcampTasks);
    date.setDate(new Date(res?.enrollDocData?.bootcampTasks?.[0]?.date));

    setBootcampData(data?.enrollDocData);
  };

  useEffect(() => {
    const { learningpath: learningpath_ } = getQueryParameters(search);
    setLearningpath(learningpath_);
  }, [search]);

  useEffect(() => {
    console.log("FROM PROFILE", fromProfile);
    // if (fromProfile) {
    //   alert("You have to enroll into a bootcamp to view your schedule");
    //   return;
    // }
    init();
  }, [learningpath, user]);

  // if (fromProfile) {
  //   return (
  //     <div className="w-100">
  //       <h1>You have to enroll into a bootcamp to view your schedule</h1>
  //     </div>
  //   );
  // }

  return (
    <div className={!onlyCalendar ? classes.bootcampModeContainer : ""}>
      {!onlyCalendar && <DashboardNavbar />}

      {loading && (
        <div className="py-2 px-5">
          <BarLoader color="#8437f9" cssOverride={{ width: "100%" }} />
          <ChatBubble title={"setting up your schedule..."} showLive={false} />
        </div>
      )}
      {!loading && tasks?.length > 0 && (
        <div className="m-0 p-0 w-100 d-flex px-4 py-2">
          <main
            // onWheel={handleWheelScroll}
            className="flex flex-col shadow-sm min-h-screen max-w-[1920px] mx-auto"
          >
            {/* render all bootcamps */}

            <div className="py-2 bg-white">
              {enrollAPIloading && <p>Loading...</p>}
              {enrolledBootcamps && (
                <div>
                  {enrolledBootcamps?.map((bootcamp) => {
                    const bgColor =
                      bootcamp?.learningpath?._id === learningpath
                        ? "bg-blue-500 hover:bg-blue-700 text-white"
                        : "bg-transparent text-blue-700 border border-blue-500 hover:border-transparent";

                    return (
                      <button
                        className={`m-2 font-bold py-2 px-4 rounded-full ${bgColor}`}
                      >
                        {bootcamp?.learningpath?.learningpathname}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      )}
      <TasksModal />
    </div>
  );
}
export { CalendarPage };
