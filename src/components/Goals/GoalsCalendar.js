"use client";

import { useState, useEffect } from "react";
import { Container, Button } from "react-bootstrap";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import DayCell from "./GoalsCalendarDayCell";
import GoalCreationModal from "./GoalCreationModal";
import { enrollIntoBootcamp } from "../../api/company";
import { fetchStudentGoals } from "../../api/student";
import { useLocation } from "react-router-dom";
import Loader from "../loader/loader";
import { GoalsList } from "./GoalsList";

const GoalsCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [bootcampTasks, setBootcampTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalStartDate, setGoalStartDate] = useState(null);
  const [goalEndDate, setGoalEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otherDetails, setOtherDetails] = useState({});
  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get("email");
  const learningpath = queryParams.get("learningpath");

  const fetchGoals = async ({ bootcampid, userid }) => {
    const goals = await fetchStudentGoals({
      bootcampid,
      userid,
    });
    if (goals?.deferredGoals) {
      setGoals(goals?.deferredGoals);
    }
  };

  const init = async () => {
    setLoading(true);

    try {
      const data = await enrollIntoBootcamp({
        email,
        learningpath,
      });

      if (data) {
        setBootcampTasks(data?.enrollDocData?.bootcampTasks);
        const bootcampid = data?.enrollDocData?.bootcampid;
        const userid = data?.enrollDocData?.userid;
        setOtherDetails({
          bootcampid,
          userid,
          learningpath,
        });

        await fetchGoals({
          bootcampid,
          userid,
        });
      }
    } catch (err) {
      console.log("Some error fetching the information", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email && learningpath) init();
  }, [email, learningpath]);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date) => {
    const isNotPartOfAnyGoal = goals?.every(
      (goal) => !(goal?.goalStartDate <= date && goal?.goalEndDate >= date)
    );
    if (!isNotPartOfAnyGoal) return;

    if (goalStartDate && !goalEndDate) {
      // check date is not before of the start date
      if (goalStartDate < date) setGoalEndDate(date);
    } else {
      setSelectedDate(date);
      setGoalStartDate(date);
      setGoalEndDate(null);
    }
  };

  const handleCreateGoal = () => {
    setShowGoalModal(true);
  };

  const onReset = async () => {
    if (goalStartDate && goalEndDate) {
      await fetchGoals(otherDetails);
      setShowGoalModal(false);
      setGoalStartDate(null);
      setGoalEndDate(null);
    }
  };

  const onDelete = async () => {
    await fetchGoals(otherDetails);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // Shift so Monday = 0

  const emptyCells = Array(firstDayOfWeek).fill(null);

  const checkIfDateIsInGoalInterval = (date) => {
    return date >= goalStartDate && date <= goalEndDate;
  };

  const isSelectedDate = (day) => {
    // check for already created goals
    return (
      isSameDay(day, goalStartDate) ||
      isSameDay(day, goalEndDate) ||
      checkIfDateIsInGoalInterval(day)
    );
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <Container>
      <div className="mb-3">
        <h1 className="text-center my-4 text-xl">Goal Tasks Calendar</h1>
        <div className="d-flex justify-content-around">
          <Button onClick={handlePrevMonth}>
            <i class="bi bi-chevron-left"></i>
          </Button>
          <p className="text-xl">{format(currentMonth, "MMMM yyyy")}</p>
          <Button onClick={handleNextMonth}>
            <i class="bi bi-chevron-right"></i>
          </Button>
        </div>
      </div>
      <div className="mt-5">
        <div>
          <div className="calendar-header d-flex justify-content-between">
            {weekDays.map((day) => (
              <div key={day} className="day-header mb-3 text-center fw-bold">
                {day}
              </div>
            ))}
          </div>
          <div className="calendar-grid">
            {emptyCells.map((_, index) => (
              <div key={`empty-${index}`}></div>
            ))}
            {monthDays.map((day) => (
              <DayCell
                key={day.toISOString()}
                date={day}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isSelected={isSelectedDate}
                tasks={
                  bootcampTasks.find((task) =>
                    isSameDay(new Date(task.date), day)
                  )?.tasks || []
                }
                onClick={() => handleDateClick(day)}
                isWithinGoal={goals.some(
                  (goal) => day >= goal.goalStartDate && day <= goal.goalEndDate
                )}
                goalsList={goals}
                isGoalStart={goalStartDate && isSameDay(day, goalStartDate)}
                isGoalEnd={goalEndDate && isSameDay(day, goalEndDate)}
              />
            ))}
          </div>
        </div>
        <div md={4}>
          {/* <TaskList
            tasks={
              selectedDate
                ? bootcampTasks.find((task) =>
                    isSameDay(new Date(task.date), selectedDate)
                  )?.tasks || []
                : []
            }
          /> */}
          <Button
            onClick={handleCreateGoal}
            disabled={!goalStartDate || !goalEndDate}
            className="mt-3"
          >
            Create Goal
          </Button>
        </div>
      </div>

      <GoalsList
        details={otherDetails}
        setLoading={setLoading}
        goals={goals}
        onDelete={onDelete}
      />

      <GoalCreationModal
        show={showGoalModal}
        onHide={() => setShowGoalModal(false)}
        onSave={onReset}
        startDate={goalStartDate}
        endDate={goalEndDate}
        otherDetails={otherDetails}
        bootcampTasks={bootcampTasks}
      />
    </Container>
  );
};

export default GoalsCalendar;
