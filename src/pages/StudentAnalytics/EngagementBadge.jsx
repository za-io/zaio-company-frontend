import { useState } from "react";

const ENGAGEMENT_STATES = {
  replied: { label: "Replied", color: "bg-blue-500", textColor: "text-white", sortRank: 0, needsAttention: true },
  coaching: { label: "Coaching", color: "bg-indigo-600", textColor: "text-white", sortRank: 1, needsAttention: false },
  taken_over: { label: "Taken over", color: "bg-purple-500", textColor: "text-white", sortRank: 2, needsAttention: false },
  catching_up: { label: "Catching up", color: "bg-teal-500", textColor: "text-white", sortRank: 3, needsAttention: false },
  transferred: { label: "Transfer", color: "bg-gray-500", textColor: "text-white", sortRank: 4, needsAttention: false },
  leaving: { label: "Leaving", color: "bg-gray-700", textColor: "text-white", sortRank: 5, needsAttention: false },
  not_responding: { label: "Not responding", color: "bg-red-500", textColor: "text-white", sortRank: 6, needsAttention: true },
  at_risk: { label: "At risk", color: "bg-white border-2 border-red-500", textColor: "text-red-500", sortRank: 7, needsAttention: true },
  behind: { label: "Behind", color: "bg-amber-500", textColor: "text-white", sortRank: 8, needsAttention: true },
  on_track: { label: "On track", color: "bg-green-500", textColor: "text-white", sortRank: 9, needsAttention: false },
  not_started: { label: "Not started", color: "bg-gray-300", textColor: "text-gray-700", sortRank: 10, needsAttention: false },
  onboarded: { label: "Onboarded", color: "bg-green-500", textColor: "text-white", sortRank: 9, needsAttention: false },
  missing: { label: "Missing", color: "bg-amber-500", textColor: "text-white", sortRank: 8, needsAttention: true },
};

const formatTooltipDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSASTDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
};

