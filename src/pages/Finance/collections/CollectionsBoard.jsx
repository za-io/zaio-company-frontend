import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getFinanceCollectionCollected, getFinanceCollections, getFinanceCollectionsGmailAuthUrl, getFinanceCollectionsGmailStatus, patchFinanceCollectionsGmailAutomations, postFinanceCollectionsGmailDisconnect } from "../../../api/company";
import CollectionJourneyDrawer from "./CollectionJourneyDrawer";
import CollectionStageCycleFilter from "./CollectionStageCycleFilter";
import CollectionsCollectedPanel from "./CollectionsCollectedPanel";
import CollectionsRemindersPanel from "./CollectionsRemindersPanel";
import {
  COLLECTION_STAGE_OPTIONS,
  COLLECTION_RECOVERY_SIGNAL_OPTIONS,
  FIRST_MISS_EMAIL_SENT_FILTER,
  SECOND_MISS_EMAIL_SENT_FILTER,
  SECOND_MISS_WINDOW_EXPIRED_FILTER,
  cohortNamesOf,
  cohortOptionsFromCases,
  countCasesByRecoverySignal,
  countFirstMissEmailSentCases,
  countSecondMissEmailSentCases,
  daysSinceMissEmailSent,
  filterCollectionCases,
  formatCollectionsMoney,
  formatRecoverySignals,
  formatSecondMissWindow,
  isSecondMissWindowExpiredCase,
  mergeCollectionCancelUpdate,
  mergeCollectionEmailUpdate,
  mergeCollectionEvent,
  mergeCollectionReminderUpdate,
  mergeCollectionStageUpdate,
  recoverySignalDetailTooltip,
  recoverySignalPolicyHint,
  recoverySignalRowClass,
  stagePolicyHint,
  sumCollectionArrearsCents,
  toCollectionsApiError,
} from "./collectionsViewModel";
import PolicyStageSelect from "./PolicyStageSelect";

const WORKING_DAYS_NOTICE =
  "Working days exclude weekends but not public holidays.";
const REVIEW_NOTICE =
  "Review and low-confidence cases require human review.";
const V1_NOTICE =
  "When email automations are off, miss emails become editable drafts in the journey drawer — review each student before sending. Turn automations on once consolidation is complete. Second miss: confirm cancellation in the journey drawer with editable arrears and fee to move to debt recovery (invoice/Paystack still stubbed).";

function caseKeyOf(collectionCase) {
  if (!collectionCase) return null;
  if (collectionCase.caseKey != null && collectionCase.caseKey !== "") {
    return String(collectionCase.caseKey);
  }
  if (collectionCase.userId == null || collectionCase.planCode == null || collectionCase.planCode === "") {
    return null;
  }
  return `${collectionCase.userId}:${collectionCase.planCode}`;
}

function eventIdentityKey(event) {
  const userId = event?.userId;
  const planCode = event?.planCode;
  const hasUser = userId != null && String(userId) !== "";
  const hasPlan = planCode != null && String(planCode) !== "";
  if (!hasUser || !hasPlan) return null;
  return `${userId}:${planCode}`;
}

function stageLabel(stage) {
  const match = COLLECTION_STAGE_OPTIONS.find(([value]) => value === stage);
  return match ? match[1] : stage || "—";
}

function formatMissedInstallments(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return "—";
  return numbers.join(" + ");
}

