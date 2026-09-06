import fs from "fs";
import path from "path";
import {
  COLLECTION_STAGE_OPTIONS,
  COLLECTION_STAGE_POLICY_HINTS,
  FIRST_MISS_EMAIL_SENT_FILTER,
  SECOND_MISS_EMAIL_SENT_FILTER,
  SECOND_MISS_WINDOW_EXPIRED_FILTER,
  formatCollectionsMoney,
  filterCollectionCases,
  cohortOptionsFromCases,
  sumCollectionArrearsCents,
  mergeCollectionEvent,
  buildFinanceCollectionsQuery,
  buildFinanceCollectionEventPath,
  buildFinanceCollectionCancelPath,
  formatSecondMissWindow,
  isSecondMissWindowExpiredCase,
  canInitiateManualCancel,
  mergeCollectionCancelUpdate,
  toCollectionsApiError,
  defaultCancellationFeeCents,
  computeSuggestedCancellationFeeCents,
  computePolicyCancellationFeeCents,
  cancellationFeePolicyHint,
  countCasesByRecoverySignal,
  recoverySignalRowClass,
  recoverySignalDetailLines,
  recoverySignalDetailTooltip,
} from "./collectionsViewModel";

const COMPANY_SRC = fs.readFileSync(
  path.resolve(__dirname, "../../../api/company.js"),
  "utf8"
);

function makeCase(overrides = {}) {
  const { student: studentOverrides, ...rest } = overrides;
  return {
    caseKey: "u1:CUSTOM-aaa",
    userId: "u1",
    planCode: "CUSTOM-aaa",
    planName: "Full Stack Bootcamp",
    stage: "FIRST_MISS",
    arrearsCents: 320000,
    lastContact: null,
    journey: [],
    cohorts: [],
    student: {
      username: "Álice Nkosi",
      email: "alice@example.com",
      studentNumber: "S-1001",
      ...studentOverrides,
    },
    ...rest,
  };
}

describe("COLLECTION_STAGE_OPTIONS", () => {
  it("exposes all plus the backend stages and queue-only filters with exact labels", () => {
    expect(COLLECTION_STAGE_OPTIONS).toEqual([
      ["all", "All arrears"],
      ["FIRST_MISS", "First miss"],
      [FIRST_MISS_EMAIL_SENT_FILTER, "Email sent — waiting"],
      ["SECOND_CONSECUTIVE_MISS", "2nd miss — review cancellation"],
      ["EXISTING_2_PLUS_MONTHS", "Existing 2+ months"],
      [SECOND_MISS_EMAIL_SENT_FILTER, "2nd email sent — waiting"],
      [SECOND_MISS_WINDOW_EXPIRED_FILTER, "5 business over (after 2+ miss)"],
      ["DEBT_RECOVERY", "Debt recovery"],
    ]);
  });

  it("explains every stage in policy language", () => {
    for (const [value] of COLLECTION_STAGE_OPTIONS) {
      expect(COLLECTION_STAGE_POLICY_HINTS[value]).toEqual(expect.any(String));
      expect(COLLECTION_STAGE_POLICY_HINTS[value].length).toBeGreaterThan(40);
    }
    expect(COLLECTION_STAGE_POLICY_HINTS.SECOND_CONSECUTIVE_MISS).toMatch(/manual cancellation/i);
    expect(COLLECTION_STAGE_POLICY_HINTS.EXISTING_2_PLUS_MONTHS).toMatch(/review the payment plan/i);
    expect(COLLECTION_STAGE_POLICY_HINTS[SECOND_MISS_WINDOW_EXPIRED_FILTER]).toMatch(
      /5 business-day response window/i
    );
    expect(COLLECTION_STAGE_POLICY_HINTS[FIRST_MISS_EMAIL_SENT_FILTER]).toMatch(/longest wait/i);
    expect(COLLECTION_STAGE_POLICY_HINTS[SECOND_MISS_EMAIL_SENT_FILTER]).toMatch(/5 business-day window/i);
    expect(COLLECTION_STAGE_POLICY_HINTS.DEBT_RECOVERY).toMatch(/cancellation or recovery/i);
  });
});

