export const SECOND_MISS_WINDOW_EXPIRED_FILTER = "SECOND_MISS_WINDOW_EXPIRED";

export const RECOVERY_SIGNAL_YELLOW = "yellow";
export const RECOVERY_SIGNAL_GREEN = "green";
export const RECOVERY_SIGNAL_BLUE = "blue";

export const COLLECTION_RECOVERY_SIGNAL_OPTIONS = [
  ["all", "All signals"],
  [RECOVERY_SIGNAL_YELLOW, "Yellow — paid last month"],
  [RECOVERY_SIGNAL_GREEN, "Green — active recently (student)"],
  [RECOVERY_SIGNAL_BLUE, "Blue — course complete"],
];

export const COLLECTION_RECOVERY_SIGNAL_HINTS = Object.freeze({
  all: "Every case regardless of recovery likelihood signals.",
  [RECOVERY_SIGNAL_YELLOW]:
    "Paid in the previous calendar month — may pay arrears soon.",
  [RECOVERY_SIGNAL_GREEN]:
    "Logged in, active on platform, or completed course content in the past 2 weeks.",
  [RECOVERY_SIGNAL_BLUE]:
    "Bootcamp course complete (100%) — full balance still owed and recoverable.",
});

export function recoverySignalPolicyHint(signal) {
  return COLLECTION_RECOVERY_SIGNAL_HINTS[signal] ?? "";
}

export function caseHasRecoverySignal(collectionCase, signal) {
  if (!collectionCase || !signal || signal === "all") return true;
  return (collectionCase.recoverySignals ?? []).includes(signal);
}

export function countCasesByRecoverySignal(cases, signal) {
  if (!Array.isArray(cases)) return 0;
  if (!signal || signal === "all") return cases.length;
  return cases.filter((row) => caseHasRecoverySignal(row, signal)).length;
}

export function primaryRecoverySignal(collectionCase) {
  return collectionCase?.primaryRecoverySignal ?? null;
}

export function recoverySignalRowClass(collectionCase) {
  const signal = primaryRecoverySignal(collectionCase);
  if (signal === RECOVERY_SIGNAL_BLUE) return "bg-blue-500/10 hover:bg-blue-500/[0.14]";
  if (signal === RECOVERY_SIGNAL_GREEN) return "bg-emerald-500/10 hover:bg-emerald-500/[0.14]";
  if (signal === RECOVERY_SIGNAL_YELLOW) return "bg-yellow-500/10 hover:bg-yellow-500/[0.16]";
  return "hover:bg-white/[0.04]";
}

export function formatRecoverySignals(collectionCase) {
  const signals = collectionCase?.recoverySignals;
  if (!Array.isArray(signals) || signals.length === 0) return "—";
  return signals
    .map((signal) => {
      if (signal === RECOVERY_SIGNAL_YELLOW) return "Yellow";
      if (signal === RECOVERY_SIGNAL_GREEN) return "Green";
      if (signal === RECOVERY_SIGNAL_BLUE) return "Blue";
      return signal;
    })
    .join(" · ");
}

export function recoverySignalTextClass(signal) {
  if (signal === RECOVERY_SIGNAL_YELLOW) return "text-yellow-300";
  if (signal === RECOVERY_SIGNAL_GREEN) return "text-emerald-300";
  if (signal === RECOVERY_SIGNAL_BLUE) return "text-blue-300";
  return "text-gray-400";
}

