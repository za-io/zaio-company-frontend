import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiBell, FiPhone, FiUser } from "react-icons/fi";
import {
  patchFinanceCollectionEmailDraft,
  postFinanceCollectionCancel,
  postFinanceCollectionEvent,
  postFinanceCollectionReminder,
  postFinanceCollectionSendEmail,
  postFinanceCollectionEmailSentManually,
} from "../../../api/company";
import {
  canInitiateManualCancel,
  formatCollectionsMoney,
  formatSecondMissWindow,
  toCollectionsApiError,
} from "./collectionsViewModel";
import { formatReminderDate, tomorrowDateInputValue } from "./CollectionsRemindersPanel";
import ManualCancellationForm from "./ManualCancellationForm";
import PolicyStageSelect from "./PolicyStageSelect";

const TITLE_ID = "collection-journey-title";
const NOTE_FIELD_ID = "collection-call-note";
const CALL_PANEL_ID = "collection-call-log-panel";
const REMINDER_PANEL_ID = "collection-reminder-panel";
const REMINDER_DATE_FIELD_ID = "collection-reminder-date";
const V1_NOTICE =
  "When email automations are off, miss emails appear as editable drafts below — review and send manually. When automations are on, emails send automatically once Gmail is connected. Second miss: confirm manual cancellation with editable arrears and fee to move to debt recovery (invoice/Paystack still stubbed).";

function formatMissedInstallments(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) return "—";
  return numbers.join(" + ");
}