describe("formatCollectionsMoney", () => {
  it("formats ZAR cents with a space after R and grouped decimals", () => {
    expect(formatCollectionsMoney(320000)).toBe("R 3,200.00");
    expect(formatCollectionsMoney(0)).toBe("R 0.00");
    expect(formatCollectionsMoney("150050")).toBe("R 1,500.50");
  });

  it("returns an em dash for null and non-numeric values", () => {
    expect(formatCollectionsMoney(null)).toBe("—");
    expect(formatCollectionsMoney(undefined)).toBe("—");
    expect(formatCollectionsMoney(Number.NaN)).toBe("—");
    expect(formatCollectionsMoney("nope")).toBe("—");
    expect(formatCollectionsMoney("")).toBe("—");
    expect(formatCollectionsMoney({})).toBe("—");
  });
});

describe("sumCollectionArrearsCents", () => {
  it("sums finite arrears and ignores junk", () => {
    expect(sumCollectionArrearsCents(null)).toBe(0);
    expect(sumCollectionArrearsCents([])).toBe(0);
    expect(
      sumCollectionArrearsCents([
        { arrearsCents: 640000 },
        { arrearsCents: 180000 },
        { arrearsCents: null },
        { arrearsCents: "nope" },
        {},
        null,
      ])
    ).toBe(820000);
  });
});

