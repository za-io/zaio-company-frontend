import { format } from "date-fns";
import { normalizeDate, rgbStringToRgba } from "../../utils/goalCalendarUtils";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";
import { RxCircle } from "react-icons/rx";

const DayCell = ({
  date,
  isCurrentMonth,
  isSelected,
  tasks,
  onClick,
  goalsList,
}) => {
  const isDateSelected = isSelected(date);

  // Find if the date belongs to a goal
  const goalForDate = goalsList?.find(
    (goal) =>
      normalizeDate(goal.goalStartDate) <= date &&
      normalizeDate(goal.goalEndDate) >= date
  );
  const isGoalStart = goalsList?.some(
    (goal) => normalizeDate(goal.goalStartDate) === normalizeDate(date)
  );
  const isGoalEnd = goalsList?.some(
    (goal) => normalizeDate(goal.goalEndDate) === normalizeDate(date)
  );
  const isWithinGoal = goalForDate && !isGoalStart && !isGoalEnd;

  const borderStyleString = "3px dashed #00000080";

  // Define border styles dynamically based on position within a goal
  let borderStyles = {};
  if (goalForDate) {
    if (isGoalStart) {
      borderStyles = {
        borderTop: borderStyleString,
        borderLeft: borderStyleString,
        borderBottom: borderStyleString,
      };
    } else if (isGoalEnd) {
      borderStyles = {
        borderTop: borderStyleString,
        borderBottom: borderStyleString,
        borderRight: borderStyleString,
      };
    } else {
      borderStyles = {
        borderTop: borderStyleString,
        borderBottom: borderStyleString,
      };
    }
  }

  const cellClasses = [
    "day-cell",
    "text-dark",
    "d-flex",
    "flex-column",
    "rounded",
    !isCurrentMonth && "text-muted",
    isDateSelected && "selected",
    isWithinGoal && "within-goal",
    (tasks.length === 0 || goalForDate) && "bg-gray-100 cursor-not-allowed",
    isGoalStart && "goal-start",
    isGoalEnd && "goal-end",
  ]
    .filter(Boolean)
    .join(" ");

  const backgroundColor = goalForDate
    ? rgbStringToRgba(goalForDate.goalTilesColor, 1)
    : "white";

  const calculateTotalTaskTime = () => {
    if (!Array.isArray(tasks)) return 0; // Ensure tasks is an array
    return tasks.reduce((total, task) => total + (task.duration || 0), 0);
  };
  const color = "grey";
  return (
    <div
      className={cellClasses}
      style={{
        ...(!isDateSelected && tasks.length !== 0 ? { backgroundColor } : {}),
        ...borderStyles, // Apply border styles dynamically
      }}
      onClick={tasks?.length ? onClick : undefined}
    >
      <div className="date">{format(date, "d")}</div>
      {tasks.length > 0 && (
        <span className="font-semibold text-base text-primary">
          {tasks.length} Tasks ({calculateTotalTaskTime()} Mins)
        </span>
      )}

      <div className="d-flex flex-column w-100">
        {/* Render each task */}
        {tasks.map((task) => (
          <div key={task._id}>
            <button className="d-flex align-items-start flex-1">
              <div className="w-7">
                {["completed", "late", "advanced"]?.includes(task?.status) ? (
                  <IoMdCheckmarkCircleOutline color={color} />
                ) : (
                  <RxCircle color={color} />
                )}
              </div>
              <p className={"m-0 w-100 text-start text-sm"}>
                {task.lecturename}
              </p>
            </button>
          </div>
        ))}
      </div>

      {isGoalStart && (
        <div>
          <div className="mt-2 d-flex">
            <i class="bi bi-info-circle mr-2"></i>
            <p>{goalForDate?.goalName}</p>
          </div>
          <p className="m-0">Not Started</p>
        </div>
      )}
    </div>
  );
};

export default DayCell;
