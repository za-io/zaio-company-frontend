import { useMemo, useState } from "react";
import {
  buildTranscriptDataFromTutorSummary,
  calculateFinalMarkProjection,
  getGradeColor,
} from "../../utils/markPredictor";

function moduleSourceLabel(source) {
  if (source === "your_performance") return "From MCQ & challenge results";
  if (source === "estimated_from_average") return "Estimated from module average";
  if (source === "no_assessments") return "No MCQs/challenges";
  return "";
}

export default function FinalMarkPredictor({ userSummary, allAssignments, finalProjectMark }) {
  const [showCalculation, setShowCalculation] = useState(false);

  const projection = useMemo(() => {
    if (!userSummary?.length) return null;
    const transcriptData = buildTranscriptDataFromTutorSummary(
      userSummary,
      allAssignments,
      finalProjectMark
    );
    return calculateFinalMarkProjection(transcriptData);
  }, [userSummary, allAssignments, finalProjectMark]);

  if (!projection) return null;

  const { predicted, components, calculation } = projection;
  const scoreColor = getGradeColor(predicted.finalMark);
  const modulesRemaining = Math.max(0, components.modules.total - components.modules.started);

  return (
    <div className="border border-blue-700/50 rounded-xl bg-gray-900/60 p-4 max-w-7xl w-full mb-4">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Predicted final mark</h3>
          <p className="text-sm text-gray-400 max-w-2xl">
            Based on current performance — assumes the same level on remaining MCQs,
            challenges, assignments, and modules.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold" style={{ color: scoreColor }}>
            {predicted.finalMark}%
          </div>
          <div className="text-sm text-gray-400 font-semibold">Grade {predicted.letterGrade}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
        <div className="rounded-lg bg-gray-800/80 border border-gray-700 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Modules</p>
          <p className="text-sm font-bold text-white">
            {components.modules.started}/{components.modules.total}
          </p>
          {modulesRemaining > 0 && (
            <p className="text-[10px] text-gray-500 mt-0.5">{modulesRemaining} remaining</p>
          )}
        </div>
        <div className="rounded-lg bg-gray-800/80 border border-gray-700 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">MCQs</p>
          <p className="text-sm font-bold text-white">
            {components.mcq.completed}/{components.mcq.total || 0}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800/80 border border-gray-700 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Challenges</p>
          <p className="text-sm font-bold text-white">
            {components.challenges.completed}/{components.challenges.total || 0}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800/80 border border-gray-700 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Assignments</p>
          <p className="text-sm font-bold text-white">
            {components.assignments.graded}/{components.assignments.total || 0}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800/80 border border-gray-700 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Module mark</p>
          <p className="text-sm font-bold text-white">{predicted.finalModuleMark}%</p>
        </div>
        <div className="rounded-lg bg-gray-800/80 border border-gray-700 p-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">Project</p>
          <p className="text-sm font-bold text-white">
            {predicted.projectMark}%
            {!components.projectGraded && (
              <span className="text-[10px] font-normal text-gray-500"> est.</span>
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowCalculation((open) => !open)}
        className="px-3 py-1.5 rounded bg-gray-700 text-white hover:bg-gray-600 transition text-sm font-medium"
      >
        {showCalculation ? "Hide calculation" : "Show how this was calculated"}
      </button>

      {showCalculation && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-4 text-sm text-gray-300">
          <div>
            <p className="font-semibold text-white mb-1">Step 1 — Predicted mark per module</p>
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-800 text-gray-400">
                  <tr>
                    <th className="text-left p-2">Module</th>
                    <th className="text-left p-2">Predicted</th>
                    <th className="text-left p-2">How</th>
                  </tr>
                </thead>
                <tbody>
                  {calculation.modules.map((module) => (
                    <tr key={module.name} className="border-t border-gray-700">
                      <td className="p-2">{module.name}</td>
                      <td className="p-2">{module.mark}%</td>
                      <td className="p-2 text-gray-400">{moduleSourceLabel(module.source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 font-mono text-xs text-gray-400 bg-gray-800/80 rounded p-2">
              {calculation.steps.platformAverage}
            </p>
          </div>

          <div>
            <p className="font-semibold text-white mb-1">Step 2 — Assignment average (predicted)</p>
            {calculation.assignment.gradedCount > 0 ? (
              <p className="font-mono text-xs text-gray-400 bg-gray-800/80 rounded p-2">
                ({calculation.assignment.gradedMarks.map((m) => m.toFixed(1)).join(" + ")}
                {calculation.assignment.ungradedCount > 0
                  ? ` + ${calculation.assignment.ungradedCount} × ${calculation.assignment.avgOnGraded}`
                  : ""}
                ) ÷ {calculation.assignment.totalCount} = {calculation.assignment.avg}%
              </p>
            ) : (
              <p className="text-gray-400">No graded assignments yet.</p>
            )}
          </div>

          <div>
            <p className="font-semibold text-white mb-1">Step 3 — Final module mark</p>
            <p className="font-mono text-xs text-gray-400 bg-gray-800/80 rounded p-2">
              {calculation.steps.finalModuleMark}
            </p>
          </div>

          <div>
            <p className="font-semibold text-white mb-1">Step 4 — Project mark</p>
            <p className="text-gray-400">
              {calculation.project.source === "graded"
                ? `Graded at ${calculation.project.mark}%.`
                : calculation.project.source === "estimated_from_assignments"
                ? `Estimated from assignment average (${calculation.project.mark}%).`
                : `Estimated from module average (${Number(calculation.project.mark).toFixed(2)}%).`}
            </p>
          </div>

          <div>
            <p className="font-semibold text-white mb-1">Step 5 — Predicted final mark</p>
            <p className="font-mono text-xs text-gray-400 bg-gray-800/80 rounded p-2">
              {calculation.steps.finalMark}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3 mb-0">
        Compare with actual Final Mark above (based on work completed so far). Predicted mark
        assumes continued performance at current averages.
      </p>
    </div>
  );
}
