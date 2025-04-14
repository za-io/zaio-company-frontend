import { useEffect, useRef, useState } from "react";
import {
  addProgram,
  checkEnrollmentEligibility,
  enrollStudentsIntoLP,
  fetchCalPreviewData,
  getAllLPs,
  getAllTutors,
} from "../../api/company";
import Loader from "../../components/loader/loader";
import { useUserStore } from "../../store/UserProvider";
import Calendar from "../../components/TasksCalendar/Calendar";
import useDate from "../../hooks/useDate";
import { TasksModal } from "../../components/TasksCalendar/TasksModal";
import Multiselect from "multiselect-react-dropdown";

export const flowTypes = {
  preview_cal: "preview_cal",
  enroll_students: "enroll_students",
  bootcamp_api: "bootcamp_api",
};

export const AddProgram = () => {
  const [loading, setLoading] = useState(false);
  const date = useDate();

  const [msg, setMsg] = useState(null);
  const { user } = useUserStore();
  const [flow, setFlow] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [lpList, setLpList] = useState(null);
  const [allEnrolled, setAllEnrolled] = useState(null);
  const [allTutors, setAllTutors] = useState(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);

  const tutorSelectionRef = useRef();

  const fetchTutors = async () => {
    setLoading(true);
    const tutors = await getAllTutors();
    setAllTutors(tutors?.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  useEffect(() => {
    const init = () => {
      setLoading(true);
      getAllLPs()
        .then((res) => {
          console.log(res);
          if (res?.status === 200) {
            setLpList(res?.allLps);
          }
        })
        .finally(() => {
          setLoading(false);
        });
    };

    init();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (flow === flowTypes.preview_cal) return fetchCalPreview(e);
    if (flow === flowTypes.enroll_students) return checkAndEnrollStudents(e);

    setMsg(null);
    const formData = new FormData(e.target);
    const programName = formData.get("programName");
    const learningPath = formData.get("learningPath");
    const emails = formData.get("emails");
    const commitedMins = formData.get("commitedMins");
    const startDate = formData.get("startDate");
    const holidays = formData.get("holidays");
    const tutors = tutorSelectionRef.current
      ?.getSelectedItems()
      ?.map((item) => item?.id);

    if (!allEnrolled) {
      return setMsg(
        "Please enroll all the students into the learningpath first."
      );
    }

    setLoading(true);
    addProgram({
      programName,
      learningPath,
      emails,
      commitedMins,
      company_id: user?._id,
      startDate,
      holidays,
      tutors,
      selectedWeekdays,
    })
      .then((res) => {
        if (res.status === 200) {
          setMsg("Success");
          setSelectedWeekdays([]);
          e?.target?.reset();
        } else {
          setMsg(res?.errMsg);
        }
        console.log(res);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchCalPreview = (e) => {
    const formData = new FormData(e.target);
    const learningPath = formData.get("learningPath");
    const commitedMins = formData.get("commitedMins");
    const startDate = formData.get("startDate");
    const holidays = formData.get("holidays");

    if (!learningPath) return;
    setLoading(true);
    fetchCalPreviewData({
      learningPath,
      commitedMins,
      startDate,
      holidays,
      selectedWeekdays,
    })
      .then((res) => {
        date.setDate(new Date(res?.data?.[0]?.date));
        setCalendarData(res?.data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setLoading(false);
      });
  };

  const checkAndEnrollStudents = (e) => {
    const formData = new FormData(e.target);
    const learningPath = formData.get("learningPath");
    const emails = formData.get("emails");

    console.log(learningPath, emails, "learningpath");
    if (!learningPath || !emails) return;
    setLoading(true);
    checkEnrollmentEligibility({
      learningPath,
      emails,
    })
      .then(async (res) => {
        if (res?.missingEmails?.length > 0) {
          //show the list of missing users
          setMsg(`Please ask the below students to make an account as they can not be seen in the Zaio system:\n
          ${res?.missingEmails?.join(", ")}
          `);
        } else {
          //call the enrollment api
          const enrollRes = await enrollStudentsIntoLP({
            emails,
            learningpathid: learningPath,
          });

          console.log(enrollRes, "enrollRes");
          setAllEnrolled(true);
          setMsg(enrollRes?.message || "Error enrolling the students.");
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="mt-8 pb-8">
      <form onSubmit={handleSubmit} className="w-8/12 mx-auto">
        <p className="uppercase text-white text-large font-bold mb-4">
          Add New Program
        </p>
        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Program Name
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="programName"
              type="text"
              placeholder="Program Name"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              learning path ID
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="learningPath"
              type="text"
              placeholder="Learning Path ID"
              required
              list="lp_suggestions"
            />
            <datalist id="lp_suggestions">
              {lpList?.map((lp) => (
                <option value={lp?._id}>{lp?.learningpathname}</option>
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
              Emails of Learners
            </label>
            <textarea
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="emails"
              type="text"
              placeholder="Emails of Learners"
              required
            ></textarea>
            <p className="text-white text-xs italic">
              Please enter emails of learners as a comma seperated value
            </p>
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Commited Minutes
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="commitedMins"
              type="number"
              placeholder="Commited Minutes"
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Tutor Name
            </label>

            <Multiselect
              className="appearance-none block  w-full bg-gray-200 text-gray-700 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              options={allTutors?.map((tutor) => ({
                name: tutor?.company_username,
                id: tutor?._id,
              }))}
              ref={tutorSelectionRef}
              displayValue="name" // Property name to display in the dropdown options
            />
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Start Date (MM-DD-YYYY)
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="startDate"
              type="text"
              placeholder="MM-DD-YYYY"
            />
          </div>
        </div>

        <div className="w-full px-1 mb-6">
          <label className="block uppercase tracking-wide text-white text-xs font-bold mb-2">
            Select Days for Bootcamp Tasks
          </label>
          <div className="flex flex-wrap gap-4">
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((day) => (
              <label
                key={day}
                className="text-white text-sm flex items-center space-x-2"
              >
                <input
                  type="checkbox"
                  value={day}
                  checked={selectedWeekdays.includes(day)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedWeekdays((prev) =>
                      checked ? [...prev, day] : prev.filter((d) => d !== day)
                    );
                  }}
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap -mx-3 mb-6">
          <div className="w-full px-3">
            <label
              className="block uppercase tracking-wide text-white text-xs font-bold mb-2"
              for="grid-password"
            >
              Add Holidays
            </label>
            <input
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              name="holidays"
              type="text"
              placeholder="'MM-DD-YYYY'-'MM-DD-YYYY','MM-DD-YYYY'-'MM-DD-YYYY'"
            />
            <p className="text-white text-xs italic">
              Please enter holidays in the following syntex
              "08/10/2024"-"08/12/2024","09/10/2024"-"09/14/2024","10/01/2024"-"10/01/2024"
              where the date format will be MM-DD-YYYY
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setAllEnrolled(true);
            setFlow(flowTypes.bootcamp_api);
          }}
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Save
        </button>

        <button
          onClick={() => {
            setFlow(flowTypes.preview_cal);
          }}
          className="shadow ml-3 bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Preview
        </button>

        <button
          onClick={() => {
            setFlow(flowTypes.enroll_students);
          }}
          className="shadow ml-3 bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Enroll into learningpath
        </button>
        {msg && (
          <p
            dangerouslySetInnerHTML={{
              __html: msg,
            }}
            className="text-white text-md mt-3"
          />
        )}
      </form>

      {calendarData && flow === flowTypes.preview_cal && (
        <div className="mt-5 pb-5 mx-3">
          <p className="text-white text-md my-4">Calendar Preview: </p>
          <Calendar tasks={calendarData} date={date} />
        </div>
      )}

      <TasksModal />

      {loading && (
        <div className="absolute left-0 right-0 top-0 bottom-0 flex align-center justify-center">
          <Loader />
        </div>
      )}
    </div>
  );
};
