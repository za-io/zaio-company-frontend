import { isSameDay, format } from "date-fns";
import Event from "./Event";
import startOfDay from "date-fns/startOfDay";
import { useContext } from "react";
import { TasksContext } from "../../context/TasksProvider";

const CUT_TASKS_LEN = 4;

const DayCard = ({ date, events, status }) => {
  const { setShowModal, setTasks } = useContext(TasksContext);

  //Extracts month in long format from date object
  const month = format(date, "MMMM");

  //Extracts day from date object
  const day = date.getDate();

  //Checks if current day matches date
  const sameDayCheck = isSameDay(startOfDay(date), new Date());

  // Sort events by startAt property
  let sortedEvents = [...events].sort(
    (a, b) => new Date(a.startAt) - new Date(b.startAt)
  );
  const classes = "bg-white";
  const color = "";

  return (
    <div
      className={`relative flex flex-col group w-100 ${
        sameDayCheck ? "border-[2px] border-purple-300" : ""
      } ${classes}`}
    >
      <div className="flex justify-content-between">
        <div
          className={`block px-2 py-1 text-sm font-semibold ${
            sameDayCheck && "bg-teal-light"
          }`}
        >
          {day} {month}
        </div>
        {status === "advanced" && <div className="me-2">🎉</div>}
      </div>

      <div className="flex flex-col px-1 py-1">
        {sortedEvents.slice(0, CUT_TASKS_LEN).map((event, i) => (
          <>
            <Event color={color} event={event} key={i} />
            {i === CUT_TASKS_LEN - 1 &&
              sortedEvents?.length > CUT_TASKS_LEN && (
                <button
                  className="font-semibold text-sm text-left mt-1 text-indigo-700"
                  onClick={() => {
                    setTasks(sortedEvents);
                    setShowModal(true);
                  }}
                >
                  + {sortedEvents?.length - CUT_TASKS_LEN} Tasks
                </button>
              )}
          </>
        ))}
      </div>
    </div>
  );
};

export default DayCard;