function formatCollectionsDate(value) {
  if (value == null || value === "") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDaysOverdue(value) {
  if (value == null || value === "") return "—";
  const days = Number(value);
  return Number.isFinite(days) ? String(days) : "—";
}

function formatMissCycleStatus(row) {
  const missCycle = row?.missCycle;
  const blocked = Boolean(row?.student?.accBlocked || missCycle?.active || missCycle?.status === "cancelled");
  const emailLogged = Boolean(missCycle?.notificationSentAt);
  if (!blocked && !emailLogged) return "—";
  const parts = [];
  if (missCycle?.status === "cancelled") parts.push("Cancelled");
  else if (blocked) parts.push("Blocked");
  if (emailLogged) {
    const daysSinceEmail = daysSinceMissEmailSent(row);
    parts.push(
      daysSinceEmail == null
        ? "Email sent"
        : `Email sent · ${daysSinceEmail} day${daysSinceEmail === 1 ? "" : "s"} ago`
    );
  }
  else if (missCycle?.pendingEmailDraft) parts.push("Draft ready");
  const windowLabel = formatSecondMissWindow(missCycle);
  if (windowLabel) parts.push(windowLabel);
  return parts.join(" · ");
}

function formatLastContact(lastContact) {
  if (!lastContact) return "—";
  const date = formatCollectionsDate(lastContact.occurredAt);
  if (lastContact.summary) {
    return date === "—" ? lastContact.summary : `${date} · ${lastContact.summary}`;
  }
  return date;
}

function RecoverySignalCell({ row }) {
  const signalLabel = formatRecoverySignals(row);
  const detailTooltip = recoverySignalDetailTooltip(row);
  if (signalLabel === "—") return "—";

  return (
    <span className="inline-flex max-w-full items-center gap-0.5">
      <span className="truncate">{signalLabel}</span>
      {detailTooltip ? (
        <button
          type="button"
          className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[8px] leading-none text-gray-300 hover:border-white/40 hover:text-white"
          title={detailTooltip}
          aria-label={`Recovery signal details: ${signalLabel}`}
          onClick={(event) => event.stopPropagation()}
        >
          i
        </button>
      ) : null}
    </span>
  );
}

function countFor(value, counts, cases) {
  if (value === FIRST_MISS_EMAIL_SENT_FILTER) {
    return countFirstMissEmailSentCases(cases);
  }
  if (value === SECOND_MISS_EMAIL_SENT_FILTER) {
    return countSecondMissEmailSentCases(cases);
  }
  if (value === SECOND_MISS_WINDOW_EXPIRED_FILTER) {
    return (cases ?? []).filter(isSecondMissWindowExpiredCase).length;
  }
  if (!counts) return 0;
  if (value === "all") {
    const total = Number(counts.total);
    return Number.isFinite(total) ? total : 0;
  }
  const n = Number(counts.byStage?.[value]);
  return Number.isFinite(n) ? n : 0;
}

function emptyMessage({ serverEmpty, stage, search, cohort, recoverySignal }) {
  if (serverEmpty) return "No collection cases in the queue.";
  const hasStage = Boolean(stage) && stage !== "all";
  const hasSearch = Boolean(search);
  const hasCohort = Boolean(cohort) && cohort !== "all";
  const hasRecoverySignal = Boolean(recoverySignal) && recoverySignal !== "all";
  if (hasCohort || hasRecoverySignal) return "No cases match the selected filters.";
  if (hasStage && hasSearch) return "No cases match the selected stage and search.";
  if (hasStage) {
    if (stage === SECOND_MISS_WINDOW_EXPIRED_FILTER) {
      return "No cases with an expired 5 business-day window after 2+ miss.";
    }
    if (stage === FIRST_MISS_EMAIL_SENT_FILTER) {
      return "No first-miss cases with email sent yet.";
    }
    if (stage === SECOND_MISS_EMAIL_SENT_FILTER) {
      return "No second-miss cases with email sent yet.";
    }
    return "No cases in this stage.";
  }
  if (hasSearch) return "No cases match this search.";
  return "No collection cases in the queue.";
}

export default function CollectionsBoard({ includeExcluded = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cases, setCases] = useState([]);
  const [counts, setCounts] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loadedFor, setLoadedFor] = useState(undefined);
  const [stage, setStage] = useState("all");
  const [recoverySignal, setRecoverySignal] = useState("all");
  const [cohort, setCohort] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedCase, setSelectedCase] = useState(null);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailActionLoading, setGmailActionLoading] = useState(false);
  const [gmailBanner, setGmailBanner] = useState("");
  const [boardView, setBoardView] = useState("queue");
  const [remindersRefreshKey, setRemindersRefreshKey] = useState(0);
  const [collectedCount, setCollectedCount] = useState(0);
  const [collectedRefreshKey, setCollectedRefreshKey] = useState(0);

  const generationRef = useRef(0);
  const includeExcludedRef = useRef(includeExcluded);
  const casesRef = useRef(cases);
  const selectedRef = useRef(selectedCase);
  includeExcludedRef.current = includeExcluded;
  casesRef.current = cases;
  selectedRef.current = selectedCase;

  const load = useCallback(() => {
    const generation = ++generationRef.current;
    const requested = includeExcludedRef.current;
    setLoading(true);
    setError("");
    getFinanceCollections({ includeExcluded: requested }).then(
      (result) => {
        if (generation !== generationRef.current) return;
        if (!result?.success) {
          setError(result?.message || "Failed to load collections");
          setCases([]);
          setCounts(null);
          setWarnings([]);
          setSelectedCase(null);
          setLoadedFor(requested);
          setLoading(false);
          return;
        }
        setCases(Array.isArray(result.cases) ? result.cases : []);
        setCounts(result.counts && typeof result.counts === "object" ? result.counts : { total: 0, byStage: {} });
        setWarnings(Array.isArray(result.warnings) ? result.warnings : []);
        setSelectedCase(null);
        setLoadedFor(requested);
        setError("");
        setLoading(false);
      },
      (err) => {
        if (generation !== generationRef.current) return;
        setError(toCollectionsApiError(err, "Failed to load collections").message);
        setCases([]);
        setCounts(null);
        setWarnings([]);
        setSelectedCase(null);
        setLoadedFor(requested);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    load();
    return () => {
      generationRef.current += 1;
    };
  }, [includeExcluded, load]);

  useEffect(() => {
    getFinanceCollectionCollected().then((result) => {
      if (result?.success) {
        setCollectedCount(Array.isArray(result.cases) ? result.cases.length : 0);
      }
    });
  }, [collectedRefreshKey]);

  const loadGmailStatus = useCallback(() => {
    setGmailLoading(true);
    getFinanceCollectionsGmailStatus().then((result) => {
      if (result?.success) {
        setGmailStatus(result);
      } else {
        setGmailStatus(null);
      }
      setGmailLoading(false);
    });
  }, []);

  useEffect(() => {
    loadGmailStatus();
    const params = new URLSearchParams(window.location.search);
    const gmailResult = params.get("collections_gmail");
    const gmailMessage = params.get("message");
    if (gmailResult === "connected") {
      setGmailBanner("Gmail connected — you can send miss emails manually or turn on automations to send automatically.");
    } else if (gmailResult === "error") {
      setGmailBanner(
        gmailMessage
          ? `Gmail connect failed: ${decodeURIComponent(gmailMessage)}`
          : "Gmail connect failed."
      );
    }
    if (gmailResult) {
      params.delete("collections_gmail");
      params.delete("message");
      const next = params.toString();
      const nextUrl = `${window.location.pathname}${next ? `?${next}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [loadGmailStatus]);

  async function handleConnectGmail() {
    setGmailActionLoading(true);
    setGmailBanner("");
    const result = await getFinanceCollectionsGmailAuthUrl(window.location.origin);
    if (!result?.success || !result.authUrl) {
      setGmailBanner(result?.message || "Could not start Google sign-in.");
      setGmailActionLoading(false);
      return;
    }
    window.location.href = result.authUrl;
  }

  async function handleDisconnectGmail() {
    setGmailActionLoading(true);
    setGmailBanner("");
    const result = await postFinanceCollectionsGmailDisconnect();
    if (!result?.success) {
      setGmailBanner(result?.message || "Could not disconnect Gmail.");
      setGmailActionLoading(false);
      return;
    }
    setGmailStatus(result);
    setGmailBanner("Gmail disconnected — miss notifications will be logged only until reconnected.");
    setGmailActionLoading(false);
  }

  async function handleToggleAutomations(enabled) {
    setGmailActionLoading(true);
    setGmailBanner("");
    const result = await patchFinanceCollectionsGmailAutomations(enabled);
    if (!result?.success) {
      setGmailBanner(result?.message || "Could not update email automations.");
      setGmailActionLoading(false);
      return;
    }
    setGmailStatus(result);
    setGmailBanner(
      enabled
        ? "Email automations turned on — new miss emails will send automatically when Gmail is connected."
        : "Email automations turned off — new miss emails will appear as editable drafts in the journey drawer."
    );
    setGmailActionLoading(false);
  }

  function handleEmailDraftUpdated(update) {
    const targetKey = caseKeyOf(selectedRef.current);
    if (!targetKey) return;
    setCases((prev) =>
      prev.map((row) =>
        caseKeyOf(row) === targetKey ? mergeCollectionEmailUpdate(row, update) : row
      )
    );
    setSelectedCase((prev) =>
      prev && caseKeyOf(prev) === targetKey ? mergeCollectionEmailUpdate(prev, update) : prev
    );
  }

  function handleEmailSent(update) {
    handleEmailDraftUpdated(update);
  }

  function handleStageUpdated(update) {
    const targetKey = update?.caseKey;
    if (!targetKey) return;
    setCases((prev) =>
      prev.map((row) =>
        caseKeyOf(row) === targetKey ? mergeCollectionStageUpdate(row, update) : row
      )
    );
    setSelectedCase((prev) =>
      prev && caseKeyOf(prev) === targetKey ? mergeCollectionStageUpdate(prev, update) : prev
    );
  }

  function handleCancelInitiated(result) {
    const targetKey = caseKeyOf(selectedRef.current);
    if (!targetKey) return;
    setCases((prev) =>
      prev.map((row) =>
        caseKeyOf(row) === targetKey ? mergeCollectionCancelUpdate(row, result) : row
      )
    );
    setSelectedCase((prev) =>
      prev && caseKeyOf(prev) === targetKey ? mergeCollectionCancelUpdate(prev, result) : prev
    );
  }

  function handleEventCreated(event) {
    const identityKey = eventIdentityKey(event);
    const targetKey = identityKey || caseKeyOf(selectedRef.current);
    if (!targetKey) return;
    if (identityKey && !casesRef.current.some((row) => caseKeyOf(row) === identityKey)) {
      return;
    }
    setCases((prev) =>
      prev.map((row) => (caseKeyOf(row) === targetKey ? mergeCollectionEvent(row, event) : row))
    );
    setSelectedCase((prev) =>
      prev && caseKeyOf(prev) === targetKey ? mergeCollectionEvent(prev, event) : prev
    );
  }

  function handleReminderUpdated(result) {
    const reminder = result?.reminder ?? null;
    const event = result?.event ?? null;
    const targetKey =
      (reminder?.userId && reminder?.planCode && `${reminder.userId}:${reminder.planCode}`) ||
      eventIdentityKey(event) ||
      caseKeyOf(selectedRef.current);
    if (!targetKey) return;

    setCases((prev) =>
      prev.map((row) => {
        if (caseKeyOf(row) !== targetKey) return row;
        let next = row;
        if (event) next = mergeCollectionEvent(next, event);
        if (reminder) next = mergeCollectionReminderUpdate(next, reminder);
        return next;
      })
    );
    setSelectedCase((prev) => {
      if (!prev || caseKeyOf(prev) !== targetKey) return prev;
      let next = prev;
      if (event) next = mergeCollectionEvent(next, event);
      if (reminder) next = mergeCollectionReminderUpdate(next, reminder);
      return next;
    });
    setRemindersRefreshKey((value) => value + 1);
  }

  function handleReminderCompleted(result) {
    handleReminderUpdated(result);
  }

  function handleOpenCaseFromReminder(collectionCase) {
    setBoardView("queue");
    setSelectedCase(collectionCase);
  }

  const dataIsCurrent = loadedFor === includeExcluded;
  const showError = Boolean(error) && dataIsCurrent && !loading;
  const showLoading = !showError && (loading || !dataIsCurrent);
  const showQueue = !showLoading && !showError;
  const pendingReminderCount = cases.filter((row) => row.pendingReminder).length;
  const cohortOptions = cohortOptionsFromCases(cases);
  // A reload can drop the selected cohort from the queue entirely; falling back
  // keeps the board from showing an empty list against a blank select.
  const activeCohort = cohort !== "all" && !cohortOptions.includes(cohort) ? "all" : cohort;
  const visibleCases = filterCollectionCases(cases, { stage, search, cohort: activeCohort, recoverySignal });
  const visibleArrearsCents = sumCollectionArrearsCents(visibleCases);
  const serverEmpty = cases.length === 0;
  const queueMessage = emptyMessage({
    serverEmpty,
    stage,
    search: search.trim(),
    cohort: activeCohort,
    recoverySignal,
  });

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[10px] text-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-white">Collections email sender</p>
            {gmailLoading ? (
              <p className="text-gray-400 mt-0.5">Checking Gmail connection…</p>
            ) : gmailStatus?.connected ? (
              <p className="text-emerald-300 mt-0.5">
                Connected as {gmailStatus.connectedGoogleEmail || gmailStatus.senderEmail || "accounts@zaio.io"}
                {gmailStatus.connectedAt ? ` · since ${formatCollectionsDate(gmailStatus.connectedAt)}` : ""}
              </p>
            ) : (
              <p className="text-amber-200/90 mt-0.5">
                Not connected — connect{" "}
                <strong>
                  {(gmailStatus?.allowedSenderEmails ?? ["accounts@zaio.io", "recruitment@zaio.io"]).join(
                    " or "
                  )}
                </strong>{" "}
                to send miss emails manually or automatically.
              </p>
            )}
            <p className="text-gray-400 mt-1">
              Email automations:{" "}
              <strong className={gmailStatus?.emailAutomationsEnabled ? "text-emerald-300" : "text-amber-200"}>
                {gmailStatus?.emailAutomationsEnabled ? "On (auto-send)" : "Off (manual drafts)"}
              </strong>
            </p>
            {gmailStatus?.emailTestRecipient ? (
              <p className="text-amber-200/90 mt-1">
                Test mode: all miss emails send to{" "}
                <strong>{gmailStatus.emailTestRecipient}</strong> instead of the student.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={gmailActionLoading || gmailLoading}
              onClick={() => handleToggleAutomations(!gmailStatus?.emailAutomationsEnabled)}
              className={`px-2 py-1 rounded border text-[10px] font-medium disabled:opacity-50 ${
                gmailStatus?.emailAutomationsEnabled
                  ? "border-amber-500/40 bg-amber-950/40 text-amber-100 hover:bg-amber-950/60"
                  : "border-emerald-500/40 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-950/60"
              }`}
            >
              {gmailActionLoading
                ? "Updating…"
                : gmailStatus?.emailAutomationsEnabled
                  ? "Turn off automations"
                  : "Turn on automations"}
            </button>
            {gmailStatus?.connected ? (
              <button
                type="button"
                disabled={gmailActionLoading}
                onClick={handleDisconnectGmail}
                className="px-2 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-[10px] disabled:opacity-50"
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                disabled={gmailActionLoading || gmailLoading || gmailStatus?.oauthConfigured === false}
                onClick={handleConnectGmail}
                className="px-2 py-1 rounded border border-blue-500/40 bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-medium disabled:opacity-50"
              >
                {gmailActionLoading ? "Redirecting…" : "Connect with Google"}
              </button>
            )}
          </div>
        </div>
        {gmailBanner ? <p className="mt-1.5 text-cyan-200/90">{gmailBanner}</p> : null}
      </div>

      <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/25 px-2.5 py-1.5 text-[10px] text-cyan-100/90 leading-snug space-y-0.5">
        <p>{WORKING_DAYS_NOTICE}</p>
        <p>{REVIEW_NOTICE}</p>
        <p>{V1_NOTICE}</p>
      </div>

      {showLoading ? (
        <div role="status" aria-live="polite" className="flex justify-center py-10 text-xs text-gray-400">
          Loading collections…
        </div>
      ) : null}

      {showError ? (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      ) : null}

      {showQueue ? (
        <>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              aria-pressed={boardView === "queue"}
              onClick={() => setBoardView("queue")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border leading-tight ${
                boardView === "queue"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-white/5 text-gray-300 border-white/15 hover:bg-white/10"
              }`}
            >
              Collections queue
            </button>
            <button
              type="button"
              aria-pressed={boardView === "reminders"}
              onClick={() => setBoardView("reminders")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border leading-tight ${
                boardView === "reminders"
                  ? "bg-violet-600 text-white border-violet-500"
                  : "bg-white/5 text-gray-300 border-white/15 hover:bg-white/10"
              }`}
            >
              Reminders to check{" "}
              <span className="tabular-nums opacity-90">{pendingReminderCount}</span>
            </button>
            <button
              type="button"
              aria-pressed={boardView === "collected"}
              aria-label="Collected cases"
              onClick={() => setBoardView("collected")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border leading-tight ${
                boardView === "collected"
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-white/5 text-gray-300 border-white/15 hover:bg-white/10"
              }`}
            >
              Collected{" "}
              <span className="tabular-nums opacity-90" aria-hidden="true">
                {collectedCount}
              </span>
            </button>
          </div>

          {boardView === "reminders" ? (
            <CollectionsRemindersPanel
              key={remindersRefreshKey}
              cases={cases}
              onOpenCase={handleOpenCaseFromReminder}
              onReminderCompleted={handleReminderCompleted}
            />
          ) : boardView === "collected" ? (
            <CollectionsCollectedPanel
              key={collectedRefreshKey}
              onCountChange={setCollectedCount}
            />
          ) : (
            <>
          <CollectionStageCycleFilter
            stage={stage}
            onStageChange={setStage}
            countFor={countFor}
            counts={counts}
            cases={cases}
          />

          <div className="flex flex-wrap gap-1">
            {COLLECTION_RECOVERY_SIGNAL_OPTIONS.map(([value, label]) => {
              const selected = recoverySignal === value;
              const count = countCasesByRecoverySignal(cases, value);
              const colorClass =
                value === "yellow"
                  ? selected
                    ? "bg-yellow-500/25 text-yellow-100 border-yellow-400/50"
                    : "bg-yellow-500/10 text-yellow-100/90 border-yellow-500/25 hover:bg-yellow-500/15"
                  : value === "green"
                    ? selected
                      ? "bg-emerald-500/25 text-emerald-100 border-emerald-400/50"
                      : "bg-emerald-500/10 text-emerald-100/90 border-emerald-500/25 hover:bg-emerald-500/15"
                    : value === "blue"
                      ? selected
                        ? "bg-blue-500/25 text-blue-100 border-blue-400/50"
                        : "bg-blue-500/10 text-blue-100/90 border-blue-500/25 hover:bg-blue-500/15"
                      : selected
                        ? "bg-white/15 text-white border-white/25"
                        : "bg-white/5 text-gray-300 border-white/15 hover:bg-white/10";
              return (
                <button
                  key={value}
                  type="button"
                  title={recoverySignalPolicyHint(value)}
                  aria-pressed={selected}
                  onClick={() => setRecoverySignal(value)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border leading-tight ${colorClass}`}
                >
                  {label} <span className="tabular-nums opacity-90">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px] max-w-md">
              <label htmlFor="collections-search" className="block text-[10px] text-gray-500 mb-0.5">
                Search
              </label>
              <input
                id="collections-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Student, email, student number, plan, or bootcamp"
                className="w-full px-2 py-1 text-[10px] rounded bg-white/10 border border-white/20 text-white"
              />
            </div>

            <div className="min-w-[180px]">
              <label htmlFor="collections-cohort" className="block text-[10px] text-gray-500 mb-0.5">
                Bootcamp
              </label>
              <select
                id="collections-cohort"
                value={activeCohort}
                onChange={(event) => setCohort(event.target.value)}
                className="w-full px-2 py-1 text-[10px] rounded bg-white/10 border border-white/20 text-white"
              >
                <option value="all">All bootcamps</option>
                {cohortOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {warnings.length > 0 ? (
            <ul className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-2.5 py-1.5 text-[10px] text-amber-100/90 leading-snug space-y-0.5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <div className="rounded-lg border border-white/10 overflow-hidden bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 table-fixed text-[10px] leading-tight text-left">
                <colgroup>
                  <col className="w-[2rem]" />
                  <col className="w-[6%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                  <col className="w-[7%]" />
                  <col className="w-[4%]" />
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[3rem]" />
                </colgroup>
                <thead>
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="px-1 py-1 font-medium">#</th>
                    <th className="px-1 py-1 font-medium">Signal</th>
                    <th className="px-1 py-1 font-medium">Student</th>
                    <th className="px-1 py-1 font-medium">Bootcamp</th>
                    <th className="px-1 py-1 font-medium">Plan</th>
                    <th className="px-1 py-1 font-medium">Missed instalments</th>
                    <th className="px-1 py-1 font-medium">Arrears</th>
                    <th className="px-1 py-1 font-medium">Oldest due</th>
                    <th className="px-1 py-1 font-medium">Days overdue</th>
                    <th className="px-1 py-1 font-medium">Policy stage</th>
                    <th className="px-1 py-1 font-medium">Miss cycle</th>
                    <th className="px-1 py-1 font-medium">Next action</th>
                    <th className="px-1 py-1 font-medium">Last contact</th>
                    <th className="px-1 py-1 font-medium">Journey</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {visibleCases.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-1 py-4 text-center text-gray-500">
                        {queueMessage}
                      </td>
                    </tr>
                  ) : (
                    visibleCases.map((row, index) => {
                      const studentName = row.student?.username || "—";
                      const cohortNames = cohortNamesOf(row);
                      const nextAction = row.nextAction || "—";
                      const lastContact = formatLastContact(row.lastContact);
                      const missCycleStatus = formatMissCycleStatus(row);
                      const signalLabel = formatRecoverySignals(row);
                      const signalTooltip = recoverySignalDetailTooltip(row);
                      return (
                        <tr
                          key={caseKeyOf(row) || `${row.userId}:${row.planCode}`}
                          title={signalTooltip || (signalLabel === "—" ? undefined : signalLabel)}
                          className={`border-b border-white/5 ${recoverySignalRowClass(row)}`}
                        >
                          <td className="px-1 py-0.5 tabular-nums text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-1 py-0.5 truncate text-[9px] font-medium">
                            <RecoverySignalCell row={row} />
                          </td>
                          <td className="px-1 py-0.5 truncate" title={studentName}>
                            {row.userId ? (
                              <Link
                                to={`/student-profile/${row.userId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300"
                              >
                                {studentName}
                              </Link>
                            ) : (
                              studentName
                            )}
                          </td>
                          <td className="px-1 py-0.5 truncate" title={cohortNames.join(", ")}>
                            {cohortNames.length === 0 ? "—" : cohortNames.join(", ")}
                          </td>
                          <td className="px-1 py-0.5 truncate" title={row.planName || row.planCode || ""}>
                            {row.planName || row.planCode || "—"}
                          </td>
                          <td className="px-1 py-0.5 truncate" title={formatMissedInstallments(row.missedInstallmentNumbers)}>
                            {formatMissedInstallments(row.missedInstallmentNumbers)}
                          </td>
                          <td className="px-1 py-0.5 tabular-nums whitespace-nowrap">
                            {formatCollectionsMoney(row.arrearsCents)}
                          </td>
                          <td className="px-1 py-0.5 text-gray-400 whitespace-nowrap">
                            {formatCollectionsDate(row.oldestDueDate)}
                          </td>
                          <td className="px-1 py-0.5 tabular-nums whitespace-nowrap">
                            {formatDaysOverdue(row.daysOverdue)}
                          </td>
                          <td className="px-1 py-0.5">
                            <PolicyStageSelect
                              compact
                              collectionCase={row}
                              onStageUpdated={handleStageUpdated}
                            />
                          </td>
                          <td className="px-1 py-0.5 truncate text-amber-200/90" title={missCycleStatus}>
                            {missCycleStatus}
                          </td>
                          <td className="px-1 py-0.5 truncate" title={nextAction}>{nextAction}</td>
                          <td className="px-1 py-0.5 truncate text-gray-400" title={lastContact}>
                            {lastContact}
                          </td>
                          <td className="px-1 py-0.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedCase(row)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {visibleCases.length > 0 ? (
                  <tfoot>
                    <tr
                      data-testid="collections-totals"
                      className="border-t border-white/15 bg-white/[0.04] text-gray-100"
                    >
                      <td colSpan={6} className="px-1 py-1 font-medium">
                        {visibleCases.length} {visibleCases.length === 1 ? "case" : "cases"}
                      </td>
                      <td className="px-1 py-1 whitespace-nowrap tabular-nums font-medium">
                        {formatCollectionsMoney(visibleArrearsCents)}
                      </td>
                      <td colSpan={7} />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
            </>
          )}
        </>
      ) : null}

      <CollectionJourneyDrawer
        collectionCase={selectedCase}
        onClose={() => setSelectedCase(null)}
        onEventCreated={handleEventCreated}
        onStageUpdated={handleStageUpdated}
        onCancelInitiated={handleCancelInitiated}
        onEmailDraftUpdated={handleEmailDraftUpdated}
        onEmailSent={handleEmailSent}
        onReminderUpdated={handleReminderUpdated}
        gmailConnected={Boolean(gmailStatus?.connected)}
      />
    </div>
  );
}