describe("filterCollectionCases", () => {
  const alice = makeCase();
  const hannah = makeCase({
    caseKey: "u9:PLN_ambiguous",
    userId: "u9",
    planCode: "PLN_ambiguous",
    planName: "Standalone Paystack",
    stage: "FIRST_MISS",
    student: {
      username: "Hannah",
      email: "HANNAH@example.com",
      studentNumber: "S-2002",
    },
  });
  const dineo = makeCase({
    caseKey: "u4:CUSTOM-ddd",
    userId: "u4",
    planCode: "CUSTOM-ddd",
    planName: "Existing cohort plan",
    stage: "EXISTING_2_PLUS_MONTHS",
    student: {
      username: "Dineo",
      email: "dineo@example.com",
      studentNumber: "S-3003",
    },
  });
  const cases = [alice, hannah, dineo];

  it("is robust to null cases, missing student fields, and absent filters", () => {
    expect(filterCollectionCases(null, { stage: "FIRST_MISS", search: "alice" })).toEqual([]);
    expect(filterCollectionCases(undefined, {})).toEqual([]);
    expect(filterCollectionCases(cases, null)).toEqual(cases);
    expect(
      filterCollectionCases(
        [{ ...alice, student: null, planName: null, planCode: null }],
        { search: "alice" }
      )
    ).toEqual([]);
  });

  it("does not restrict by stage when stage is all or absent", () => {
    expect(filterCollectionCases(cases, { stage: "all" })).toEqual(cases);
    expect(filterCollectionCases(cases, { stage: "ALL" })).toEqual(cases);
    expect(filterCollectionCases(cases, { stage: "" })).toEqual(cases);
    expect(filterCollectionCases(cases, {})).toEqual(cases);
    expect(filterCollectionCases(cases)).toEqual(cases);
  });

  it("filters by exact backend stage", () => {
    expect(filterCollectionCases(cases, { stage: "FIRST_MISS" })).toEqual([alice, hannah]);
    expect(filterCollectionCases(cases, { stage: "EXISTING_2_PLUS_MONTHS" })).toEqual([dineo]);
    expect(filterCollectionCases(cases, { stage: "DEBT_RECOVERY" })).toEqual([]);
  });

  it("sorts first-miss cases with email sent by longest wait since email", () => {
    const draftReady = makeCase({
      caseKey: "u-draft",
      missCycle: { pendingEmailDraft: { subject: "Draft" } },
      oldestDueDate: "2026-08-10T00:00:00.000Z",
    });
    const emailedLongAgo = makeCase({
      caseKey: "u-old",
      missCycle: { notificationSentAt: "2026-08-28T12:00:00.000Z" },
      oldestDueDate: "2026-08-20T00:00:00.000Z",
    });
    const emailedRecently = makeCase({
      caseKey: "u-new",
      missCycle: { notificationSentAt: "2026-09-04T12:00:00.000Z" },
      oldestDueDate: "2026-08-22T00:00:00.000Z",
    });

    expect(
      filterCollectionCases([emailedRecently, emailedLongAgo, draftReady], { stage: "FIRST_MISS" }).map(
        (row) => row.caseKey
      )
    ).toEqual(["u-draft", "u-old", "u-new"]);
  });

  it("filters first-miss email-sent cases and sorts by longest wait", () => {
    const emailedLongAgo = makeCase({
      caseKey: "u-old",
      missCycle: { notificationSentAt: "2026-08-28T12:00:00.000Z" },
    });
    const emailedRecently = makeCase({
      caseKey: "u-new",
      missCycle: { notificationSentAt: "2026-09-04T12:00:00.000Z" },
    });
    const draftReady = makeCase({
      caseKey: "u-draft",
      missCycle: { pendingEmailDraft: { subject: "Draft" } },
    });

    expect(
      filterCollectionCases([emailedRecently, draftReady, emailedLongAgo], {
        stage: FIRST_MISS_EMAIL_SENT_FILTER,
      }).map((row) => row.caseKey)
    ).toEqual(["u-old", "u-new"]);
  });

  it("filters second-miss email-sent cases and sorts by longest wait", () => {
    const emailedLongAgo = makeCase({
      caseKey: "u-old",
      stage: "SECOND_CONSECUTIVE_MISS",
      consecutiveMisses: 2,
      missCycle: {
        active: true,
        cycleKind: "second_miss",
        notificationSentAt: "2026-08-28T12:00:00.000Z",
        workingDaysRemaining: 2,
      },
    });
    const emailedRecently = makeCase({
      caseKey: "u-new",
      stage: "EXISTING_2_PLUS_MONTHS",
      consecutiveMisses: 3,
      missCycle: {
        active: true,
        cycleKind: "second_miss",
        notificationSentAt: "2026-09-04T12:00:00.000Z",
        workingDaysRemaining: 1,
      },
    });
    const draftReady = makeCase({
      caseKey: "u-draft",
      stage: "SECOND_CONSECUTIVE_MISS",
      consecutiveMisses: 2,
      missCycle: {
        active: true,
        cycleKind: "second_miss",
        pendingEmailDraft: { subject: "Draft" },
        workingDaysRemaining: 3,
      },
    });
    const windowExpired = makeCase({
      caseKey: "u-expired",
      stage: "EXISTING_2_PLUS_MONTHS",
      consecutiveMisses: 3,
      missCycle: {
        active: true,
        cycleKind: "second_miss",
        notificationSentAt: "2026-08-20T12:00:00.000Z",
        windowExpired: true,
        workingDaysRemaining: 0,
      },
    });

    expect(
      filterCollectionCases(
        [emailedRecently, draftReady, windowExpired, emailedLongAgo],
        { stage: SECOND_MISS_EMAIL_SENT_FILTER }
      ).map((row) => row.caseKey)
    ).toEqual(["u-old", "u-new"]);
  });

  it("filters expired second-miss window cases client-side", () => {
    const expiredCase = makeCase({
      caseKey: "u9:PLN_x",
      stage: "EXISTING_2_PLUS_MONTHS",
      consecutiveMisses: 3,
      missCycle: {
        active: true,
        cycleKind: "second_miss",
        windowExpired: true,
        workingDaysRemaining: 0,
      },
    });
    const inWindowCase = makeCase({
      caseKey: "u10:PLN_y",
      stage: "SECOND_CONSECUTIVE_MISS",
      consecutiveMisses: 2,
      missCycle: {
        active: true,
        cycleKind: "second_miss",
        windowExpired: false,
        workingDaysRemaining: 2,
      },
    });
    const queue = [expiredCase, inWindowCase, alice];
    expect(
      filterCollectionCases(queue, { stage: SECOND_MISS_WINDOW_EXPIRED_FILTER }).map(
        (row) => row.caseKey
      )
    ).toEqual(["u9:PLN_x"]);
  });

  it("matches search across name, email, student number, plan name, and plan code", () => {
    expect(filterCollectionCases(cases, { search: "alice" }).map((row) => row.caseKey)).toEqual([
      "u1:CUSTOM-aaa",
    ]);
    expect(
      filterCollectionCases(cases, { search: "HANNAH@example.com" }).map((row) => row.caseKey)
    ).toEqual(["u9:PLN_ambiguous"]);
    expect(filterCollectionCases(cases, { search: "s-1001" }).map((row) => row.caseKey)).toEqual([
      "u1:CUSTOM-aaa",
    ]);
    expect(
      filterCollectionCases(cases, { search: "Standalone Paystack" }).map((row) => row.caseKey)
    ).toEqual(["u9:PLN_ambiguous"]);
    expect(
      filterCollectionCases(cases, { search: "custom-ddd" }).map((row) => row.caseKey)
    ).toEqual(["u4:CUSTOM-ddd"]);
  });

  it("normalizes diacritics and whitespace and requires every token", () => {
    expect(
      filterCollectionCases(cases, { search: "  ÁLICE  " }).map((row) => row.caseKey)
    ).toEqual(["u1:CUSTOM-aaa"]);
    expect(
      filterCollectionCases(cases, { search: "nkosi alice" }).map((row) => row.caseKey)
    ).toEqual(["u1:CUSTOM-aaa"]);
    expect(filterCollectionCases(cases, { search: "alice dineo" })).toEqual([]);
    expect(filterCollectionCases(cases, { search: "   " })).toEqual(cases);
  });

  it("applies stage and search together", () => {
    expect(
      filterCollectionCases(cases, { stage: "FIRST_MISS", search: "alice" }).map(
        (row) => row.caseKey
      )
    ).toEqual(["u1:CUSTOM-aaa"]);
    expect(filterCollectionCases(cases, { stage: "FIRST_MISS", search: "hannah" })).toEqual([
      hannah,
    ]);
  });
});

