import { FiTarget, FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";
import { format } from "date-fns";

const Goal = ({ goal }) => {
  // Determine goal status and styling
  const getGoalStatus = () => {
    if (goal?.deadlineMissed) {
      return {
        icon: <FiAlertCircle size={12} className="text-red-500" />,
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-700",
        statusText: "Overdue"
      };
    }
    
    if (goal?.isCompleted || goal?.status === "completed") {
      return {
        icon: <FiCheckCircle size={12} className="text-green-500" />,
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-700",
        statusText: "Completed"
      };
    }
    
    if (goal?.status === "in-progress") {
      return {
        icon: <FiClock size={12} className="text-blue-500" />,
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700",
        statusText: "In Progress"
      };
    }
    
    // Default/Not Started
    return {
      icon: <FiTarget size={12} className="text-gray-500" />,
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-gray-700",
      statusText: "Not Started"
    };
  };

  const status = getGoalStatus();
  const isDeadlineToday = format(new Date(goal.goalDeadline), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div
      className={`mb-1 p-2 rounded-md border ${status.bgColor} ${status.borderColor} ${status.textColor} hover:shadow-sm transition-all duration-200 cursor-pointer`}
      title={`${goal.goalName || 'Goal'}: ${goal.goalDesc || 'No description'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {status.icon}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs truncate">
              {goal.goalName || 'Goal'}
            </div>
            {goal.goalDesc && (
              <div className="text-xs opacity-75 truncate mt-1">
                {goal.goalDesc}
              </div>
            )}
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center space-x-1 ml-2">
          {isDeadlineToday && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
          <span className="text-xs font-medium opacity-75">
            {status.statusText}
          </span>
        </div>
      </div>
      
      {/* Deadline indicator */}
      <div className="mt-2 text-xs opacity-75">
        <div className="flex items-center space-x-1">
          <FiClock size={10} />
          <span>
            Due: {format(new Date(goal.goalDeadline), 'MMM d')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Goal;
