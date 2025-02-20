import moment from "moment";
import { MdAccessTime, MdDone, MdError } from "react-icons/md";
import { AiOutlineClockCircle } from "react-icons/ai";
import { deleteStudentGoal } from "../../api/student";

export const GoalsList = ({ details, goals, onDelete, setLoading }) => {
  const handleDelete = async (goalId) => {
    const ifYes = window.confirm("");
    if (ifYes) {
      setLoading(true);
      try {
        const res = await deleteStudentGoal({
          goalId,
          userid: details?.userid,
          bootcampid: details?.bootcampid,
          learningpath: details?.learningpath,
        });
        if (res?.success) {
          // refresh the data
          onDelete();
        }
      } catch (err) {
        console.log("failed to delete Goal", err);
      } finally {
        setLoading(false);
      }
    }
  };
  return (
    <div
      className="mt-5 rounded bg-white py-2 px-4 h-min-100"
      style={{
        minHeight: "100vh",
      }}
    >
      <div className="d-flex align-items-center">
        <p className="text-2xl m-0 ms-2 my-4 text-black">All Goals</p>
      </div>

      {goals?.length > 0 &&
        goals?.map((goal, index) => (
          <div className="border rounded p-2 mb-4 text-black">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex flex-column">
                <p className="text-lg m-0 mb-2 font-bold">
                  {index + 1}. {goal?.goalName}
                </p>
                <p className="m-0 text-md">
                  <span className="font-bold">Goal starting on:</span>{" "}
                  {moment(goal.goalStartDate).format("MMMM Do YYYY, h:mm:ss A")}{" "}
                </p>
                <p className="m-0 text-md">
                  <span className="font-bold">Goal ending on:</span>{" "}
                  {moment(goal.goalEndDate).format("MMMM Do YYYY, h:mm:ss A")}{" "}
                </p>
              </div>
              <div className="d-flex flex-column">
                <p className="m-0 text-md">
                  <span className="font-bold">Complete goal by:</span>{" "}
                  {moment(goal.goalDeadline).format("MMMM Do YYYY, h:mm:ss A")}{" "}
                </p>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <div className="d-flex justify-content-end ms-2 border rounded align-items-center py-1 px-3">
                {/* Deadline Missed */}
                {goal?.deadlineMissed && (
                  <div className="d-flex align-items-center me-3 text-danger">
                    <MdError size={20} />
                    <p className="ms-1 m-0 fw-bold">Deadline Missed</p>
                  </div>
                )}

                {/* Completed */}
                {(goal?.isCompleted || goal?.status === "completed") && (
                  <div className="d-flex align-items-center me-3 text-success">
                    <MdDone size={20} />
                    <p className="ms-1 m-0 fw-bold">Completed</p>
                  </div>
                )}

                {/* In Progress */}
                {goal?.status === "in-progress" && (
                  <div className="d-flex align-items-center me-3 text-primary">
                    <MdAccessTime size={20} />
                    <p className="ms-1 m-0 fw-bold">In Progress</p>
                  </div>
                )}

                {/* Not Started */}
                {!goal?.deadlineMissed && goal?.status === "default" && (
                  <div className="d-flex align-items-center text-secondary">
                    <AiOutlineClockCircle size={20} />
                    <p className="ms-1 m-0 fw-bold">Not Started</p>
                  </div>
                )}
              </div>
              <button
                className="btn btn-outline-danger"
                onClick={() => {
                  handleDelete(goal?._id);
                }}
              >
                Delete Goal
              </button>
            </div>
          </div>
        ))}
    </div>
  );
};