describe("cohort filtering", () => {
  const FS = { name: "Full Stack September 2026", startDate: "2026-09-01T00:00:00.000Z" };
  const DS = { name: "Data Science February 2026", startDate: "2026-02-01T00:00:00.000Z" };

  const inFullStack = makeCase({ cohorts: [FS] });
  const inDataScience = makeCase({ caseKey: "u9:PLN_x", userId: "u9", cohorts: [DS] });
  const inBoth = makeCase({ caseKey: "u4:CUSTOM-d", userId: "u4", cohorts: [DS, FS] });
  const inNone = makeCase({ caseKey: "u7:CUSTOM-e", userId: "u7", cohorts: [] });
  const cases = [inFullStack, inDataScience, inBoth, inNone];

  it("lists each distinct cohort once, oldest intake first", () => {
    expect(cohortOptionsFromCases(cases)).toEqual([DS.name, FS.name]);
  });

  it("tolerates missing, malformed, and unnamed cohorts", () => {
    expect(cohortOptionsFromCases(null)).toEqual([]);
    expect(cohortOptionsFromCases([{ cohorts: null }, {}, null])).toEqual([]);
    expect(cohortOptionsFromCases([{ cohorts: [{ name: "  " }, { name: null }] }])).toEqual([]);
  });

  it("keeps every case when no cohort is selected", () => {
    expect(filterCollectionCases(cases, { cohort: "all" })).toEqual(cases);
    expect(filterCollectionCases(cases, { cohort: "" })).toEqual(cases);
    expect(filterCollectionCases(cases, {})).toEqual(cases);
  });

  it("keeps a case when any of its cohorts matches", () => {
    expect(filterCollectionCases(cases, { cohort: FS.name }).map((row) => row.caseKey)).toEqual([
      "u1:CUSTOM-aaa",
      "u4:CUSTOM-d",
    ]);
    expect(filterCollectionCases(cases, { cohort: DS.name }).map((row) => row.caseKey)).toEqual([
      "u9:PLN_x",
      "u4:CUSTOM-d",
    ]);
  });

  it("excludes cases with no cohort when a cohort is selected", () => {
    expect(
      filterCollectionCases(cases, { cohort: FS.name }).some((row) => row.caseKey === "u7:CUSTOM-e")
    ).toBe(false);
  });

  it("applies cohort together with stage and search", () => {
    expect(
      filterCollectionCases(cases, { cohort: FS.name, stage: "FIRST_MISS", search: "alice" }).map(
        (row) => row.caseKey
      )
    ).toEqual(["u1:CUSTOM-aaa", "u4:CUSTOM-d"]);
    expect(
      filterCollectionCases(cases, { cohort: FS.name, stage: "DEBT_RECOVERY" })
    ).toEqual([]);
  });
});

