import { useEffect } from "react";
import { AiOutlineCalendar } from "react-icons/ai";

const MonthAndYear = ({
  month,
  year,
  handlePreviousMonth,
  handleNextMonth,
}) => {
  return (
    <div className="flex py-3">
      <AiOutlineCalendar size={28} />
      <button onClick={handlePreviousMonth}>
        <svg
          className="w-6 h-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <h2 className="text-2xl font-bold leading-none mx-2">
        {month}, {year}
      </h2>

      <button onClick={handleNextMonth}>
        <svg
          className="w-6 h-6"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

export default MonthAndYear;
