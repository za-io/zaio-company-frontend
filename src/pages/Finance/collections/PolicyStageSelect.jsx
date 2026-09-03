import React, { useEffect, useState } from "react";
import { patchFinanceCollectionStage } from "../../../api/company";
import {
  COLLECTION_STAGE_SELECT_OPTIONS,
  stageLabel,
  stagePolicyHint,
  stageSelectValue,
  toCollectionsApiError,
} from "./collectionsViewModel";

export default function PolicyStageSelect({
  collectionCase,
  compact = false,
  onStageUpdated,
  disabled = false,
}) {
  const [value, setValue] = useState(() => stageSelectValue(collectionCase));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(stageSelectValue(collectionCase));
    setError("");
  }, [collectionCase?.userId, collectionCase?.planCode, collectionCase?.stageSource, collectionCase?.stage]);

  if (!collectionCase?.userId || !collectionCase?.planCode) return null;

  async function handleChange(event) {
    const nextValue = event.target.value;
    setValue(nextValue);
    setSaving(true);
    setError("");

    try {
      const result = await patchFinanceCollectionStage(
        collectionCase.userId,
        collectionCase.planCode,
        { stage: nextValue === "AUTO" ? null : nextValue }
      );
      if (!result?.success) {
        setValue(stageSelectValue(collectionCase));
        setError(result?.message || "Failed to update policy stage");
        return;
      }
      onStageUpdated?.({
        caseKey: `${collectionCase.userId}:${collectionCase.planCode}`,
        userId: collectionCase.userId,
        planCode: collectionCase.planCode,
        policyStage: result.policyStage ?? null,
        stageSource: result.stageSource ?? (result.policyStage ? "manual" : "computed"),
        nextAction: result.nextAction,
        missCycle: result.missCycle ?? null,
        event: result.event,
      });
    } catch (err) {
      setValue(stageSelectValue(collectionCase));
      setError(toCollectionsApiError(err, "Failed to update policy stage").message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={compact ? "min-w-0 max-w-full" : "w-full"}>
      <select
        aria-label="Policy stage"
        value={value}
        disabled={disabled || saving}
        title={stagePolicyHint(value === "AUTO" ? collectionCase.computedStage : value)}
        onChange={handleChange}
        className={`w-full rounded border border-white/20 bg-white/10 text-white ${
          compact ? "px-1 py-0.5 text-[10px] leading-tight" : "px-2.5 py-1.5 text-xs"
        } disabled:opacity-60`}
      >
        <option value="AUTO">
          Auto{collectionCase.computedStage ? `: ${stageLabel(collectionCase.computedStage)}` : ""}
        </option>
        {COLLECTION_STAGE_SELECT_OPTIONS.map(([stageValue, label]) => (
          <option key={stageValue} value={stageValue}>
            {label}
          </option>
        ))}
      </select>
      {saving && !compact ? (
        <p className="mt-1 text-[10px] text-gray-500">Saving…</p>
      ) : !compact && collectionCase.stageSource === "manual" ? (
        <p className="mt-1 text-[10px] text-amber-300/90">
          Manual override · auto was {stageLabel(collectionCase.computedStage)}
        </p>
      ) : null}
      {error && !compact ? (
        <p role="alert" className="mt-1 text-[10px] text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
