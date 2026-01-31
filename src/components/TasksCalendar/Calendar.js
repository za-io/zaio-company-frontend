import AllDays from "./AllDays";
import CalendarHeader from "./CalendarHeader";
import DayCardList from "./DayCardList";
import { parse, isSameDay, startOfDay } from "date-fns";

const Calendar = ({ tasks, date, goals = [] }) => {
  const events = tasks;

  // An array of days containing events and goals for populating the calendar
  const days = Array.from({ length: date.daysInMonth }, (_, i) => {
    const currentDay = i + 1;

    //Creates dateObject using month spelled out in a string, currentDay and year
    const dateObject = parse(
      `${date.month}, ${currentDay}, ${date.year}`,
      "MMMM, d, yyyy",
      new Date()
    );
    
    // Filter events for this day
    let eventsEachDay = events?.filter(
      (event) =>
        new Date(event?.date)?.toLocaleDateString() ===
        new Date(dateObject)?.toLocaleDateString()
    );
    const status = eventsEachDay[0]?.currentPerformance;
    eventsEachDay = eventsEachDay?.length > 0 ? eventsEachDay[0]?.tasks : [];
    
    // Filter goals for this day (check start date, end date, and deadline)
    const goalsForThisDay = goals?.filter((goal) => {
      const startDate = startOfDay(new Date(goal.goalStartDate));
      const endDate = startOfDay(new Date(goal.goalEndDate));
      const deadline = startOfDay(new Date(goal.goalDeadline));
      const currentDate = startOfDay(dateObject);
      
      // Goal is active if current date is between start and end dates, or if it's the deadline
      return (
        (currentDate >= startDate && currentDate <= endDate) ||
        isSameDay(currentDate, deadline)
      );
    });
    
    return {
      date: dateObject,
      events: eventsEachDay,
      goals: goalsForThisDay,
      status,
    };
  });

  return (
    <>
      <div className="flex flex-grow relative h-full w-full overflow-auto text-gray-700 bg-white">
        <div className="flex flex-col flex-grow">
          <CalendarHeader date={date} />
          <AllDays />
          <DayCardList data={days} firstDayOfMonth={date.firstDay} />
        </div>
      </div>
    </>
  );
};

export default Calendar;
