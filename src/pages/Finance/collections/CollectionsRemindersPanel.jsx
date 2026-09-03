import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  getFinanceCollectionReminders,
  postFinanceCollectionReminderComplete,
} from "../../../api/company";
import { toCollectionsApiError } from "./collectionsViewModel";

function formatReminderDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function tomorrowDateInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function CollectionsRemindersPanel({ cases, onOpenCase, onReminderCompleted }) {
  const [filterMode, setFilterMode] = useState("today");
  const [singleDate, setSingleDate] = useState(tomorrowDateInputValue());
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reminders, setReminders] = useState([]);
  const [actionId, setActionId] = useState("");
  const generationRef = useRef(0);

  const buildQuery = useCallback(() => {
    if (filterMode === "today") return { preset: "today" };
    if (filterMode === "tomorrow") return { preset: "tomorrow" };
    if (filterMode === "date") return { date: singleDate };
    return { from: rangeFrom || undefined, to: rangeTo || undefined };
  }, [filterMode, singleDate, rangeFrom, rangeTo]);

  const load = useCallback(() => {
    const generation = ++generationRef.current;
    setLoading(true);
    setError("");
    getFinanceCollectionReminders(buildQuery()).then((result) => {
      if (generation !== generationRef.current) return;
      if (!result?.success) {
        setError(result?.message || "Failed to load reminders");
        setReminders([]);
        setLoading(false);
        return;
      }
      setReminders(Array.isArray(result.reminders) ? result.reminders : []);
      setLoading(false);
    });
  }, [buildQuery]);

  useEffect(() => {
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [load]);

  function resolveCaseForReminder(reminder) {
    const match = cases.find(
      (row) => String(row.userId) === String(reminder.userId) && row.planCode === reminder.planCode
    );
    if (match) {
      return { ...match, pendingReminder: reminder };
    }
    return {
      userId: reminder.userId,
      planCode: reminder.planCode,
      planName: reminder.planName,
      student: reminder.student,
      journey: [],
      pendingReminder: reminder,
      caseKey: reminder.caseKey,
    };
  }

  async function handleComplete(reminder) {
    if (!reminder?.id) return;
    setActionId(reminder.id);
    setError("");
    try {
      const result = await postFinanceCollectionReminderComplete(
        reminder.userId,
        reminder.planCode,
        reminder.id
      );
      if (!result?.success) {
        setError(result?.message || "Failed to mark reminder done");
        return;
      }
      onReminderCompleted?.(result);
      load();
    } catch (err) {
      setError(toCollectionsApiError(err, "Failed to mark reminder done").message);
    } finally {
      setActionId("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {[
          ["today", "Today"],
          ["tomorrow", "Tomorrow"],
          ["date", "Single date"],
          ["range", "Date range"],
        ].map(([value, label]) => {
          const selected = filterMode === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilterMode(value)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border leading-tight ${
                selected
                  ? "bg-violet-600 text-white border-violet-500"
                  : "bg-white/5 text-gray-300 border-white/15 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filterMode === "date" ? (
        <div className="max-w-xs">
          <label htmlFor="reminder-single-date" className="block text-[10px] text-gray-500 mb-0.5">
            Check on
          </label>
          <input
            id="reminder-single-date"
            type="date"
            value={singleDate}
            onChange={(event) => setSingleDate(event.target.value)}
            className="w-full px-2 py-1 text-[10px] rounded bg-white/10 border border-white/20 text-white"
          />
        </div>
      ) : null}

      {filterMode === "range" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="reminder-from" className="block text-[10px] text-gray-500 mb-0.5">
              From
            </label>
            <input
              id="reminder-from"
              type="date"
              value={rangeFrom}
              onChange={(event) => setRangeFrom(event.target.value)}
              className="px-2 py-1 text-[10px] rounded bg-white/10 border border-white/20 text-white"
            />
          </div>
          <div>
            <label htmlFor="reminder-to" className="block text-[10px] text-gray-500 mb-0.5">
              To
            </label>
            <input
              id="reminder-to"
              type="date"
              value={rangeTo}
              onChange={(event) => setRangeTo(event.target.value)}
              className="px-2 py-1 text-[10px] rounded bg-white/10 border border-white/20 text-white"
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-gray-400" role="status">
          Loading reminders…
        </p>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-0 text-[10px] leading-tight text-left">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="px-2 py-1 font-medium">Check on</th>
                  <th className="px-2 py-1 font-medium">Student</th>
                  <th className="px-2 py-1 font-medium">Plan</th>
                  <th className="px-2 py-1 font-medium">Note</th>
                  <th className="px-2 py-1 font-medium">Set by</th>
                  <th className="px-2 py-1 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {reminders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-center text-gray-500">
                      No reminders for this filter.
                    </td>
                  </tr>
                ) : (
                  reminders.map((reminder) => {
                    const studentName = reminder.student?.username || reminder.student?.email || "—";
                    const overdue = Boolean(reminder.overdue);
                    return (
                      <tr
                        key={reminder.id}
                        className={`border-b border-white/5 ${overdue ? "bg-amber-950/20" : ""}`}
                      >
                        <td className="px-2 py-1 whitespace-nowrap">
                          <span className={overdue ? "text-amber-200 font-medium" : ""}>
                            {formatReminderDate(reminder.remindOn)}
                            {overdue ? " · overdue" : ""}
                          </span>
                        </td>
                        <td className="px-2 py-1 truncate" title={studentName}>
                          {studentName}
                        </td>
                        <td className="px-2 py-1 truncate" title={reminder.planName || reminder.planCode}>
                          {reminder.planName || reminder.planCode || "—"}
                        </td>
                        <td className="px-2 py-1 truncate" title={reminder.note || ""}>
                          {reminder.note || "—"}
                        </td>
                        <td className="px-2 py-1 truncate">{reminder.createdByName || "—"}</td>
                        <td className="px-2 py-1 whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => onOpenCase?.(resolveCaseForReminder(reminder))}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            disabled={actionId === reminder.id}
                            onClick={() => handleComplete(reminder)}
                            className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                          >
                            {actionId === reminder.id ? "Saving…" : "Done"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export { formatReminderDate, tomorrowDateInputValue };
