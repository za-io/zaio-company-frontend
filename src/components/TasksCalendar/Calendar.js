import AllDays from "./AllDays";
import CalendarHeader from "./CalendarHeader";
import DayCardList from "./DayCardList";
import { parse } from "date-fns";

const Calendar = ({ tasks, date }) => {
  const events = tasks;

  // An array of days containing events for populating the calendar
  const days = Array.from({ length: date.daysInMonth }, (_, i) => {
    const currentDay = i + 1;

    //Creates dateObject using month spelled out in a string, currentDay and year
    const dateObject = parse(
      `${date.month}, ${currentDay}, ${date.year}`,
      "MMMM, d, yyyy",
      new Date()
    );
    let eventsEachDay = events?.filter(
      (event) =>
        new Date(event?.date)?.toLocaleDateString() ===
        new Date(dateObject)?.toLocaleDateString()
    );
    const status = eventsEachDay[0]?.currentPerformance;
    eventsEachDay = eventsEachDay?.length > 0 ? eventsEachDay[0]?.tasks : [];
    return {
      date: dateObject,
      events: eventsEachDay,
      status,
    };
  });

  return (
    <>
      <div className="flex flex-grow relative h-full w-full overflow-auto text-gray-700 bg-white">
        <div className="flex flex-col flex-grow">
        <CalendarHeader  date={date} />
          <AllDays />
          <DayCardList data={days} firstDayOfMonth={date.firstDay} />
        </div>
      </div>
    </>
  );
};

export default Calendar;