describe("mergeCollectionEvent", () => {
  const payment = {
    id: "br1",
    kind: "payment",
    type: "recurring",
    status: "rejected",
    amount: 320000,
    occurredAt: "2026-08-24T08:00:00.000Z",
    reference: "ref-br1",
    duplicateCount: 0,
  };

  const event = {
    id: "ce-1",
    type: "call_note",
    summary: "Left voicemail",
    occurredAt: "2026-08-26T07:30:00.000Z",
    actorName: "Jane Admin",
    userId: "u1",
    planCode: "CUSTOM-aaa",
  };

  it("returns a new case, inserts the note newest-first, and updates lastContact", () => {
    const collectionCase = makeCase({
      stage: "DAY_3_WINDOW",
      arrearsCents: 640000,
      journey: [payment],
      extraField: "kept",
    });
    const snapshot = JSON.parse(JSON.stringify(collectionCase));

    const merged = mergeCollectionEvent(collectionCase, event);

    expect(merged).not.toBe(collectionCase);
    expect(merged.journey).not.toBe(collectionCase.journey);
    expect(collectionCase).toEqual(snapshot);
    expect(merged.caseKey).toBe("u1:CUSTOM-aaa");
    expect(merged.stage).toBe("DAY_3_WINDOW");
    expect(merged.arrearsCents).toBe(640000);
    expect(merged.extraField).toBe("kept");
    expect(merged.journey[0]).toEqual({
      id: "ce-1",
      kind: "note",
      type: "call_note",
      summary: "Left voicemail",
      occurredAt: "2026-08-26T07:30:00.000Z",
      actorName: "Jane Admin",
    });
    expect(merged.journey[1]).toEqual(payment);
    expect(merged.lastContact).toEqual({
      occurredAt: "2026-08-26T07:30:00.000Z",
      type: "call_note",
      summary: "Left voicemail",
      actorName: "Jane Admin",
    });
  });

  it("does not insert the same event id twice", () => {
    const collectionCase = makeCase({ journey: [payment] });
    const once = mergeCollectionEvent(collectionCase, event);
    const twice = mergeCollectionEvent(once, { ...event, summary: "duplicate merge" });

    expect(twice.journey.filter((entry) => entry.id === "ce-1")).toHaveLength(1);
    expect(twice.journey[0].summary).toBe("Left voicemail");
    expect(once.journey).toHaveLength(2);
  });

  it("treats a missing journey as empty without mutating the input", () => {
    const collectionCase = makeCase({ journey: null });
    const merged = mergeCollectionEvent(collectionCase, event);
    expect(collectionCase.journey).toBeNull();
    expect(merged.journey).toHaveLength(1);
    expect(merged.journey[0].kind).toBe("note");
  });
});

