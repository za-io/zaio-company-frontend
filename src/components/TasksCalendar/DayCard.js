import { isSameDay, format } from "date-fns";
import Event from "./Event";
import Goal from "./Goal";
import startOfDay from "date-fns/startOfDay";
import { useContext } from "react";
import { TasksContext } from "../../context/TasksProvider";

const CUT_TASKS_LEN = 4;
const CUT_GOALS_LEN = 2;

const DayCard = ({ date, events, goals = [], status }) => {
  const { setShowModal, setTasks } = useContext(TasksContext);

  //Extracts month in long format from date object
  const month = format(date, "MMMM");

  //Extracts day from date object
  const day = date.getDate();

  //Checks if current day matches date
  const sameDayCheck = isSameDay(startOfDay(date), new Date());

  // Sort events by startAt property
  let sortedEvents = [...events].sort(
    (a, b) => new Date(a.startAt) - new Date(a.startAt)
  );
  
  // Sort goals by deadline
  let sortedGoals = [...goals].sort(
    (a, b) => new Date(a.goalDeadline) - new Date(b.goalDeadline)
  );
  
  const classes = "bg-white";
  const color = "";

  return (
    <div
      className={`relative flex flex-col group w-100 p-2 ${
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
        {/* Display Goals First */}
        {sortedGoals.slice(0, CUT_GOALS_LEN).map((goal, i) => (
          <Goal key={`goal-${i}`} goal={goal} />
        ))}
        
        {/* Show more goals button if there are more goals */}
        {sortedGoals?.length > CUT_GOALS_LEN && (
          <button
            className="font-semibold text-sm text-left mt-1 text-purple-700 hover:text-purple-800"
            onClick={() => {
              // You can implement a goals modal here
              console.log("Show more goals:", sortedGoals);
            }}
          >
            + {sortedGoals?.length - CUT_GOALS_LEN} Goals
          </button>
        )}

        {/* Display Events/Tasks */}
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
