import { useState } from "react";
import { addProgram, fetchCalPreviewData } from "../../api/company";
import Loader from "../../components/loader/loader";
import { useUserStore } from "../../store/UserProvider";
import Calendar from "../../components/TasksCalendar/Calendar";
import useDate from "../../hooks/useDate";
import { TasksModal } from "../../components/TasksCalendar/TasksModal";
export const AddProgram = () => {
  const [loading, setLoading] = useState(false);
  const date = useDate();

  const [msg, setMsg] = useState(null);
  const { user } = useUserStore();
  const [preview, setPreview] = useState(false);
  const [calendarData, setCalendarData] = useState(null);
  const handleSubmit = (e) => {
    e.preventDefault();

    if (preview) return fetchCalPreview(e);

    setMsg(null);
    const formData = new FormData(e.target);
    const programName = formData.get("programName");
    const learningPath = formData.get("learningPath");
    const emails = formData.get("emails");
    const commitedMins = formData.get("commitedMins");
    const startDate = formData.get("startDate");

    setLoading(true);
    addProgram({
      programName,
      learningPath,
      emails,
      commitedMins,
      company_id: user?._id,
      startDate,
    })
      .then((res) => {
        if (res.status === 200) {
          setMsg("Success");
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

    console.log(startDate, commitedMins, "learningpath");
    if (!learningPath) return;
    setLoading(true);
    fetchCalPreviewData({
      learningPath,
      commitedMins,
      startDate,
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

  return (
    <div className="mt-8 pb-8">
      <form onSubmit={handleSubmit} className="w-8/12 mx-auto">
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
            />
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

        <button
          onClick={() => {
            setPreview(false);
          }}
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Save
        </button>

        <button
          onClick={() => {
            setPreview(true);
          }}
          className="shadow ml-3 bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-2 px-4 rounded"
          type="submit"
        >
          Preview
        </button>
        {msg && <p className="text-white text-md mt-3">{msg}</p>}
      </form>

      {calendarData && preview && (
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