describe("collections API helpers", () => {
  it("serializes only non-empty stage/search and true includeExcluded", () => {
    expect(buildFinanceCollectionsQuery()).toBe("");
    expect(buildFinanceCollectionsQuery({})).toBe("");
    expect(
      buildFinanceCollectionsQuery({ stage: "", search: "  ", includeExcluded: false })
    ).toBe("");
    expect(buildFinanceCollectionsQuery({ includeExcluded: true })).toBe("includeExcluded=true");
    expect(
      buildFinanceCollectionsQuery({
        stage: "FIRST_MISS",
        search: "alice",
        includeExcluded: true,
      })
    ).toBe("stage=FIRST_MISS&search=alice&includeExcluded=true");
  });

  it("URL-encodes both POST path segments", () => {
    expect(buildFinanceCollectionEventPath("user/1", "PLN a+")).toBe(
      `/bootcamp/finance-collections/${encodeURIComponent("user/1")}/${encodeURIComponent(
        "PLN a+"
      )}/events`
    );
    expect(buildFinanceCollectionCancelPath("user/1", "PLN a+")).toBe(
      `/bootcamp/finance-collections/${encodeURIComponent("user/1")}/${encodeURIComponent(
        "PLN a+"
      )}/cancel`
    );
  });

  it("formats second miss window and cancel eligibility", () => {
    expect(formatSecondMissWindow(null)).toBeNull();
    expect(formatSecondMissWindow({ cycleKind: "first_miss", active: true })).toBeNull();
    expect(
      formatSecondMissWindow({
        cycleKind: "second_miss",
        active: true,
        workingDaysRemaining: 3,
        responseWindowEndsAt: "2026-09-02T12:00:00.000Z",
      })
    ).toMatch(/3 business days remaining · ends 0?2 Sept 2026/);
    expect(
      formatSecondMissWindow({
        cycleKind: "second_miss",
        active: true,
        workingDaysRemaining: 0,
        responseWindowEndsAt: "2026-09-02T12:00:00.000Z",
      })
    ).toMatch(/Window expired — manual cancel available · ends 0?2 Sept 2026/);
    expect(formatSecondMissWindow({ cycleKind: "second_miss", status: "cancelled" })).toBe(
      "Cancelled"
    );

    expect(
      isSecondMissWindowExpiredCase({
        stage: "EXISTING_2_PLUS_MONTHS",
        consecutiveMisses: 2,
        missCycle: { active: true, cycleKind: "second_miss", windowExpired: true },
      })
    ).toBe(true);
    expect(
      isSecondMissWindowExpiredCase({
        stage: "FIRST_MISS",
        consecutiveMisses: 1,
        missCycle: { active: true, cycleKind: "second_miss", windowExpired: true },
      })
    ).toBe(false);

    expect(
      canInitiateManualCancel({
        missCycle: { cycleKind: "second_miss", active: true, status: "active" },
      })
    ).toBe(true);
    expect(
      canInitiateManualCancel({
        missCycle: { cycleKind: "second_miss", status: "cancelled" },
      })
    ).toBe(false);

    const merged = mergeCollectionCancelUpdate(
      { userId: "u1", planCode: "P1", journey: [], stage: "EXISTING_2_PLUS_MONTHS" },
      {
        missCycle: { status: "cancelled", cycleKind: "second_miss", finalArrearsCents: 500000 },
        policyStage: "DEBT_RECOVERY",
        stageSource: "manual",
        nextAction: "Debt recovery — pursue final balance and cancellation fee",
        event: {
          id: "e1",
          type: "manual_cancellation_initiated",
          summary: "stub",
          occurredAt: "2026-08-10T12:00:00.000Z",
          actorName: "Manga",
        },
        stageEvent: {
          id: "e2",
          type: "policy_stage_changed",
          summary: "Policy stage set to DEBT_RECOVERY",
          occurredAt: "2026-08-10T12:00:01.000Z",
          actorName: "Manga",
        },
      }
    );
    expect(merged.missCycle.status).toBe("cancelled");
    expect(merged.stage).toBe("DEBT_RECOVERY");
    expect(merged.journey).toHaveLength(2);
  });

  it("filters collection cases by recovery signal", () => {
    const cases = [
      { caseKey: "a", recoverySignals: ["yellow"] },
      { caseKey: "b", recoverySignals: ["green", "yellow"] },
      { caseKey: "c", recoverySignals: ["blue"] },
      { caseKey: "d", recoverySignals: [] },
    ];
    expect(filterCollectionCases(cases, { recoverySignal: "yellow" }).map((row) => row.caseKey)).toEqual([
      "a",
      "b",
    ]);
    expect(filterCollectionCases(cases, { recoverySignal: "green" }).map((row) => row.caseKey)).toEqual(["b"]);
    expect(filterCollectionCases(cases, { recoverySignal: "blue" }).map((row) => row.caseKey)).toEqual(["c"]);
    expect(countCasesByRecoverySignal(cases, "yellow")).toBe(2);
    expect(recoverySignalRowClass({ primaryRecoverySignal: "blue" })).toMatch(/blue-500/);
  });

  it("describes recovery signal activity for tooltips", () => {
    const lines = recoverySignalDetailLines({
      recoverySignalDetails: [
        {
          signal: "green",
          kind: "platform_activity",
          lastActivityAt: "2026-08-20T08:07:15.427Z",
          source: "login",
        },
      ],
    });
    expect(lines[0]).toMatch(/Green — Last login on/);
    expect(lines[0]).toMatch(/within past 2 weeks/);

    const tooltip = recoverySignalDetailTooltip({
      recoverySignalDetails: [
        {
          signal: "yellow",
          kind: "payment",
          paidAt: "2026-07-20T00:00:00.000Z",
          amountCents: 500000,
        },
        {
          signal: "blue",
          kind: "course_complete",
          bootcampMaxCompletedPct: 100,
          bootcampGraduated: true,
        },
      ],
    });
    expect(tooltip).toMatch(/Yellow — accepted payment R 5,000.00/);
    expect(tooltip).toMatch(/Blue — bootcamp marked passed/);
  });

  it("derives cancellation fee from policy fields on the case", () => {
    expect(
      defaultCancellationFeeCents({
        policyCohort: "new",
        classificationConfidence: "high",
        courseBasePriceCents: 1600000,
        suggestedCancellationFeeCents: 160000,
      })
    ).toBe(160000);
    expect(
      defaultCancellationFeeCents({
        policyCohort: "existing",
        classificationConfidence: "high",
        courseBasePriceCents: 1600000,
        suggestedCancellationFeeCents: 0,
      })
    ).toBe(0);
    expect(
      computeSuggestedCancellationFeeCents({
        policyCohort: "new",
        classificationConfidence: "high",
        courseBasePriceCents: 1000000,
      })
    ).toBe(100000);
    expect(
      cancellationFeePolicyHint({
        policyCohort: "new",
        classificationConfidence: "high",
        courseBasePriceCents: 1600000,
        policyFeeCents: 160000,
        suggestedCancellationFeeCents: 160000,
        stage: "SECOND_CONSECUTIVE_MISS",
      })
    ).toMatch(/10% of course base/);
    expect(
      cancellationFeePolicyHint({
        policyCohort: "existing",
        classificationConfidence: "high",
        courseBasePriceCents: 1600000,
        policyFeeCents: 160000,
        suggestedCancellationFeeCents: 0,
        stage: "EXISTING_2_PLUS_MONTHS",
      })
    ).toMatch(/waived for existing cohort/);
    expect(
      computePolicyCancellationFeeCents({
        courseBasePriceCents: 1600000,
        policyFeeCents: 160000,
      })
    ).toBe(160000);
  });

  it("preserves backend message, then err.message, then fallback", () => {
    expect(
      toCollectionsApiError({ response: { data: { message: "Not allowed" } } }, "fallback")
    ).toEqual({ success: false, message: "Not allowed" });
    expect(toCollectionsApiError({ message: "Network Error" }, "fallback")).toEqual({
      success: false,
      message: "Network Error",
    });
    expect(toCollectionsApiError({}, "Failed to load collections")).toEqual({
      success: false,
      message: "Failed to load collections",
    });
    expect(toCollectionsApiError(null, "Failed to create collection event")).toEqual({
      success: false,
      message: "Failed to create collection event",
    });
  });
});

