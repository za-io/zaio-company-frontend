import React from "react";
import {
  COLLECTION_STAGE_CYCLE_LAYOUT,
  collectionStageLabel,
  stagePolicyHint,
} from "./collectionsViewModel";

function StageArrow() {
  return (
    <div
      className="hidden sm:flex shrink-0 items-center px-0.5 text-gray-600"
      aria-hidden="true"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-70">
        <path
          d="M5 12h12m0 0l-4-4m4 4l-4 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function StageNode({ value, selected, count, onSelect }) {
  const label = collectionStageLabel(value);
  const hint = stagePolicyHint(value);
  const dimmed = count === 0 && value !== "all";

  return (
    <button
      type="button"
      data-testid={`collection-stage-${value}`}
      aria-label={`${label}, ${count}`}
      title={hint}
      aria-pressed={selected}
      onClick={() => onSelect(value)}
      className={`group relative flex min-w-[4.5rem] max-w-[7.5rem] flex-col items-center rounded-lg border px-1.5 py-1.5 text-center transition-all ${
        selected
          ? "border-blue-400/80 bg-blue-600/90 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.35)]"
          : dimmed
            ? "border-white/10 bg-white/[0.02] text-gray-500 hover:border-white/20 hover:bg-white/5 hover:text-gray-300"
            : "border-white/15 bg-white/[0.06] text-gray-200 hover:border-white/25 hover:bg-white/10"
      }`}
    >
      <span className="text-[9px] font-medium leading-tight line-clamp-2">{label}</span>
      <span
        className={`mt-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
          selected ? "bg-white/20 text-white" : "bg-black/25 text-gray-300 group-hover:bg-black/35"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ForkBranch({ branch, selected, count, onSelect }) {
  const label = collectionStageLabel(branch.value);
  const hint = stagePolicyHint(branch.value);
  const dimmed = count === 0;

  return (
    <button
      type="button"
      data-testid={`collection-stage-${branch.value}`}
      aria-label={`${label}, ${count}, ${branch.cohortTag}`}
      title={hint}
      aria-pressed={selected}
      onClick={() => onSelect(branch.value)}
      className={`group flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-left transition-all ${
        selected
          ? "border-amber-400/70 bg-amber-950/50 text-amber-50"
          : dimmed
            ? "border-white/10 bg-white/[0.02] text-gray-500 hover:border-white/20 hover:text-gray-300"
            : "border-white/12 bg-white/[0.04] text-gray-200 hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[8px] uppercase tracking-wide text-gray-500">
          {branch.cohortTag}
        </span>
        <span className="block text-[9px] font-medium leading-tight truncate">{label}</span>
      </span>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
          selected ? "bg-amber-400/20 text-amber-100" : "bg-black/25 text-gray-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default function CollectionStageCycleFilter({ stage, onStageChange, countFor, counts, cases }) {
  function resolveCount(value) {
    return countFor(value, counts, cases);
  }

  return (
    <div
      className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] px-2 py-2.5"
      aria-label="Collection journey cycle"
    >
      <p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-gray-500">
        Collection journey
      </p>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-0">
        {COLLECTION_STAGE_CYCLE_LAYOUT.map((node, index) => {
          const isLast = index === COLLECTION_STAGE_CYCLE_LAYOUT.length - 1;

          if (node.kind === "fork") {
            return (
              <React.Fragment key="fork">
                <StageArrow />
                <div className="flex shrink-0 flex-col gap-1 rounded-lg border border-dashed border-white/15 bg-black/10 px-1.5 py-1.5 min-w-[9rem] max-w-[11rem]">
                  <span className="text-center text-[8px] uppercase tracking-wide text-gray-500">
                    {node.caption}
                  </span>
                  {node.branches.map((branch) => (
                    <ForkBranch
                      key={branch.value}
                      branch={branch}
                      selected={stage === branch.value}
                      count={resolveCount(branch.value)}
                      onSelect={onStageChange}
                    />
                  ))}
                </div>
                {!isLast ? <StageArrow /> : null}
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={node.value}>
              <StageNode
                value={node.value}
                selected={stage === node.value}
                count={resolveCount(node.value)}
                onSelect={onStageChange}
              />
              {!isLast ? <StageArrow /> : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
