import bootcamp from "actions/services/bootcamp.service";
import { useState } from "react";
import { Link } from "react-router-dom";
const HOURS = [
  {
    label: "3 Hours",
    value: 180,
  },
  {
    label: "6 Hours",
    value: 360,
  },
];
export const BootcampModal = ({ learningpath }) => {
  const [commitedTime, setCommitedTime] = useState(HOURS[0].value);

  return (
    <div className="flex flex-col align-center items-center">
      <div className="flex align-center items-center">
        <p className="mr-4">Select Time Commitment</p>

        <div className="relative">
          <select
            onChange={(e) => {
              setCommitedTime(e.target.value);
            }}
            className="block appearance-none w-full bg-gray-200 border border-gray-200 text-gray-700 py-2 pl-4 pr-6 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
          >
            {HOURS?.map((item) => (
              <option value={item?.value}>{item?.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 mt-1 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link
          to={{
            pathname: "bootcamp-mode",
            search: `?learningpath=${learningpath}`,
            state: {
              commitedTime,
            },
          }}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Start Bootcamp Mode
        </Link>
      </div>
    </div>
  );
};