describe("company.js collections API source contract", () => {
  it("pins authenticated GET and URL-encoded POST routes with Finance error shape", () => {
    expect(COMPANY_SRC).toMatch(/export const getFinanceCollections\s*=\s*\(params\s*=\s*\{\}\)/);
    expect(COMPANY_SRC).toMatch(
      /export const postFinanceCollectionEvent\s*=\s*\(userId,\s*planCode,\s*payload\)/
    );
    expect(COMPANY_SRC).toContain("${BASE_URL}/bootcamp/finance-collections${q ? `?${q}` : \"\"}");
    expect(COMPANY_SRC).toContain(
      "`${BASE_URL}/bootcamp/finance-collections/${encodeURIComponent(userId)}/${encodeURIComponent(planCode)}/events`"
    );
    expect(COMPANY_SRC).toMatch(/export const postFinanceCollectionCancel\s*=\s*\(userId,\s*planCode,\s*payload\s*=\s*\{\}\)/);
    expect(COMPANY_SRC).toContain(
      "`${BASE_URL}/bootcamp/finance-collections/${encodeURIComponent(userId)}/${encodeURIComponent(planCode)}/cancel`"
    );
    expect(COMPANY_SRC).toMatch(/localStorage\.getItem\("TOKEN"\)/);
    expect(COMPANY_SRC).toContain('"auth-token": token');
    expect(COMPANY_SRC).toContain('if (params.stage)');
    expect(COMPANY_SRC).toContain('if (params.search)');
    expect(COMPANY_SRC).toContain('if (params.includeExcluded)');
    expect(COMPANY_SRC).toContain('search.set("includeExcluded", "true")');
    expect(COMPANY_SRC).toContain('"Content-Type": "application/json"');
    expect(COMPANY_SRC).toContain("err?.response?.data?.message || err?.message || \"Failed to load collections\"");
    expect(COMPANY_SRC).toContain(
      "err?.response?.data?.message || err?.message || \"Failed to create collection event\""
    );
    expect(COMPANY_SRC).toContain(".then((res) => res.data)");
  });
});