function formatRecoveryDetailDate(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function greenActivityLabel(source) {
  if (source === "login") return "Last login";
  if (source === "last_active") return "Last platform session";
  if (source === "module_completed") return "Last module completed";
  return "Student activity";
}

function describeRecoverySignalDetail(detail) {
  if (!detail || typeof detail !== "object") return null;
  if (detail.kind === "payment" || detail.signal === RECOVERY_SIGNAL_YELLOW) {
    const paidOn = formatRecoveryDetailDate(detail.paidAt);
    const amount =
      detail.amountCents == null ? null : formatCollectionsMoney(detail.amountCents);
    if (paidOn && amount) return `Yellow — accepted payment ${amount} on ${paidOn} (previous calendar month).`;
    if (paidOn) return `Yellow — accepted payment on ${paidOn} (previous calendar month).`;
    return "Yellow — paid in the previous calendar month.";
  }
  if (detail.kind === "platform_activity" || detail.signal === RECOVERY_SIGNAL_GREEN) {
    const activityOn = formatRecoveryDetailDate(detail.lastActivityAt);
    const label = greenActivityLabel(detail.source);
    if (activityOn) {
      return `Green — ${label} on ${activityOn} (within past 2 weeks).`;
    }
    return "Green — recent student activity (within past 2 weeks).";
  }
  if (detail.kind === "course_complete" || detail.signal === RECOVERY_SIGNAL_BLUE) {
    const pct = Number(detail.bootcampMaxCompletedPct);
    if (detail.bootcampGraduated) {
      return "Blue — bootcamp marked passed (graduated).";
    }
    if (Number.isFinite(pct)) {
      return `Blue — bootcamp progress ${pct}% (course complete).`;
    }
    return "Blue — bootcamp course complete (100%).";
  }
  return null;
}

export function recoverySignalDetailLines(collectionCase) {
  const details = collectionCase?.recoverySignalDetails;
  if (Array.isArray(details) && details.length > 0) {
    return details.map(describeRecoverySignalDetail).filter(Boolean);
  }

  const fallback = [];
  if (collectionCase?.paidPreviousMonth) {
    fallback.push(
      describeRecoverySignalDetail({
        kind: "payment",
        paidAt: collectionCase.paidPreviousMonthAt,
        amountCents: collectionCase.paidPreviousMonthAmountCents,
      })
    );
  }
  if (collectionCase?.recentPlatformActivity) {
    fallback.push(
      describeRecoverySignalDetail({
        kind: "platform_activity",
        lastActivityAt: collectionCase.recentPlatformActivityAt,
      })
    );
  }
  if (collectionCase?.courseComplete || (collectionCase?.bootcampMaxCompletedPct ?? 0) >= 100) {
    fallback.push(
      describeRecoverySignalDetail({
        kind: "course_complete",
        bootcampMaxCompletedPct: collectionCase.bootcampMaxCompletedPct,
        bootcampGraduated: collectionCase.bootcampGraduated,
      })
    );
  }
  return fallback.filter(Boolean);
}

export function recoverySignalDetailTooltip(collectionCase) {
  const lines = recoverySignalDetailLines(collectionCase);
  return lines.length > 0 ? lines.join("\n") : "";
}

export const COLLECTION_STAGE_OPTIONS = [
  ["all", "All arrears"],
  ["FIRST_MISS", "First miss"],
  ["DAY_3_WINDOW", "Day-3 window"],
  ["SECOND_CONSECUTIVE_MISS", "2nd miss — review cancellation"],
  ["EXISTING_2_PLUS_MONTHS", "Existing 2+ months"],
  [SECOND_MISS_WINDOW_EXPIRED_FILTER, "5 business over (after 2+ miss)"],
  ["DEBT_RECOVERY", "Debt recovery"],
];

const SECOND_MISS_POLICY_STAGES = new Set(["SECOND_CONSECUTIVE_MISS", "EXISTING_2_PLUS_MONTHS"]);

/** Dropdown values for manual policy stage override (excludes queue-only filters). */
export const COLLECTION_STAGE_SELECT_OPTIONS = COLLECTION_STAGE_OPTIONS.filter(
  ([value]) => value !== "all" && value !== SECOND_MISS_WINDOW_EXPIRED_FILTER
);

export function stageLabel(stage) {
  if (stage == null || stage === "" || stage === "AUTO") return "Auto (computed)";
  const match = COLLECTION_STAGE_SELECT_OPTIONS.find(([value]) => value === stage);
  return match ? match[1] : stage;
}

export function stageSelectValue(collectionCase) {
  if (!collectionCase) return "AUTO";
  if (collectionCase.stageSource === "manual" && collectionCase.stage) {
    return collectionCase.stage;
  }
  return "AUTO";
}

/** Finance policy meaning shown on hover of each stage filter. */
export const COLLECTION_STAGE_POLICY_HINTS = Object.freeze({
  all: "Every student-plan currently in arrears on a Jan 2026+ Bootcamp or OC. One row per plan, not per missed instalment.",
  FIRST_MISS:
    "First miss in the current cycle (one consecutive overdue instalment). Account is blocked and a miss notification is logged. Cycle clears when the missed instalment is paid.",
  DAY_3_WINDOW:
    "Legacy filter — first-miss cases no longer use a day-3 window. Shown only for older data if any remain.",
  SECOND_CONSECUTIVE_MISS:
    "New cohort (started on/after 3 Aug 2026) with 2 or more consecutive missed instalments. Manga review — 5 business days before manual cancellation.",
  EXISTING_2_PLUS_MONTHS:
    "Existing cohort (started before 3 Aug 2026) with 2 or more consecutive missed instalments. Policy: review the payment plan.",
  [SECOND_MISS_WINDOW_EXPIRED_FILTER]:
    "Second miss with an active 5 business-day response window that has ended — ready for Manga manual cancellation (stub).",
  DEBT_RECOVERY:
    "Reserved for a later persisted cancellation or recovery state.",
});

export function stagePolicyHint(stage) {
  return COLLECTION_STAGE_POLICY_HINTS[stage] ?? "";
}

export function normalizeCollectionsSearchText(value) {
  if (value == null) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCollectionsMoney(cents) {
  if (cents == null || cents === "") return "—";
  const amount = Number(cents);
  if (!Number.isFinite(amount)) return "—";
  return `R ${(amount / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function caseSearchHaystack(collectionCase) {
  const student = collectionCase?.student || {};
  return normalizeCollectionsSearchText(
    [
      student.username,
      student.email,
      student.studentNumber,
      collectionCase?.planCode,
      collectionCase?.planName,
      ...cohortNamesOf(collectionCase),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function cohortsOf(collectionCase) {
  const cohorts = collectionCase?.cohorts;
  if (!Array.isArray(cohorts)) return [];
  return cohorts.filter((cohort) => String(cohort?.name ?? "").trim() !== "");
}

export function cohortNamesOf(collectionCase) {
  return cohortsOf(collectionCase).map((cohort) => String(cohort.name).trim());
}

/** Distinct cohort names across the queue, oldest intake first. */
export function cohortOptionsFromCases(cases) {
  if (!Array.isArray(cases)) return [];
  const byName = new Map();
  for (const row of cases) {
    for (const cohort of cohortsOf(row)) {
      const name = String(cohort.name).trim();
      if (!byName.has(name)) byName.set(name, cohort.startDate ?? null);
    }
  }
  return [...byName.entries()]
    .sort(([aName, aStart], [bName, bStart]) => {
      if (aStart === bStart) return aName.localeCompare(bName);
      if (aStart == null) return 1;
      if (bStart == null) return -1;
      return aStart < bStart ? -1 : 1;
    })
    .map(([name]) => name);
}

export function formatCollectionsShortDate(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isSecondMissArrearsCase(collectionCase) {
  if (!collectionCase) return false;
  const consecutive = Number(collectionCase.consecutiveMisses);
  if (!Number.isFinite(consecutive) || consecutive < 2) return false;
  return SECOND_MISS_POLICY_STAGES.has(collectionCase.stage);
}

export function isSecondMissWindowExpiredCase(collectionCase) {
  if (!isSecondMissArrearsCase(collectionCase)) return false;
  const missCycle = collectionCase.missCycle;
  if (!missCycle?.active || missCycle.cycleKind !== "second_miss") return false;
  if (missCycle.windowExpired === true) return true;
  return missCycle.workingDaysRemaining === 0;
}

export function filterCollectionCases(cases, filters) {
  if (!Array.isArray(cases)) return [];
  const opts = filters || {};
  const stage = opts.stage == null ? "" : String(opts.stage).trim();
  const stageFilter = !stage || stage.toUpperCase() === "ALL" ? null : stage;
  const cohort = opts.cohort == null ? "" : String(opts.cohort).trim();
  const cohortFilter = !cohort || cohort.toUpperCase() === "ALL" ? null : cohort;
  const recoverySignal =
    opts.recoverySignal == null ? "" : String(opts.recoverySignal).trim().toLowerCase();
  const recoverySignalFilter =
    !recoverySignal || recoverySignal === "all" ? null : recoverySignal;
  const tokens = normalizeCollectionsSearchText(opts.search).split(" ").filter(Boolean);

  return cases.filter((row) => {
    if (stageFilter === SECOND_MISS_WINDOW_EXPIRED_FILTER) {
      if (!isSecondMissWindowExpiredCase(row)) return false;
    } else if (stageFilter && row?.stage !== stageFilter) {
      return false;
    }
    if (cohortFilter && !cohortNamesOf(row).includes(cohortFilter)) return false;
    if (recoverySignalFilter && !caseHasRecoverySignal(row, recoverySignalFilter)) return false;
    if (tokens.length === 0) return true;
    const haystack = caseSearchHaystack(row);
    return tokens.every((token) => haystack.includes(token));
  });
}

export function sumCollectionArrearsCents(cases) {
  if (!Array.isArray(cases)) return 0;
  return cases.reduce((total, row) => {
    const amount = Number(row?.arrearsCents);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

function normalizeJourneyNote(event) {
  const type = event?.type ?? null;
  const isSystemNotification =
    type === "miss_notification_sent" ||
    type === "second_miss_notification_sent" ||
    type === "miss_notification_draft_ready" ||
    type === "account_blocked" ||
    type === "cycle_cleared" ||
    type === "manual_cancellation_initiated";
  return {
    id: event?.id == null ? null : String(event.id),
    kind: isSystemNotification ? "system" : "note",
    type,
    summary: event?.summary ?? null,
    occurredAt: event?.occurredAt ?? null,
    actorName: event?.actorName ?? null,
  };
}

function lastContactFromNote(note) {
  return {
    occurredAt: note.occurredAt,
    type: note.type,
    summary: note.summary,
    actorName: note.actorName,
  };
}

export function mergeCollectionEvent(collectionCase, event) {
  const note = normalizeJourneyNote(event);
  const journey = Array.isArray(collectionCase?.journey) ? collectionCase.journey : [];
  const duplicate =
    note.id &&
    journey.some((entry) => entry?.id != null && String(entry.id) === note.id);

  if (duplicate) {
    return {
      ...collectionCase,
      journey: [...journey],
    };
  }

  return {
    ...collectionCase,
    journey: [note, ...journey],
    ...(note.type === "call_note" || note.type === "policy_stage_changed"
      ? { lastContact: lastContactFromNote(note) }
      : {}),
  };
}

export function mergeCollectionReminderUpdate(collectionCase, reminder) {
  if (!collectionCase) return collectionCase;
  if (!reminder || reminder.status !== "pending") {
    return { ...collectionCase, pendingReminder: null };
  }
  return { ...collectionCase, pendingReminder: reminder };
}

export function buildFinanceCollectionsQuery(params = {}) {
  const search = new URLSearchParams();
  const stage = params.stage == null ? "" : String(params.stage).trim();
  const query = params.search == null ? "" : String(params.search).trim();
  if (stage) search.set("stage", stage);
  if (query) search.set("search", query);
  if (params.includeExcluded) search.set("includeExcluded", "true");
  return search.toString();
}

export function buildFinanceCollectionEventPath(userId, planCode) {
  return `/bootcamp/finance-collections/${encodeURIComponent(userId)}/${encodeURIComponent(
    planCode
  )}/events`;
}

export function buildFinanceCollectionStagePath(userId, planCode) {
  return `/bootcamp/finance-collections/${encodeURIComponent(userId)}/${encodeURIComponent(
    planCode
  )}/stage`;
}

export function buildFinanceCollectionCancelPath(userId, planCode) {
  return `/bootcamp/finance-collections/${encodeURIComponent(userId)}/${encodeURIComponent(
    planCode
  )}/cancel`;
}

export function formatSecondMissWindow(missCycle) {
  if (!missCycle || missCycle.cycleKind !== "second_miss") return null;
  if (missCycle.status === "cancelled") return "Cancelled";
  if (!missCycle.active) return null;
  const endDate = formatCollectionsShortDate(missCycle.responseWindowEndsAt);
  const endSuffix = endDate ? ` · ends ${endDate}` : "";
  const remaining = missCycle.workingDaysRemaining;
  if (remaining == null) {
    return endDate ? `5 business-day window · ends ${endDate}` : "5 business-day window";
  }
  if (remaining === 0) return `Window expired — manual cancel available${endSuffix}`;
  return `${remaining} business day${remaining === 1 ? "" : "s"} remaining${endSuffix}`;
}

export function formatSecondMissWindowEndDate(missCycle) {
  if (!missCycle || missCycle.cycleKind !== "second_miss" || !missCycle.active) return null;
  return formatCollectionsShortDate(missCycle.responseWindowEndsAt);
}

export function canInitiateManualCancel(collectionCase) {
  const missCycle = collectionCase?.missCycle;
  if (!missCycle || missCycle.status === "cancelled") return false;
  return missCycle.cycleKind === "second_miss" && missCycle.active === true;
}

/** Policy v4: cancellation fee on missed-payment cancellation (new cohorts only). */
export const CANCELLATION_FEE_RATE = 0.1;

function inferTotalPaymentsRequired(installments = [], totalPaymentsRequired = null) {
  const explicit = Number(totalPaymentsRequired);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;
  let maxNumber = 0;
  for (const row of installments) {
    const number = Number(row?.number);
    if (Number.isInteger(number) && number > maxNumber) maxNumber = number;
  }
  return maxNumber > 0 ? maxNumber : null;
}

function computePlanTotalFromInstallmentAmounts(installments = []) {
  if (!Array.isArray(installments) || installments.length === 0) return null;
  let total = 0;
  for (const row of installments) {
    const amount = Number(row?.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;
    total += amount;
  }
  return total > 0 ? total : null;
}

export function resolveCourseBasePriceCents(collectionCase) {
  if (!collectionCase) return null;
  if (collectionCase.courseBasePriceCents != null) {
    const fromApi = Number(collectionCase.courseBasePriceCents);
    if (Number.isFinite(fromApi) && fromApi > 0) return fromApi;
  }
  const perPayment = Number(collectionCase.installmentAmount ?? collectionCase.amount);
  const count = inferTotalPaymentsRequired(
    collectionCase.installments,
    collectionCase.totalPaymentsRequired
  );
  if (Number.isFinite(perPayment) && perPayment > 0 && count != null && count > 0) {
    return Math.round(perPayment * count);
  }
  return computePlanTotalFromInstallmentAmounts(collectionCase.installments);
}

export function computePolicyCancellationFeeCents(collectionCase) {
  if (!collectionCase) return null;
  if (collectionCase.policyFeeCents != null) {
    const fromApi = Number(collectionCase.policyFeeCents);
    if (Number.isFinite(fromApi) && fromApi >= 0) return fromApi;
  }
  return computePolicyCancellationFeeFromBase(resolveCourseBasePriceCents(collectionCase));
}

function computePolicyCancellationFeeFromBase(courseBasePriceCents) {
  const base = Number(courseBasePriceCents);
  if (!Number.isFinite(base) || base <= 0) return null;
  return Math.round(base * CANCELLATION_FEE_RATE);
}

export function computeSuggestedCancellationFeeCents(collectionCase) {
  if (!collectionCase) return null;
  if (collectionCase.suggestedCancellationFeeCents != null) {
    const fromApi = Number(collectionCase.suggestedCancellationFeeCents);
    if (Number.isFinite(fromApi) && fromApi >= 0) return fromApi;
  }
  const { policyCohort, classificationConfidence, stage } = collectionCase;
  const policyFeeCents = computePolicyCancellationFeeCents(collectionCase);
  if (policyFeeCents == null) return null;
  if (classificationConfidence === "review") return null;
  if (stage === "EXISTING_2_PLUS_MONTHS" || policyCohort === "existing") return 0;
  if (policyCohort !== "new") return null;
  return policyFeeCents;
}

export function cancellationFeePolicyHint(collectionCase) {
  if (!collectionCase) return "";
  const { policyCohort, classificationConfidence, suggestedCancellationFeeCents } = collectionCase;
  const base = resolveCourseBasePriceCents(collectionCase);
  const policyFee = computePolicyCancellationFeeCents(collectionCase);
  const suggested = computeSuggestedCancellationFeeCents(collectionCase);

  if (classificationConfidence === "review") {
    return "Payment schedule under review — confirm cancellation fee manually.";
  }
  if (base == null || policyFee == null) {
    return "Could not derive course base price — confirm cancellation fee manually.";
  }
  if (policyCohort === "existing" || suggested === 0) {
    return `Course base ${formatCollectionsMoney(base)} → 10% = ${formatCollectionsMoney(policyFee)} — waived for existing cohort (Policy v4).`;
  }
  if (policyCohort !== "new") {
    return "Policy cohort unknown — confirm cancellation fee manually.";
  }
  return `New cohort — 10% of course base ${formatCollectionsMoney(base)} = ${formatCollectionsMoney(suggestedCancellationFeeCents ?? policyFee)} per Policy v4 (editable before confirm).`;
}

export function defaultCancellationFeeCents(collectionCase) {
  const suggested = computeSuggestedCancellationFeeCents(collectionCase);
  return suggested == null ? 0 : suggested;
}

/** Display rands in an input (e.g. 320000 → "3200.00"). */
export function centsToMoneyInput(cents) {
  if (cents == null || cents === "") return "";
  const amount = Number(cents);
  if (!Number.isFinite(amount)) return "";
  return (amount / 100).toFixed(2);
}

/** Parse rands from input to integer cents; returns null when invalid. */
export function parseMoneyInputToCents(value) {
  const trimmed = String(value ?? "")
    .trim()
    .replace(/,/g, "");
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function sumCancellationDueCents(finalArrearsCents, cancellationFeeCents) {
  const arrears = Number(finalArrearsCents);
  const fee = Number(cancellationFeeCents);
  if (!Number.isFinite(arrears) || !Number.isFinite(fee) || arrears < 0 || fee < 0) return null;
  return arrears + fee;
}

function appendJourneyNote(journey, event) {
  if (!event?.id) return journey;
  const existing = Array.isArray(journey) ? journey : [];
  if (existing.some((entry) => String(entry?.id) === String(event.id))) return existing;
  return [
    {
      id: event.id,
      kind: "note",
      type: event.type,
      summary: event.summary,
      occurredAt: event.occurredAt,
      actorName: event.actorName,
    },
    ...existing,
  ];
}

export function mergeCollectionCancelUpdate(collectionCase, update) {
  if (!collectionCase || !update) return collectionCase;

  let journey = Array.isArray(collectionCase.journey) ? collectionCase.journey : [];
  journey = appendJourneyNote(journey, update.event);
  journey = appendJourneyNote(journey, update.stageEvent);

  const manualStage = update.policyStage ?? null;
  const computedStage = collectionCase.computedStage ?? collectionCase.stage;

  return {
    ...collectionCase,
    missCycle: update.missCycle ?? collectionCase.missCycle,
    computedStage,
    stage: manualStage ?? computedStage,
    stageSource: update.stageSource ?? (manualStage ? "manual" : collectionCase.stageSource),
    policyStage: manualStage,
    nextAction: update.nextAction != null ? update.nextAction : collectionCase.nextAction,
    journey,
  };
}

export function mergeCollectionEmailUpdate(collectionCase, update) {
  if (!collectionCase || !update) return collectionCase;

  let next = {
    ...collectionCase,
    missCycle: update.missCycle ?? collectionCase.missCycle,
  };

  if (update.event) {
    next = mergeCollectionEvent(next, update.event);
  }

  return next;
}

export function mergeCollectionStageUpdate(collectionCase, update) {
  if (!collectionCase || !update) return collectionCase;

  const event = update.event;
  const journey = Array.isArray(collectionCase.journey) ? collectionCase.journey : [];
  const nextJourney =
    event?.id && journey.some((entry) => String(entry?.id) === String(event.id))
      ? journey
      : event
        ? [
            {
              id: event.id,
              kind: "note",
              type: event.type,
              summary: event.summary,
              occurredAt: event.occurredAt,
              actorName: event.actorName,
            },
            ...journey,
          ]
        : journey;

  const computedStage = collectionCase.computedStage ?? collectionCase.stage;
  const manualStage = update.policyStage ?? null;
  const stage = manualStage ?? computedStage;

  return {
    ...collectionCase,
    computedStage,
    stage,
    stageSource: update.stageSource ?? (manualStage ? "manual" : "computed"),
    policyStage: manualStage,
    nextAction: update.nextAction != null ? update.nextAction : collectionCase.nextAction,
    missCycle: update.missCycle ?? collectionCase.missCycle,
    journey: nextJourney.filter((entry) => !shouldHideMissNotificationJourneyEntry(entry)),
  };
}

function shouldHideMissNotificationJourneyEntry(entry) {
  if (entry?.kind !== "system") return false;
  if (entry.type !== "miss_notification_sent" && entry.type !== "second_miss_notification_sent") {
    return false;
  }
  const summary = String(entry?.summary ?? "");
  return (
    summary.includes("[Email not sent]") ||
    summary.includes("[TEST") ||
    summary.includes("[Draft ready]")
  );
}

export function toCollectionsApiError(err, fallback) {
  return {
    success: false,
    message: err?.response?.data?.message || err?.message || fallback,
  };
}