const EngagementTooltip = ({ engagement, visible }) => {
  if (!visible || !engagement) return null;

  const { 
    days = [], 
    lastNudge, 
    lastReply, 
    lastEncouragement,
    suhanasOutcome,
    stage,
    steps,
    nudges,
    coaching,
  } = engagement;

  return (
    <div className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg -top-2 left-full ml-2 w-64 whitespace-normal">
      {stage === "onboarding" && steps && (
        <div className="mb-2">
          <div className="font-semibold mb-1">Onboarding</div>
          <div className={steps.discord ? "text-green-400" : "text-red-400"}>
            {steps.discord ? "✓" : "✗"} Discord + cohort role
          </div>
          <div className={steps.classroom ? "text-green-400" : "text-red-400"}>
            {steps.classroom ? "✓" : "✗"} Google Classroom
          </div>
          <div className={steps.lms ? "text-green-400" : "text-red-400"}>
            {steps.lms ? "✓" : "✗"} LMS onboarding
          </div>
          {steps.day1 && (
            <div className={steps.day1.done >= steps.day1.threshold ? "text-green-400" : "text-red-400"}>
              {steps.day1.done >= steps.day1.threshold ? "✓" : "✗"} Day 1 ({steps.day1.done}/{steps.day1.total}, needs {steps.day1.threshold})
            </div>
          )}
        </div>
      )}
      
      {stage === "engagement" && days.length > 0 && (
        <div className="mb-2">
          <div className="font-semibold mb-1">Days due</div>
          {days.map((day, idx) => (
            <div key={idx} className={day.complete ? "text-green-400" : "text-amber-400"}>
              Day {day.day}: {day.done}/{day.total} tasks
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-700 pt-2 mt-2 space-y-1">
        {nudges && nudges.lastAt && (
          <div>
            <span className="text-gray-400">Last nudge:</span>{" "}
            {formatTooltipDate(nudges.lastAt)}
            {nudges.lastChannels && ` · ${nudges.lastChannels.join(" + ")}`}
            {nudges.count > 0 && ` (${nudges.count} of ${nudges.max || 3})`}
          </div>
        )}
        {lastNudge && !nudges?.lastAt && (
          <div>
            <span className="text-gray-400">Last nudge:</span> {formatTooltipDate(lastNudge)}
          </div>
        )}
        <div>
          <span className="text-gray-400">Last reply:</span>{" "}
          {lastReply ? formatTooltipDate(lastReply) : "none"}
        </div>
        {lastEncouragement && (
          <div>
            <span className="text-gray-400">Last encouragement:</span> {formatTooltipDate(lastEncouragement)}
          </div>
        )}
      </div>

      {suhanasOutcome && suhanasOutcome.value && (
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="font-semibold text-purple-300">Suhana's outcome: {suhanasOutcome.value}</div>
          {suhanasOutcome.note && (
            <div className="text-gray-300 mt-1">{suhanasOutcome.note}</div>
          )}
          {suhanasOutcome.setBy && (
            <div className="text-gray-500 text-xs mt-1">
              Set by {suhanasOutcome.setBy} on {formatTooltipDate(suhanasOutcome.setAt)}
            </div>
          )}
        </div>
      )}

      {coaching && coaching.active && (
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="font-semibold text-indigo-300">Coaching</div>
          <div className="space-y-1 mt-1">
            {coaching.startedAt && (
              <div>
                <span className="text-gray-400">Started:</span>{" "}
                {formatSASTDate(coaching.startedAt)}
              </div>
            )}
            {coaching.stepDeadline && (
              <div className={coaching.deadlinePassed ? "text-red-400" : ""}>
                <span className="text-gray-400">Step deadline:</span>{" "}
                {formatSASTDate(coaching.stepDeadline)}
                {coaching.deadlinePassed && " (deadline passed)"}
              </div>
            )}
            {coaching.lastCoachMessageAt && (
              <div>
                <span className="text-gray-400">Last from Suhana:</span>{" "}
                {formatSASTDate(coaching.lastCoachMessageAt)}
              </div>
            )}
            {coaching.lastStudentMessageAt && (
              <div>
                <span className="text-gray-400">Last from student:</span>{" "}
                {formatSASTDate(coaching.lastStudentMessageAt)}
              </div>
            )}
            <div className="text-gray-400 text-xs mt-1">
              Messages: {coaching.coachMessages || 0} sent, {coaching.studentMessages || 0} received
            </div>
          </div>
        </div>
      )}

      <div className="absolute left-0 top-4 -ml-1 w-2 h-2 bg-gray-900 transform rotate-45" />
    </div>
  );
};

export const EngagementBadge = ({ engagement, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!engagement) {
    return null;
  }

  const state = engagement.state || "not_started";
  const stateConfig = ENGAGEMENT_STATES[state] || ENGAGEMENT_STATES.not_started;

  let label = stateConfig.label;
  
  if (state === "behind" && engagement.behindDay) {
    label = `Behind (Day ${engagement.behindDay})`;
  }
  if (state === "missing" && engagement.missingCount !== undefined) {
    label = `Missing ${engagement.missingCount}/4`;
  }

  const nudgeCount = engagement.nudges?.count || engagement.nudgeCount;
  const showNudgeCount = (state === "behind" || state === "missing") && nudgeCount > 0;

  const streakIcon = state === "on_track" && engagement.streak ? " 🔥" : "";
  const aheadIcon = state === "on_track" && engagement.ahead ? " ⭐" : "";

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={`
          ${stateConfig.color} 
          ${stateConfig.textColor}
          px-2 py-1 rounded-full text-xs font-medium
          cursor-pointer hover:opacity-80 transition-opacity
          flex items-center gap-1
        `}
      >
        {label}{streakIcon}{aheadIcon}
        {showNudgeCount && (
          <span className="text-xs opacity-80">· Nudged ×{nudgeCount}</span>
        )}
      </button>
      
      {engagement.first30Days && (
        <span className="ml-1 text-xs text-gray-500 italic">First 30 days</span>
      )}

      <EngagementTooltip engagement={engagement} visible={showTooltip} />
    </div>
  );
};

export const isNeedsAttention = (stateOrEngagement) => {
  if (!stateOrEngagement) return false;
  
  const state = typeof stateOrEngagement === 'string' 
    ? stateOrEngagement 
    : stateOrEngagement.state;
  const engagement = typeof stateOrEngagement === 'object' ? stateOrEngagement : null;
  
  if (state === 'coaching' && engagement?.coaching) {
    return engagement.coaching.deadlinePassed || false;
  }
  
  if (state === 'replied' && engagement?.coaching?.active) {
    return true;
  }
  
  const stateConfig = ENGAGEMENT_STATES[state];
  return stateConfig?.needsAttention || false;
};

export const getEngagementSortRank = (engagement) => {
  if (!engagement) return 999;
  if (engagement.state === 'coaching') {
    return ENGAGEMENT_STATES.coaching.sortRank;
  }
  return engagement.sortRank ?? ENGAGEMENT_STATES[engagement.state]?.sortRank ?? 999;
};

export default EngagementBadge;
