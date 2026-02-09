import { useEffect, useRef, useState } from "react";
import {
  addProgram,
  checkEnrollmentEligibility,
  createAccountsForEmails,
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
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";

// Custom Calendar Date Picker Component
const CalendarDatePicker = ({ selectedDate, onDateSelect, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(selectedDate ? new Date(selectedDate) : new Date());
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDateClick = (day) => {
    const formattedDate = format(day, "yyyy-MM-dd");
    onDateSelect(formattedDate);
    setIsOpen(false);
  };

  const selectedDateObj = selectedDate ? parseISO(selectedDate) : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#0D1117] text-left border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
      >
        <span className={selectedDate ? "text-white" : "text-gray-500"}>
          {selectedDate ? format(parseISO(selectedDate), "MMMM d, yyyy") : "Select a date..."}
        </span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-[#161B22] rounded-xl border border-gray-700 shadow-2xl p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-white font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDateObj && isSameDay(day, selectedDateObj);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`
                    py-2 rounded-lg text-sm transition-all
                    ${!isCurrentMonth ? "text-gray-600" : "text-gray-300 hover:bg-gray-700"}
                    ${isSelected ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                    ${isToday && !isSelected ? "border border-blue-500" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-gray-700 flex gap-2">
            <button
              type="button"
              onClick={() => handleDateClick(new Date())}
              className="flex-1 py-2 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onDateSelect("");
                setIsOpen(false);
              }}
              className="flex-1 py-2 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Holiday Date Range Picker Component
const HolidayRangePicker = ({ holidayRanges, setHolidayRanges }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStart, setTempStart] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDateClick = (day) => {
    if (selectingStart) {
      setTempStart(day);
      setSelectingStart(false);
    } else {
      const start = tempStart < day ? tempStart : day;
      const end = tempStart < day ? day : tempStart;
      const newRange = {
        start: format(start, "MM/dd/yyyy"),
        end: format(end, "MM/dd/yyyy"),
      };
      setHolidayRanges([...holidayRanges, newRange]);
      setTempStart(null);
      setSelectingStart(true);
    }
  };

  const removeRange = (index) => {
    setHolidayRanges(holidayRanges.filter((_, i) => i !== index));
  };

  const isDateInRange = (day) => {
    return holidayRanges.some((range) => {
      const start = new Date(range.start);
      const end = new Date(range.end);
      return isWithinInterval(day, { start, end });
    });
  };

  const isDateStart = (day) => {
    return holidayRanges.some((range) => isSameDay(day, new Date(range.start)));
  };

  const isDateEnd = (day) => {
    return holidayRanges.some((range) => isSameDay(day, new Date(range.end)));
  };

  const isTempRange = (day) => {
    if (!tempStart || selectingStart) return false;
    const start = tempStart < day ? tempStart : day;
    const end = tempStart < day ? day : tempStart;
    return isWithinInterval(day, { start, end }) || isSameDay(day, tempStart);
  };

  // Convert ranges to the required string format
  const formatRangesForSubmit = () => {
    return holidayRanges
      .map((range) => `"${range.start}"-"${range.end}"`)
      .join(", ");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Ranges Display */}
      <div className="space-y-2 mb-3">
        {holidayRanges.length > 0 ? (
          holidayRanges.map((range, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-[#0D1117] border border-gray-700 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-white text-sm">
                  {range.start} <span className="text-gray-500">to</span> {range.end}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeRange(idx)}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No holiday periods added</p>
        )}
      </div>

      {/* Add Range Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#0D1117] text-left border border-gray-700 border-dashed rounded-xl py-3 px-4 hover:border-orange-500 hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-orange-400"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Holiday Period
      </button>

      {/* Hidden input for form submission */}
      <input type="hidden" name="holidays" value={formatRangesForSubmit()} />

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-[#161B22] rounded-xl border border-gray-700 shadow-2xl p-4">
          {/* Selection Status */}
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-sm text-orange-400">
              {selectingStart
                ? "Select the start date of the holiday period"
                : "Now select the end date"}
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-white font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const inExistingRange = isDateInRange(day);
              const isStart = isDateStart(day);
              const isEnd = isDateEnd(day);
              const inTempRange = isTempRange(day);
              const isTempStart = tempStart && isSameDay(day, tempStart);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`
                    py-2 rounded-lg text-sm transition-all relative
                    ${!isCurrentMonth ? "text-gray-600" : "text-gray-300 hover:bg-gray-700"}
                    ${inExistingRange ? "bg-orange-500/30 text-orange-300" : ""}
                    ${isStart || isEnd ? "bg-orange-500 text-white" : ""}
                    ${inTempRange && !isTempStart ? "bg-blue-500/30 text-blue-300" : ""}
                    ${isTempStart ? "bg-blue-500 text-white" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-gray-700 flex gap-2">
            {!selectingStart && (
              <button
                type="button"
                onClick={() => {
                  setTempStart(null);
                  setSelectingStart(true);
                }}
                className="flex-1 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Cancel Selection
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setTempStart(null);
                setSelectingStart(true);
              }}
              className="flex-1 py-2 text-sm text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const flowTypes = {
  preview_cal: "preview_cal",
  enroll_students: "enroll_students",
  bootcamp_api: "bootcamp_api",
};

// Program type options
const PROGRAM_TYPES = [
  {
    id: "fullstack",
    name: "Full Stack Web Development",
    icon: "code",
    color: "blue",
  },
  {
    id: "datascience",
    name: "Data Science",
    icon: "chart",
    color: "purple",
  },
  {
    id: "cybersecurity",
    name: "Cyber Security",
    icon: "shield",
    color: "green",
  },
];

// Program Type Selector Component
const ProgramTypeSelector = ({ selectedType, setSelectedType, isCustom, setIsCustom }) => {
  const getIcon = (type) => {
    switch (type) {
      case "code":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case "chart":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case "shield":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getColorClasses = (color, isSelected) => {
    if (!isSelected) return "border-gray-700 bg-gray-800/50 hover:border-gray-600";
    switch (color) {
      case "blue":
        return "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30";
      case "purple":
        return "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30";
      case "green":
        return "border-green-500 bg-green-500/10 ring-2 ring-green-500/30";
      default:
        return "border-gray-500 bg-gray-500/10";
    }
  };

  const getTextColorClass = (color, isSelected) => {
    if (!isSelected) return "text-gray-400";
    switch (color) {
      case "blue": return "text-blue-400";
      case "purple": return "text-purple-400";
      case "green": return "text-green-400";
      default: return "text-white";
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PROGRAM_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setSelectedType(type.id);
              setIsCustom(false);
            }}
            className={`p-4 rounded-xl border-2 transition-all text-left ${getColorClasses(
              type.color,
              selectedType === type.id && !isCustom
            )}`}
          >
            <div className={`mb-2 ${getTextColorClass(type.color, selectedType === type.id && !isCustom)}`}>
              {getIcon(type.icon)}
            </div>
            <p className={`font-semibold text-sm ${
              selectedType === type.id && !isCustom ? "text-white" : "text-gray-300"
            }`}>
              {type.name}
            </p>
          </button>
        ))}
      </div>
      
      {/* Custom Option */}
      <button
        type="button"
        onClick={() => {
          setIsCustom(true);
          setSelectedType(null);
        }}
        className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
          isCustom
            ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30"
            : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
        }`}
      >
        <div className={isCustom ? "text-orange-400" : "text-gray-500"}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <span className={`text-sm font-medium ${isCustom ? "text-white" : "text-gray-400"}`}>
          Custom Program Name
        </span>
      </button>
    </div>
  );
};

// Step indicator component
const StepIndicator = ({ steps, currentStep, completedSteps }) => (
  <div className="flex items-center justify-center mb-8">
    {steps.map((step, idx) => (
      <div key={idx} className="flex items-center">
        <div className="flex flex-col items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              completedSteps.includes(idx)
                ? "bg-green-500 text-white"
                : currentStep === idx
                ? "bg-blue-600 text-white ring-4 ring-blue-600/30"
                : "bg-gray-700 text-gray-400"
            }`}
          >
            {completedSteps.includes(idx) ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              idx + 1
            )}
          </div>
          <span className={`text-xs mt-2 ${currentStep === idx ? "text-white" : "text-gray-500"}`}>
            {step}
          </span>
        </div>
        {idx < steps.length - 1 && (
          <div
            className={`w-16 h-0.5 mx-2 ${
              completedSteps.includes(idx) ? "bg-green-500" : "bg-gray-700"
            }`}
          />
        )}
      </div>
    ))}
  </div>
);

// Weekday selector component
const WeekdaySelector = ({ selectedWeekdays, setSelectedWeekdays }) => {
  const days = [
    { short: "Sun", full: "Sunday" },
    { short: "Mon", full: "Monday" },
    { short: "Tue", full: "Tuesday" },
    { short: "Wed", full: "Wednesday" },
    { short: "Thu", full: "Thursday" },
    { short: "Fri", full: "Friday" },
    { short: "Sat", full: "Saturday" },
  ];

  return (
    <div className="flex gap-2">
      {days.map((day) => (
        <button
          key={day.full}
          type="button"
          onClick={() => {
            setSelectedWeekdays((prev) =>
              prev.includes(day.full)
                ? prev.filter((d) => d !== day.full)
                : [...prev, day.full]
            );
          }}
          className={`w-12 h-12 rounded-xl text-sm font-medium transition-all ${
            selectedWeekdays.includes(day.full)
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
          }`}
        >
          {day.short}
        </button>
      ))}
    </div>
  );
};

// Tutor Dropdown Selector Component
const TutorDropdown = ({ tutors, selectedTutors, setSelectedTutors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTutor = (tutorId) => {
    setSelectedTutors((prev) =>
      prev.includes(tutorId)
        ? prev.filter((id) => id !== tutorId)
        : [...prev, tutorId]
    );
  };

  const selectedTutorNames = tutors
    ?.filter((t) => selectedTutors.includes(t._id))
    ?.map((t) => t.company_username);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#0D1117] text-left border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
      >
        <div className="flex-1 min-w-0">
          {selectedTutors.length === 0 ? (
            <span className="text-gray-500">Select tutors...</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedTutorNames?.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-md"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-[#161B22] rounded-xl border border-gray-700 shadow-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div className="max-h-60 overflow-y-auto">
            {tutors?.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No tutors available</div>
            ) : (
              tutors?.map((tutor) => (
                <button
                  key={tutor._id}
                  type="button"
                  onClick={() => toggleTutor(tutor._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedTutors.includes(tutor._id)
                      ? "bg-blue-600/20 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedTutors.includes(tutor._id)
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-600"
                    }`}
                  >
                    {selectedTutors.includes(tutor._id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                    {tutor.company_username?.charAt(0)?.toUpperCase() || "T"}
                  </div>
                  {/* Name */}
                  <span className="font-medium">{tutor.company_username}</span>
                </button>
              ))
            )}
          </div>
          {selectedTutors.length > 0 && (
            <div className="border-t border-gray-700 p-2">
              <button
                type="button"
                onClick={() => setSelectedTutors([])}
                className="w-full py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AddProgram = () => {
  const [loading, setLoading] = useState(false);
  const date = useDate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);

  const [msg, setMsg] = useState(null);
  const [msgType, setMsgType] = useState("info");
  const { user } = useUserStore();
  const [flow, setFlow] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [lpList, setLpList] = useState(null);
  const [allEnrolled, setAllEnrolled] = useState(null);
  const [allTutors, setAllTutors] = useState(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [selectedLP, setSelectedLP] = useState(null);

  // Program name state
  const [selectedProgramType, setSelectedProgramType] = useState("fullstack");
  const [programMonth, setProgramMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [programYear, setProgramYear] = useState(new Date().getFullYear().toString());
  const [isCustomProgram, setIsCustomProgram] = useState(false);
  const [customProgramName, setCustomProgramName] = useState("");

  // Month options
  const months = [
    { value: "01", name: "January" },
    { value: "02", name: "February" },
    { value: "03", name: "March" },
    { value: "04", name: "April" },
    { value: "05", name: "May" },
    { value: "06", name: "June" },
    { value: "07", name: "July" },
    { value: "08", name: "August" },
    { value: "09", name: "September" },
    { value: "10", name: "October" },
    { value: "11", name: "November" },
    { value: "12", name: "December" },
  ];
  
  // Tutor selection state
  const [selectedTutors, setSelectedTutors] = useState([]);

  // Bootcamp type state
  const [bootcampType, setBootcampType] = useState("manual"); // "manual" or "auto"
  const [createdBootcampData, setCreatedBootcampData] = useState(null); // Store API key and endpoint after creation

  // Form field states for persistence between steps
  const [studentEmails, setStudentEmails] = useState("");
  const [createAccountsIfNotFound, setCreateAccountsIfNotFound] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [holidayRanges, setHolidayRanges] = useState([]); // Array of {start, end} objects
  const [googleClassroom, setGoogleClassroom] = useState("");
  const [commitedMins, setCommitedMins] = useState("");

  // Convert holiday ranges to string format for API
  const getHolidaysString = () => {
    return holidayRanges
      .map((range) => `"${range.start}"-"${range.end}"`)
      .join(", ");
  };

  const formRef = useRef();

  // Steps change based on bootcamp type
  const steps = bootcampType === "auto" 
    ? ["Basic Info", "Schedule", "Review"] 
    : ["Basic Info", "Students", "Schedule", "Review"];

  // Generate the full program name
  const getFullProgramName = () => {
    if (isCustomProgram) {
      return customProgramName;
    }
    const programType = PROGRAM_TYPES.find((t) => t.id === selectedProgramType);
    const monthName = months.find(m => m.value === programMonth)?.name || "";
    return `${programType?.name || ""} - ${monthName} ${programYear}`;
  };

  const fetchTutors = async () => {
    const tutors = await getAllTutors();
    setAllTutors(tutors?.data);
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  useEffect(() => {
    const init = () => {
      setLoading(true);
      getAllLPs()
        .then((res) => {
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

  const showMessage = (message, type = "info") => {
    setMsg(message);
    setMsgType(type);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (flow === flowTypes.preview_cal) return fetchCalPreview(e);
    if (flow === flowTypes.enroll_students) return checkAndEnrollStudents(e);

    setMsg(null);
    // Use state variables instead of formData since sections are conditionally rendered
    const programName = getFullProgramName();
    const learningPath = selectedLP?._id;

    if (!programName || programName.trim() === "" || programName === " - ") {
      return showMessage("Please select a program type or enter a custom name", "error");
    }

    if (!learningPath) {
      return showMessage("Please select a learning path in Step 1", "error");
    }

    // Only require students enrolled for manual bootcamps
    if (bootcampType === "manual" && !allEnrolled) {
      return showMessage(
        "Please enroll all the students into the learning path first using Step 2.",
        "error"
      );
    }

    setLoading(true);
    addProgram({
      programName,
      learningPath,
      emails: bootcampType === "auto" ? "" : studentEmails,
      googleClassroom,
      commitedMins,
      company_id: user?._id,
      startDate,
      holidays: getHolidaysString(),
      tutors: selectedTutors,
      selectedWeekdays,
      bootcampType,
    })
      .then((res) => {
        if (res.status === 200) {
          // For auto-enrollment, store the API details before resetting
          if (res.bootcampType === "auto" && res.apiKey) {
            setCreatedBootcampData({
              bootcampId: res.enrolled,
              apiKey: res.apiKey,
              autoEnrollEndpoint: res.autoEnrollEndpoint,
              bootcampName: programName,
            });
            showMessage("Auto-enrollment bootcamp created successfully! See API details below.", "success");
          } else {
            showMessage("Bootcamp created successfully!", "success");
            setCreatedBootcampData(null);
          }
          
          setSelectedWeekdays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
          setCompletedSteps(bootcampType === "auto" ? [0, 1, 2] : [0, 1, 2, 3]);
          e?.target?.reset();
          setAllEnrolled(null);
          setSelectedLP(null);
          setSelectedProgramType("fullstack");
          setProgramMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));
          setProgramYear(new Date().getFullYear().toString());
          setIsCustomProgram(false);
          setCustomProgramName("");
          setSelectedTutors([]);
          setStudentEmails("");
          setStartDate("");
          setHolidayRanges([]);
          setGoogleClassroom("");
          setCommitedMins("");
          setSelectedLP(null);
          setBootcampType("manual");
          setSelectedWeekdays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
        } else {
          showMessage(res?.errMsg || "Error creating bootcamp", "error");
        }
      })
      .catch(() => {
        showMessage("An error occurred", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchCalPreview = (e) => {
    // Use state variables instead of formData since sections are conditionally rendered
    const learningPath = selectedLP?._id;

    if (!learningPath) {
      showMessage("Please select a learning path first in Step 1", "error");
      return;
    }
    setLoading(true);
    fetchCalPreviewData({
      learningPath,
      commitedMins,
      startDate,
      holidays: getHolidaysString(),
      selectedWeekdays,
    })
      .then((res) => {
        date.setDate(new Date(res?.data?.[0]?.date));
        setCalendarData(res?.data);
        showMessage("Calendar preview generated!", "success");
      })
      .catch((err) => {
        showMessage("Error generating preview", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const checkAndEnrollStudents = (e) => {
    // Use state variables instead of formData since sections are conditionally rendered
    const learningPath = selectedLP?._id;

    if (!learningPath) {
      showMessage("Please select a learning path first in Step 1", "error");
      return;
    }
    if (!studentEmails || studentEmails.trim() === "") {
      showMessage("Please enter student emails", "error");
      return;
    }
    setLoading(true);
    checkEnrollmentEligibility({
      learningPath,
      emails: studentEmails,
    })
      .then(async (res) => {
        if (res?.missingEmails?.length > 0) {
          if (createAccountsIfNotFound) {
            try {
              await createAccountsForEmails({
                emails: res.missingEmails.join(","),
              });
              // Re-check eligibility and enroll
              const recheck = await checkEnrollmentEligibility({
                learningPath,
                emails: studentEmails,
              });
              if (recheck?.missingEmails?.length > 0) {
                showMessage(
                  `Could not create all accounts. Still missing: ${recheck.missingEmails.join(", ")}`,
                  "error"
                );
                return;
              }
            } catch (err) {
              showMessage(
                err?.response?.data?.message || "Failed to create accounts for missing emails.",
                "error"
              );
              return;
            }
          } else {
            showMessage(
              `The following students need to create accounts first: ${res?.missingEmails?.join(", ")}`,
              "error"
            );
            return;
          }
        }
        const enrollRes = await enrollStudentsIntoLP({
          emails: studentEmails,
          learningpathid: selectedLP?._id,
        });
        setAllEnrolled(true);
        if (!completedSteps.includes(1)) {
          setCompletedSteps([...completedSteps, 1]);
        }
        showMessage(enrollRes?.message || "Students enrolled successfully!", "success");
      })
      .catch((err) => {
        showMessage("Error checking enrollment", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleLPChange = (e) => {
    const lpId = e.target.value;
    const lp = lpList?.find((l) => l._id === lpId);
    setSelectedLP(lp);
  };

  // Generate year options (current year + next 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

  return (
    <div className="min-h-screen bg-[#0D1117] py-8 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create New Bootcamp</h1>
          <p className="text-gray-400">Set up a new bootcamp program for your students</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} completedSteps={completedSteps} />

        {/* Status Message */}
        {msg && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
              msgType === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : msgType === "error"
                ? "bg-red-500/10 border border-red-500/30 text-red-400"
                : "bg-blue-500/10 border border-blue-500/30 text-blue-400"
            }`}
          >
            {msgType === "success" ? (
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : msgType === "error" ? (
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{msg}</span>
            <button
              onClick={() => setMsg(null)}
              className="ml-auto text-current opacity-60 hover:opacity-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Auto-Enrollment API Details */}
        {createdBootcampData && (
          <div className="mb-6 p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Auto-Enrollment API Details</h3>
                <p className="text-sm text-gray-400">Use these credentials to enroll students via API</p>
              </div>
              <button
                onClick={() => setCreatedBootcampData(null)}
                className="ml-auto text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  Bootcamp Name
                </label>
                <p className="text-white font-medium">{createdBootcampData.bootcampName}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  API Endpoint
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#0D1117] text-green-400 px-4 py-2 rounded-lg font-mono text-sm overflow-x-auto">
                    POST {window.location.origin.replace('3001', '4000')}/bootcamp/auto-enroll/{createdBootcampData.bootcampId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin.replace('3001', '4000')}/bootcamp/auto-enroll/${createdBootcampData.bootcampId}`);
                      showMessage("Endpoint copied to clipboard!", "success");
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                  API Key <span className="text-red-400">(Keep this secret!)</span>
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#0D1117] text-yellow-400 px-4 py-2 rounded-lg font-mono text-sm overflow-x-auto">
                    {createdBootcampData.apiKey}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdBootcampData.apiKey);
                      showMessage("API key copied to clipboard!", "success");
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-[#0D1117] rounded-xl p-4 mt-4">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Example Request (cURL)
                </label>
                <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
{`curl -X POST "${window.location.origin.replace('3001', '4000')}/bootcamp/auto-enroll/${createdBootcampData.bootcampId}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${createdBootcampData.apiKey}" \\
  -d '{"email": "student@example.com"}'`}
                </pre>
                <button
                  onClick={() => {
                    const curlCommand = `curl -X POST "${window.location.origin.replace('3001', '4000')}/bootcamp/auto-enroll/${createdBootcampData.bootcampId}" -H "Content-Type: application/json" -H "x-api-key: ${createdBootcampData.apiKey}" -d '{"email": "student@example.com"}'`;
                    navigator.clipboard.writeText(curlCommand);
                    showMessage("cURL command copied to clipboard!", "success");
                  }}
                  className="mt-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy cURL
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                <strong>Note:</strong> The API key is only shown once. Store it securely. The student must have an account before enrolling via API.
              </p>
            </div>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Info */}
          <div className="bg-[#161B22] rounded-2xl border border-gray-800 overflow-visible">
            <div
              className="p-4 border-b border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
              onClick={() => setCurrentStep(0)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  completedSteps.includes(0) ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Step 1: Basic Information</h3>
                  <p className="text-gray-500 text-sm">Program name, learning path, and settings</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${currentStep === 0 ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {currentStep === 0 && (
              <div className="p-6 space-y-6">
                {/* Bootcamp Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Bootcamp Type <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setBootcampType("manual")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        bootcampType === "manual"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-gray-700 hover:border-gray-600 bg-[#0D1117]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          bootcampType === "manual" ? "bg-blue-500/20 text-blue-400" : "bg-gray-700 text-gray-400"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className={`font-semibold ${bootcampType === "manual" ? "text-white" : "text-gray-300"}`}>
                            Manual
                          </p>
                          <p className="text-xs text-gray-500">Add students manually</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBootcampType("auto")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        bootcampType === "auto"
                          ? "border-green-500 bg-green-500/10"
                          : "border-gray-700 hover:border-gray-600 bg-[#0D1117]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          bootcampType === "auto" ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className={`font-semibold ${bootcampType === "auto" ? "text-white" : "text-gray-300"}`}>
                            Auto Enrollment
                          </p>
                          <p className="text-xs text-gray-500">Enroll via API</p>
                        </div>
                      </div>
                    </button>
                  </div>
                  {bootcampType === "auto" && (
                    <p className="mt-3 text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
                      <span className="font-medium">Auto Enrollment:</span> Students will be enrolled via an API endpoint. You'll receive an API key after creation.
                    </p>
                  )}
                </div>

                {/* Program Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Program Type <span className="text-red-400">*</span>
                  </label>
                  <ProgramTypeSelector
                    selectedType={selectedProgramType}
                    setSelectedType={setSelectedProgramType}
                    isCustom={isCustomProgram}
                    setIsCustom={setIsCustomProgram}
                  />
                </div>

                {/* Month/Year Selection or Custom Input */}
                {!isCustomProgram ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Month <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={programMonth}
                        onChange={(e) => setProgramMonth(e.target.value)}
                        className="w-full bg-[#0D1117] text-white border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {months.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Year <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={programYear}
                        onChange={(e) => setProgramYear(e.target.value)}
                        className="w-full bg-[#0D1117] text-white border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Custom Program Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={customProgramName}
                      onChange={(e) => setCustomProgramName(e.target.value)}
                      placeholder="e.g., Advanced JavaScript Workshop 2026"
                      className="w-full bg-[#0D1117] text-white border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-500"
                    />
                  </div>
                )}

                {/* Preview of Program Name */}
                <div className="bg-[#0D1117] rounded-xl p-4 border border-gray-700">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Preview</p>
                  <div className="text-center">
                    <p className="text-xl font-bold text-white">
                      {isCustomProgram 
                        ? (customProgramName || "Enter custom name...") 
                        : (PROGRAM_TYPES.find(t => t.id === selectedProgramType)?.name || "")}
                    </p>
                    {!isCustomProgram && (
                      <p className="text-2xl font-bold text-blue-400 mt-1">
                        {months.find(m => m.value === programMonth)?.name} {programYear}
                      </p>
                    )}
                  </div>
                </div>

                {/* Hidden input for form submission */}
                <input type="hidden" name="programName" value={getFullProgramName()} />

                {/* Learning Path */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Learning Path <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="learningPath"
                    required
                    value={selectedLP?._id || ""}
                    onChange={handleLPChange}
                    className="w-full bg-[#0D1117] text-white border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a learning path</option>
                    {lpList?.map((lp) => (
                      <option key={lp._id} value={lp._id}>
                        {lp?.learningpathname}
                      </option>
                    ))}
                  </select>
                  {selectedLP && (
                    <p className="mt-2 text-sm text-gray-500">
                      ID: <span className="text-gray-400 font-mono">{selectedLP._id}</span>
                    </p>
                  )}
                </div>

                {/* Google Classroom */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Google Classroom Link
                  </label>
                  <input
                    name="googleClassroom"
                    type="url"
                    placeholder="https://classroom.google.com/..."
                    value={googleClassroom}
                    onChange={(e) => setGoogleClassroom(e.target.value)}
                    className="w-full bg-[#0D1117] text-white border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  />
                </div>

                {/* Committed Minutes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Daily Committed Minutes
                  </label>
                  <input
                    name="commitedMins"
                    type="number"
                    placeholder="e.g., 120"
                    value={commitedMins}
                    onChange={(e) => setCommitedMins(e.target.value)}
                    className="w-full bg-[#0D1117] text-white border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Expected daily study time in minutes
                  </p>
                </div>

                {/* Tutors */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Assign Tutors
                  </label>
                  <TutorDropdown
                    tutors={allTutors}
                    selectedTutors={selectedTutors}
                    setSelectedTutors={setSelectedTutors}
                  />
                  {selectedTutors.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {selectedTutors.length} tutor{selectedTutors.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!completedSteps.includes(0)) {
                      setCompletedSteps([...completedSteps, 0]);
                    }
                    // Skip Students step for auto-enrollment
                    setCurrentStep(bootcampType === "auto" ? 2 : 1);
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {bootcampType === "auto" ? "Continue to Schedule" : "Continue to Students"}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Students - Only for manual bootcamps */}
          {bootcampType === "manual" && (
          <div className="bg-[#161B22] rounded-2xl border border-gray-800 overflow-hidden">
            <div
              className="p-4 border-b border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
              onClick={() => setCurrentStep(1)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  completedSteps.includes(1) || allEnrolled ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Step 2: Add Students</h3>
                  <p className="text-gray-500 text-sm">Enter student emails and enroll them</p>
                </div>
                {allEnrolled && (
                  <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                    Enrolled
                  </span>
                )}
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${currentStep === 1 ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {currentStep === 1 && (
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Student Emails <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="emails"
                    rows={6}
                    placeholder="Enter student emails, one per line or comma-separated:&#10;student1@email.com&#10;student2@email.com, student3@email.com"
                    required
                    value={studentEmails}
                    onChange={(e) => setStudentEmails(e.target.value)}
                    className="w-full bg-[#0D1117] text-white border border-gray-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 resize-none font-mono text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Enter email addresses separated by commas or new lines
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createAccountsIfNotFound}
                    onChange={(e) => setCreateAccountsIfNotFound(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-[#0D1117] text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">
                    Create accounts if email not found
                  </span>
                </label>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    onClick={() => setFlow(flowTypes.enroll_students)}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Enroll Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Section 3: Schedule (Step 2 for auto, Step 3 for manual) */}
          <div className="bg-[#161B22] rounded-2xl border border-gray-800 overflow-visible">
            <div
              className="p-4 border-b border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
              onClick={() => setCurrentStep(2)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  completedSteps.includes(2) ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Step {bootcampType === "auto" ? "2" : "3"}: Schedule</h3>
                  <p className="text-gray-500 text-sm">Set start date, working days, and holidays</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${currentStep === 2 ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {currentStep === 2 && (
              <div className="p-6 space-y-5">
                {/* Start Date with Calendar */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <CalendarDatePicker
                    selectedDate={startDate}
                    onDateSelect={setStartDate}
                    label="Start Date"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    When should the bootcamp begin?
                  </p>
                </div>

                {/* Weekday Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Active Days
                  </label>
                  <WeekdaySelector
                    selectedWeekdays={selectedWeekdays}
                    setSelectedWeekdays={setSelectedWeekdays}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Select the days when bootcamp tasks will be scheduled
                  </p>
                </div>

                {/* Holidays with Calendar Range Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Holiday Periods
                  </label>
                  <HolidayRangePicker
                    holidayRanges={holidayRanges}
                    setHolidayRanges={setHolidayRanges}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Add date ranges when the bootcamp will be paused (e.g., holidays, breaks)
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    onClick={() => setFlow(flowTypes.preview_cal)}
                    className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!completedSteps.includes(2)) {
                        setCompletedSteps([...completedSteps, 2]);
                      }
                      setCurrentStep(3);
                    }}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Review & Create */}
          <div className="bg-[#161B22] rounded-2xl border border-gray-800 overflow-hidden">
            <div
              className="p-4 border-b border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors"
              onClick={() => setCurrentStep(3)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  completedSteps.includes(3) ? "bg-green-500/20 text-green-400" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">Step {bootcampType === "auto" ? "3" : "4"}: Review & Create</h3>
                  <p className="text-gray-500 text-sm">Review your settings and create the bootcamp</p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-gray-500 transition-transform ${currentStep === 3 ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {currentStep === 3 && (
              <div className="p-6 space-y-5">
                {/* Program Name Preview */}
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-5 border border-blue-500/30">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Program Name</p>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">
                      {isCustomProgram 
                        ? customProgramName 
                        : (PROGRAM_TYPES.find(t => t.id === selectedProgramType)?.name || "")}
                    </p>
                    {!isCustomProgram && (
                      <p className="text-3xl font-bold text-blue-400 mt-1">
                        {months.find(m => m.value === programMonth)?.name} {programYear}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${
                    allEnrolled
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-yellow-500/10 border-yellow-500/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {allEnrolled ? (
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <span className={`font-medium ${allEnrolled ? "text-green-400" : "text-yellow-400"}`}>
                        Student Enrollment
                      </span>
                    </div>
                    <p className={`text-sm ${allEnrolled ? "text-green-400/70" : "text-yellow-400/70"}`}>
                      {allEnrolled ? "Students enrolled successfully" : "Please enroll students in Step 2"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-blue-500/10 border-blue-500/30">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-blue-400">Active Days</span>
                    </div>
                    <p className="text-sm text-blue-400/70">
                      {selectedWeekdays.length} days selected
                    </p>
                  </div>
                </div>

                {/* Create Button */}
                <button
                  type="submit"
                  onClick={() => {
                    setAllEnrolled(true);
                    setFlow(flowTypes.bootcamp_api);
                  }}
                  disabled={loading}
                  className={`w-full py-4 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-600/25"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Bootcamp...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Bootcamp
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Calendar Preview */}
        {calendarData && flow === flowTypes.preview_cal && (
          <div className="mt-8 bg-[#161B22] rounded-2xl border border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Calendar Preview</h3>
                <p className="text-gray-500 text-sm">Preview of bootcamp schedule</p>
              </div>
            </div>
            <Calendar tasks={calendarData} date={date} />
          </div>
        )}

        <TasksModal />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#161B22] rounded-2xl p-8 flex flex-col items-center">
            <Loader />
            <p className="text-white mt-4">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};