function phoneTelHref(phone) {
  const digits = String(phone ?? "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

function StudentPhoneValue({ phone }) {
  const trimmed = String(phone ?? "").trim();
  if (!trimmed) return "—";
  const href = phoneTelHref(trimmed);
  if (!href) return trimmed;
  return (
    <a href={href} className="text-sky-300 hover:underline">
      {trimmed}
    </a>
  );
}

function formatJourneyDate(value) {
  if (value == null || value === "") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function journeyTime(entry) {
  const parsed = Date.parse(entry?.occurredAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortJourneyNewestFirst(journey) {
  if (!Array.isArray(journey)) return [];
  return [...journey].sort((a, b) => {
    const diff = journeyTime(b) - journeyTime(a);
    if (diff !== 0) return diff;
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  });
}

function collectionCaseKey(collectionCase) {
  if (!collectionCase) return null;
  if (collectionCase.caseKey != null && collectionCase.caseKey !== "") {
    return String(collectionCase.caseKey);
  }
  return `${collectionCase.userId}:${collectionCase.planCode}`;
}

function SummaryRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-200">{children}</dd>
    </div>
  );
}

function systemEventLabel(type) {
  if (type === "miss_notification_sent") return "Miss notification (logged)";
  if (type === "second_miss_notification_sent") return "Second miss notification (logged)";
  if (type === "miss_notification_draft_ready") return "Miss email draft ready";
  if (type === "account_blocked") return "Account blocked";
  if (type === "cycle_collected") return "Payment collected";
  if (type === "cycle_cleared") return "Miss cycle cleared";
  if (type === "manual_cancellation_initiated") return "Manual cancellation initiated";
  return type || "—";
}

function JourneyEvent({ entry }) {
  const date = formatJourneyDate(entry?.occurredAt);

  if (entry?.kind === "payment") {
    const duplicateCount = Number(entry.duplicateCount) || 0;
    return (
      <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-gray-200">
        <p className="font-medium text-gray-100">
          {entry.type || "—"} · {entry.status || "—"}
        </p>
        <p className="mt-1 text-gray-400">{date}</p>
        <p className="mt-1 tabular-nums">{formatCollectionsMoney(entry.amount)}</p>
        <p className="mt-1 text-gray-400">{entry.reference || "—"}</p>
        {duplicateCount > 0 ? (
          <p className="mt-1 text-amber-300/90">
            {duplicateCount} duplicate{duplicateCount === 1 ? "" : "s"}
          </p>
        ) : null}
      </li>
    );
  }

  if (entry?.kind === "system") {
    return (
      <li className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-3 py-2.5 text-xs text-cyan-100">
        <p className="font-medium">{systemEventLabel(entry?.type)}</p>
        <p className="mt-1 text-cyan-200/70">{date}</p>
        <p className="mt-1">{entry?.summary || "—"}</p>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-gray-200">
      <p className="font-medium text-gray-100">
        {entry?.type === "policy_stage_changed"
          ? "Policy stage changed"
          : entry?.type === "call_note"
            ? "Call note"
            : entry?.type === "account_check_reminder_set"
              ? "Account check reminder set"
              : entry?.type === "account_check_reminder_completed"
                ? "Account check reminder done"
                : entry?.type || "—"}
      </p>
      <p className="mt-1 text-gray-400">{date}</p>
      <p className="mt-1 text-gray-300">{entry?.actorName || "—"}</p>
      <p className="mt-1">{entry?.summary || "—"}</p>
    </li>
  );
}

function CallLogPanel({
  open,
  studentLabel,
  summary,
  onSummaryChange,
  onSubmit,
  submitting,
  disabled,
  noteFieldRef,
}) {
  if (!open) return null;

  return (
    <section
      id={CALL_PANEL_ID}
      aria-label="Log call"
      className="border-b border-emerald-500/30 bg-emerald-950/30 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-emerald-100">Log call</h3>
          <p className="mt-0.5 text-[11px] text-emerald-200/75">
            {studentLabel ? `Student: ${studentLabel}` : "Record what was discussed on the call."}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-emerald-200/60">
        Switch tel integration coming soon — call summary and transcript will appear here automatically.
      </p>
      <form className="mt-3" onSubmit={onSubmit}>
        <label htmlFor={NOTE_FIELD_ID} className="block text-[11px] text-emerald-200/70 mb-1">
          Call note
        </label>
        <textarea
          id={NOTE_FIELD_ID}
          ref={noteFieldRef}
          value={summary}
          onChange={(event) => onSummaryChange(event.target.value)}
          rows={4}
          disabled={disabled || submitting}
          placeholder="Who you spoke to, outcome, next steps…"
          className="w-full rounded-lg border border-emerald-500/30 bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-gray-500"
        />
        <div className="mt-3 flex items-center justify-end">
          <button
            type="submit"
            disabled={disabled || submitting || !summary.trim()}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save call note"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ReminderPanel({
  open,
  studentLabel,
  remindOn,
  note,
  onRemindOnChange,
  onNoteChange,
  onSubmit,
  submitting,
  disabled,
  dateFieldRef,
  existingReminder,
}) {
  if (!open) return null;

  return (
    <section
      id={REMINDER_PANEL_ID}
      aria-label="Set account check reminder"
      className="border-b border-violet-500/30 bg-violet-950/30 px-4 py-3"
    >
      <div>
        <h3 className="text-sm font-semibold text-violet-100">Account check reminder</h3>
        <p className="mt-0.5 text-[11px] text-violet-200/75">
          {studentLabel
            ? `Schedule when to re-check ${studentLabel}.`
            : "Pick a date to follow up on this account."}
        </p>
        {existingReminder ? (
          <p className="mt-1 text-[11px] text-violet-200/90">
            Current reminder: {formatReminderDate(existingReminder.remindOn)}
            {existingReminder.note ? ` · ${existingReminder.note}` : ""}
          </p>
        ) : null}
      </div>
      <form className="mt-3 space-y-2" onSubmit={onSubmit}>
        <div>
          <label htmlFor={REMINDER_DATE_FIELD_ID} className="block text-[11px] text-violet-200/70 mb-1">
            Check again on
          </label>
          <input
            id={REMINDER_DATE_FIELD_ID}
            ref={dateFieldRef}
            type="date"
            value={remindOn}
            onChange={(event) => onRemindOnChange(event.target.value)}
            disabled={disabled || submitting}
            className="w-full rounded-lg border border-violet-500/30 bg-white/10 px-2.5 py-1.5 text-xs text-white"
          />
        </div>
        <div>
          <label htmlFor="collection-reminder-note" className="block text-[11px] text-violet-200/70 mb-1">
            Reminder note
          </label>
          <textarea
            id="collection-reminder-note"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={3}
            disabled={disabled || submitting}
            placeholder="Why you are checking back, what to verify…"
            className="w-full rounded-lg border border-violet-500/30 bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-gray-500"
          />
        </div>
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={disabled || submitting || !remindOn.trim()}
            className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium disabled:opacity-50"
          >
            {submitting ? "Saving…" : existingReminder ? "Update reminder" : "Save reminder"}
          </button>
        </div>
      </form>
    </section>
  );
}

function defaultMissEmailCc(studentEmail, linkedPayerEmail) {
  const student = String(studentEmail ?? "").trim().toLowerCase();
  const payer = String(linkedPayerEmail ?? "").trim();
  if (!payer) return "";
  if (payer.toLowerCase() === student) return "";
  return payer;
}

function MissEmailDraftPanel({
  collectionCase,
  gmailConnected,
  disabled,
  onDraftUpdated,
  onEmailSent,
}) {
  const draft = collectionCase?.missCycle?.pendingEmailDraft;
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [bodyText, setBodyText] = useState(draft?.bodyText ?? "");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loggingManual, setLoggingManual] = useState(false);
  const [error, setError] = useState("");
  const caseKey = collectionCaseKey(collectionCase);

  const studentEmail = collectionCase?.student?.email || "";
  const defaultCc = defaultMissEmailCc(studentEmail, collectionCase?.student?.linkedPayerEmail);
  const [cc, setCc] = useState(draft?.cc ?? defaultCc);

  useEffect(() => {
    setSubject(draft?.subject ?? "");
    setBodyText(draft?.bodyText ?? "");
    setCc(draft?.cc ?? defaultCc);
    setError("");
  }, [caseKey, draft?.subject, draft?.bodyText, draft?.cc, draft?.updatedAt, defaultCc]);

  if (!draft || collectionCase?.missCycle?.notificationSentAt) return null;

  const trimmedSubject = subject.trim();
  const trimmedBody = bodyText.trim();
  const trimmedCc = cc.trim();
  const canSave = Boolean(trimmedSubject && trimmedBody) && !saving && !sending && !loggingManual && !disabled;
  const canSend = canSave && gmailConnected && Boolean(studentEmail) && !sending && !saving && !loggingManual && !disabled;
  const canLogManual =
    canSave && Boolean(studentEmail) && !loggingManual && !sending && !saving && !disabled;
  const draftLabel =
    draft.emailKind === "second_miss" ? "Second miss email draft" : "First miss email draft";

  async function handleSave(event) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const result = await patchFinanceCollectionEmailDraft(
        collectionCase.userId,
        collectionCase.planCode,
        { subject: trimmedSubject, bodyText: trimmedBody, cc: trimmedCc }
      );
      if (!result?.success) {
        setError(result?.message || "Failed to save draft");
        return;
      }
      onDraftUpdated?.(result);
    } catch (err) {
      setError(toCollectionsApiError(err, "Failed to save draft").message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError("");
    try {
      const result = await postFinanceCollectionSendEmail(
        collectionCase.userId,
        collectionCase.planCode,
        {
          subject: trimmedSubject,
          bodyText: trimmedBody,
          studentEmail,
          cc: trimmedCc,
          arrearsCents: collectionCase.arrearsCents,
        }
      );
      if (!result?.success) {
        setError(result?.message || "Failed to send email");
        return;
      }
      onEmailSent?.(result);
    } catch (err) {
      setError(toCollectionsApiError(err, "Failed to send email").message);
    } finally {
      setSending(false);
    }
  }

  async function handleLogManualSent() {
    if (!canLogManual) return;
    setLoggingManual(true);
    setError("");
    try {
      const result = await postFinanceCollectionEmailSentManually(
        collectionCase.userId,
        collectionCase.planCode,
        {
          subject: trimmedSubject,
          bodyText: trimmedBody,
          studentEmail,
          arrearsCents: collectionCase.arrearsCents,
        }
      );
      if (!result?.success) {
        setError(result?.message || "Failed to log manually sent email");
        return;
      }
      onEmailSent?.(result);
    } catch (err) {
      setError(toCollectionsApiError(err, "Failed to log manually sent email").message);
    } finally {
      setLoggingManual(false);
    }
  }

  return (
    <section className="mt-5 rounded-lg border border-amber-500/40 bg-amber-950/20 px-3 py-3">
      <h3 className="text-sm font-semibold text-amber-100">{draftLabel}</h3>
      <p className="mt-1 text-[11px] text-amber-200/80">
        To: {studentEmail || "—"}
        {!gmailConnected ? " · Connect Gmail on the board before sending." : ""}
      </p>
      <form className="mt-3 space-y-2" onSubmit={handleSave}>
        <div>
          <label className="block text-[11px] text-amber-200/70 mb-1">CC</label>
          <input
            type="text"
            value={cc}
            onChange={(event) => setCc(event.target.value)}
            placeholder="Payer email (optional)"
            disabled={disabled || saving || sending || loggingManual}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40"
          />
        </div>
        <div>
          <label className="block text-[11px] text-amber-200/70 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={disabled || saving || sending || loggingManual}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs text-white"
          />
        </div>
        <div>
          <label className="block text-[11px] text-amber-200/70 mb-1">Body</label>
          <textarea
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
            rows={10}
            disabled={disabled || saving || sending || loggingManual}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs text-white"
          />
        </div>
        {error ? (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="submit"
            disabled={!canSave}
            className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={!canLogManual}
            onClick={handleLogManualSent}
            className="px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-xs text-emerald-100 disabled:opacity-50"
          >
            {loggingManual ? "Logging…" : "Email sent manually"}
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={handleSend}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function CollectionJourneyDrawer({
  collectionCase,
  onClose,
  onEventCreated,
  onStageUpdated,
  onCancelInitiated,
  onEmailDraftUpdated,
  onEmailSent,
  onReminderUpdated,
  gmailConnected = false,
}) {
  const [summary, setSummary] = useState("");
  const [callPanelOpen, setCallPanelOpen] = useState(false);
  const [reminderPanelOpen, setReminderPanelOpen] = useState(false);
  const [remindOn, setRemindOn] = useState(tomorrowDateInputValue());
  const [reminderNote, setReminderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const savingReminderRef = useRef(false);
  const cancellingRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const callNoteFieldRef = useRef(null);
  const reminderDateFieldRef = useRef(null);
  const caseKey = collectionCaseKey(collectionCase);
  const prevCaseKeyRef = useRef(caseKey);
  const pendingReminder = collectionCase?.pendingReminder ?? null;

  useLayoutEffect(() => {
    if (prevCaseKeyRef.current === caseKey) return;
    prevCaseKeyRef.current = caseKey;
    requestGenerationRef.current += 1;
    submittingRef.current = false;
    savingReminderRef.current = false;
    cancellingRef.current = false;
    setSummary("");
    setRemindOn(pendingReminder?.remindOn || tomorrowDateInputValue());
    setReminderNote(pendingReminder?.note || "");
    setError("");
    setCallPanelOpen(false);
    setReminderPanelOpen(false);
    setSubmitting(false);
    setSavingReminder(false);
    setCancelling(false);
  }, [caseKey, pendingReminder?.note, pendingReminder?.remindOn]);

  useEffect(() => {
    if (!callPanelOpen) return undefined;
    const timer = window.setTimeout(() => callNoteFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [callPanelOpen, caseKey]);

  useEffect(() => {
    if (!reminderPanelOpen) return undefined;
    const timer = window.setTimeout(() => reminderDateFieldRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [reminderPanelOpen, caseKey]);

  useEffect(() => {
    setRemindOn(pendingReminder?.remindOn || tomorrowDateInputValue());
    setReminderNote(pendingReminder?.note || "");
  }, [caseKey, pendingReminder?.remindOn, pendingReminder?.note]);

  useEffect(() => {
    if (!collectionCase) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [collectionCase, onClose]);

  if (!collectionCase) return null;

  const student = collectionCase.student || {};
  const trimmed = summary.trim();
  const showCancel = canInitiateManualCancel(collectionCase);
  const showCancelledSummary = collectionCase.missCycle?.status === "cancelled";
  const secondMissWindow = formatSecondMissWindow(collectionCase.missCycle);

  async function handleCancelConfirm({ finalArrearsCents, cancellationFeeCents }) {
    if (cancellingRef.current || !showCancel) return;

    const generation = requestGenerationRef.current;
    cancellingRef.current = true;
    setCancelling(true);
    setError("");
    try {
      const result = await postFinanceCollectionCancel(
        collectionCase.userId,
        collectionCase.planCode,
        { finalArrearsCents, cancellationFeeCents }
      );
      if (generation !== requestGenerationRef.current) return;
      if (!result?.success) {
        setError(result?.message || "Failed to initiate manual cancellation");
        return;
      }
      onCancelInitiated?.(result);
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      setError(toCollectionsApiError(err, "Failed to initiate manual cancellation").message);
    } finally {
      if (generation !== requestGenerationRef.current) return;
      cancellingRef.current = false;
      setCancelling(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!trimmed || submittingRef.current) return;
    const generation = requestGenerationRef.current;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const result = await postFinanceCollectionEvent(collectionCase.userId, collectionCase.planCode, {
        type: "call_note",
        summary: trimmed,
      });
      if (generation !== requestGenerationRef.current) return;
      if (!result?.success) {
        setError(result?.message || "Failed to create collection event");
        return;
      }
      onEventCreated?.(result.event);
      setSummary("");
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      setError(toCollectionsApiError(err, "Failed to create collection event").message);
    } finally {
      if (generation !== requestGenerationRef.current) return;
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleReminderSubmit(event) {
    event.preventDefault();
    const trimmedDate = remindOn.trim();
    if (!trimmedDate || savingReminderRef.current) return;
    const generation = requestGenerationRef.current;
    savingReminderRef.current = true;
    setSavingReminder(true);
    setError("");
    try {
      const result = await postFinanceCollectionReminder(
        collectionCase.userId,
        collectionCase.planCode,
        {
          remindOn: trimmedDate,
          note: reminderNote.trim(),
        }
      );
      if (generation !== requestGenerationRef.current) return;
      if (!result?.success) {
        setError(result?.message || "Failed to save reminder");
        return;
      }
      onReminderUpdated?.(result);
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      setError(toCollectionsApiError(err, "Failed to save reminder").message);
    } finally {
      if (generation !== requestGenerationRef.current) return;
      savingReminderRef.current = false;
      setSavingReminder(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-lg flex-col border-l border-white/15 bg-gray-900 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 id={TITLE_ID} className="text-lg font-semibold text-white">
          Collection journey
        </h2>
        <div className="flex items-center gap-1">
          {collectionCase.userId ? (
            <Link
              to={`/student-profile/${collectionCase.userId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open student profile"
              title="Open student profile"
              className="rounded-lg p-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-sky-200"
            >
              <FiUser className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
          <button
            type="button"
            aria-label="Log call"
            aria-expanded={callPanelOpen}
            aria-controls={CALL_PANEL_ID}
            title={
              student.phonenumber?.trim()
                ? `Log call note · ${student.phonenumber.trim()}`
                : "Log call note (Switch tel coming soon)"
            }
            onClick={() => setCallPanelOpen((open) => !open)}
            className={`rounded-lg p-2 text-sm transition-colors ${
              callPanelOpen
                ? "bg-emerald-600/30 text-emerald-200"
                : "text-gray-400 hover:bg-white/5 hover:text-emerald-200"
            }`}
          >
            <FiPhone className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Set account check reminder"
            aria-expanded={reminderPanelOpen}
            aria-controls={REMINDER_PANEL_ID}
            title="Set a reminder to check this account again"
            onClick={() => setReminderPanelOpen((open) => !open)}
            className={`rounded-lg p-2 text-sm transition-colors ${
              reminderPanelOpen || pendingReminder
                ? "bg-violet-600/30 text-violet-200"
                : "text-gray-400 hover:bg-white/5 hover:text-violet-200"
            }`}
          >
            <FiBell className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>

      <CallLogPanel
        open={callPanelOpen}
        studentLabel={student.username || student.email || ""}
        summary={summary}
        onSummaryChange={setSummary}
        onSubmit={handleSubmit}
        submitting={submitting}
        disabled={cancelling}
        noteFieldRef={callNoteFieldRef}
      />

      <ReminderPanel
        open={reminderPanelOpen}
        studentLabel={student.username || student.email || ""}
        remindOn={remindOn}
        note={reminderNote}
        onRemindOnChange={setRemindOn}
        onNoteChange={setReminderNote}
        onSubmit={handleReminderSubmit}
        submitting={savingReminder}
        disabled={submitting || cancelling}
        dateFieldRef={reminderDateFieldRef}
        existingReminder={pendingReminder}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SummaryRow label="Student">{student.username || "—"}</SummaryRow>
          <SummaryRow label="Email">{student.email || "—"}</SummaryRow>
          <SummaryRow label="Phone">
            <StudentPhoneValue phone={student.phonenumber} />
          </SummaryRow>
          <SummaryRow label="Student number">{student.studentNumber || "—"}</SummaryRow>
          <SummaryRow label="Plan">{collectionCase.planName || "—"}</SummaryRow>
          <SummaryRow label="Plan code">{collectionCase.planCode || "—"}</SummaryRow>
          <SummaryRow label="Plan type">{collectionCase.planType || "—"}</SummaryRow>
          <SummaryRow label="Arrears">{formatCollectionsMoney(collectionCase.arrearsCents)}</SummaryRow>
          <SummaryRow label="Policy stage">
            <PolicyStageSelect
              collectionCase={collectionCase}
              onStageUpdated={(update) => {
                onStageUpdated?.(update);
                onEventCreated?.({
                  ...update.event,
                  userId: collectionCase.userId,
                  planCode: collectionCase.planCode,
                });
              }}
            />
          </SummaryRow>
          <SummaryRow label="Missed instalments">
            {formatMissedInstallments(collectionCase.missedInstallmentNumbers)}
          </SummaryRow>
          <SummaryRow label="Next action">{collectionCase.nextAction || "—"}</SummaryRow>
          <SummaryRow label="Check reminder">
            {pendingReminder
              ? `${formatReminderDate(pendingReminder.remindOn)}${pendingReminder.note ? ` · ${pendingReminder.note}` : ""}${pendingReminder.overdue ? " · overdue" : ""}`
              : "—"}
          </SummaryRow>
          <SummaryRow label="Miss cycle">
            {collectionCase.missCycle?.active || collectionCase.missCycle?.status === "cancelled"
              ? `${collectionCase.missCycle.cycleKind === "second_miss" ? "Second miss" : "First miss"} · ${collectionCase.missCycle.status}${collectionCase.missCycle.startedAt ? ` since ${formatJourneyDate(collectionCase.missCycle.startedAt)}` : ""}`
              : "—"}
          </SummaryRow>
          {secondMissWindow ? (
            <SummaryRow label="Response window">{secondMissWindow}</SummaryRow>
          ) : null}
          <SummaryRow label="Notification">
            {collectionCase.missCycle?.notificationSentAt
              ? `Sent ${formatJourneyDate(collectionCase.missCycle.notificationSentAt)}`
              : collectionCase.missCycle?.pendingEmailDraft
                ? "Draft ready — edit and send below"
                : collectionCase.missCycle?.active
                  ? "Pending"
                  : "—"}
          </SummaryRow>
          <SummaryRow label="Account blocked">
            {collectionCase.student?.accBlocked ||
            collectionCase.missCycle?.active ||
            collectionCase.missCycle?.status === "cancelled"
              ? "Yes"
              : "No"}
          </SummaryRow>
          {collectionCase.policyCohort ? (
            <SummaryRow label="Policy cohort">{collectionCase.policyCohort}</SummaryRow>
          ) : null}
          {collectionCase.classificationConfidence ? (
            <SummaryRow label="Confidence">{collectionCase.classificationConfidence}</SummaryRow>
          ) : null}
        </dl>

        <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-gray-400">
          {V1_NOTICE}
        </p>

        {showCancel || showCancelledSummary ? (
          <ManualCancellationForm
            collectionCase={collectionCase}
            disabled={!showCancel}
            submitting={cancelling}
            onSubmit={handleCancelConfirm}
          />
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <MissEmailDraftPanel
          collectionCase={collectionCase}
          gmailConnected={gmailConnected}
          disabled={submitting || cancelling}
          onDraftUpdated={onEmailDraftUpdated}
          onEmailSent={onEmailSent}
        />

        <h3 className="mt-5 text-sm font-semibold text-white">Journey</h3>
        <ol className="mt-2 flex flex-col gap-2">
          {sortJourneyNewestFirst(collectionCase.journey).map((entry, index) => (
            <JourneyEvent key={entry?.id || `journey-${index}`} entry={entry} />
          ))}
        </ol>
      </div>
    </div>
  );
}
