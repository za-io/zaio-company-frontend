import MonthAndYear from "./MonthAndYear";

function CalendarHeader({ date }) {
  return (
    <div className="bg-white flex flex-row justify-center border-bottom py-2">
      <MonthAndYear
        month={date?.month}
        year={date?.year}
        handleNextMonth={date?.getNextMonth}
        handlePreviousMonth={date?.getPreviousMonth}
      />
    </div>
  );
}
export default CalendarHeader;
