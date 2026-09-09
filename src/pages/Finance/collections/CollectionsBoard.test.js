import "@testing-library/jest-dom";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  COLLECTION_STAGE_OPTIONS,
  COLLECTION_STAGE_POLICY_HINTS,
  FIRST_MISS_EMAIL_SENT_FILTER,
  SECOND_MISS_EMAIL_SENT_FILTER,
  SECOND_MISS_WINDOW_EXPIRED_FILTER,
  formatCollectionsMoney,
} from "./collectionsViewModel";
import CollectionsBoard from "./CollectionsBoard";
import Finance from "../index";
import {
  getFinanceCollections,
  postFinanceCollectionEvent,
  getFinanceSummaryWithPolling,
  getFinanceSummary,
  getFinancePendingEftSubmissions,
  getFinanceCollectionsGmailStatus,
  getFinanceCollectionReminders,
  getFinanceCollectionCollected,
  postFinanceCollectionCollectedApprove,
  getFinanceCollectionsGmailAuthUrl,
  postFinanceCollectionsGmailDisconnect,
} from "../../../api/company";

jest.mock("../../../api/company", () => ({
  getFinanceCollections: jest.fn(),
  getFinanceCollectionReminders: jest.fn(),
  getFinanceCollectionCollected: jest.fn(),
  postFinanceCollectionCollectedApprove: jest.fn(),
  postFinanceCollectionEvent: jest.fn(),
  getFinanceSummaryWithPolling: jest.fn(),
  getFinanceSummary: jest.fn(),
  getFinanceAttentionRejected: jest.fn(),
  getFinancePendingEftSubmissions: jest.fn(),
  getFinanceCollectionsGmailStatus: jest.fn(),
  getFinanceCollectionsGmailAuthUrl: jest.fn(),
  postFinanceCollectionsGmailDisconnect: jest.fn(),
}));

jest.mock("../../../api/student", () => ({
  updateStudentFinanceExclude: jest.fn(),
  blockUser: jest.fn(),
  unblockUser: jest.fn(),
  getEftSubmissionProofUrl: jest.fn(),
  approveEftSubmission: jest.fn(),
  rejectEftSubmission: jest.fn(),
}));

jest.mock("../../../store/UserProvider", () => ({
  useUserStore: () => ({ user: { role: "COMPANY_ADMIN", company_username: "Jane Admin" } }),
}));

jest.mock("react-chartjs-2", () => ({
  Line: () => null,
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const FS_COHORT = { name: "Full Stack September 2026", startDate: "2026-09-01T00:00:00.000Z" };
const DS_COHORT = { name: "Data Science February 2026", startDate: "2026-02-01T00:00:00.000Z" };
const OC_COHORT = { name: "OC January 2026", startDate: "2026-01-20T00:00:00.000Z" };

function makeCase(overrides = {}) {
  const { student: studentOverrides, ...rest } = overrides;
  return {
    cohorts: [FS_COHORT],
    caseKey: "u1:CUSTOM-aaa",
    userId: "u1",
    planCode: "CUSTOM-aaa",
    planName: "Full Stack Bootcamp",
    planType: "CustomPaymentPlan",
    stage: "SECOND_CONSECUTIVE_MISS",
    arrearsCents: 640000,
    missedInstallmentNumbers: [4, 5],
    consecutiveMisses: 2,
    oldestDueDate: "2026-07-15T12:00:00.000Z",
    daysOverdue: 24,
    nextAction: "5 business days to respond — Manga may manually cancel after window",
    policyCohort: "new",
    classificationConfidence: "high",
    lastContact: null,
    journey: [],
    recoverySignals: [],
    primaryRecoverySignal: null,
    paidPreviousMonth: false,
    recentPlatformActivity: false,
    courseComplete: false,
    student: {
      username: "Álice Nkosi",
      email: "alice@example.com",
      studentNumber: "S-1001",
      ...studentOverrides,
    },
    ...rest,
  };
}

function makeBongi(overrides = {}) {
  return makeCase({
    caseKey: "u2:CUSTOM-bbb",
    userId: "u2",
    planCode: "CUSTOM-bbb",
    planName: "Data Science Bootcamp",
    cohorts: [DS_COHORT],
    stage: "FIRST_MISS",
    arrearsCents: 180000,
    missedInstallmentNumbers: [2],
    consecutiveMisses: 1,
    oldestDueDate: "2026-08-20T12:00:00.000Z",
    daysOverdue: 4,
    nextAction: "Within 3-working-day response window",
    policyCohort: "existing",
    classificationConfidence: "high",
    student: {
      username: "Bongi Mokoena",
      email: "bongi@example.com",
      studentNumber: "S-2002",
    },
    ...overrides,
  });
}

function makeHannah(overrides = {}) {
  return makeCase({
    caseKey: "u3:PLN_ambiguous",
    userId: "u3",
    planCode: "PLN_ambiguous",
    planName: "Standalone Paystack",
    cohorts: [],
    stage: "FIRST_MISS",
    arrearsCents: 320000,
    missedInstallmentNumbers: [1],
    consecutiveMisses: 1,
    oldestDueDate: "2026-08-01T12:00:00.000Z",
    daysOverdue: 18,
    nextAction: "Payment schedule review required",
    policyCohort: "unknown",
    classificationConfidence: "review",
    student: {
      username: "Hannah",
      email: "HANNAH@example.com",
      studentNumber: "S-3003",
    },
    ...overrides,
  });
}

function makeDineo() {
  return makeCase({
    caseKey: "u4:CUSTOM-ddd",
    userId: "u4",
    planCode: "CUSTOM-ddd",
    planName: "Existing cohort plan",
    cohorts: [DS_COHORT, FS_COHORT],
    stage: "EXISTING_2_PLUS_MONTHS",
    arrearsCents: 500000,
    missedInstallmentNumbers: [3, 4],
    consecutiveMisses: 2,
    oldestDueDate: "not-a-date",
    daysOverdue: null,
    nextAction: "Existing-cohort follow-up required",
    policyCohort: "existing",
    classificationConfidence: "high",
    student: {
      username: "Dineo",
      email: "dineo@example.com",
      studentNumber: "S-4004",
    },
  });
}

function makeEthan() {
  return makeCase({
    caseKey: "u5:CUSTOM-eee",
    userId: "u5",
    planCode: "CUSTOM-eee",
    planName: "OC plan",
    cohorts: [OC_COHORT],
    stage: "DAY_3_WINDOW",
    arrearsCents: 220000,
    missedInstallmentNumbers: [6],
    consecutiveMisses: 1,
    oldestDueDate: "2026-08-18T12:00:00.000Z",
    daysOverdue: 6,
    nextAction: "Day-3 follow-up required",
    policyCohort: "new",
    classificationConfidence: "high",
    lastContact: {
      occurredAt: "2026-08-20T10:00:00.000Z",
      type: "call_note",
      summary: "Earlier follow-up",
      actorName: "Sam Ops",
    },
    student: {
      username: "Ethan",
      email: "ethan@example.com",
      studentNumber: "S-5005",
    },
  });
}

function makeExcluded() {
  return makeCase({
    caseKey: "u9:CUSTOM-zzz",
    userId: "u9",
    planCode: "CUSTOM-zzz",
    planName: "Test plan",
    stage: "FIRST_MISS",
    arrearsCents: 100000,
    missedInstallmentNumbers: [2],
    consecutiveMisses: 1,
    oldestDueDate: "2026-08-22T12:00:00.000Z",
    daysOverdue: 2,
    nextAction: "Within 3-working-day response window",
    student: {
      username: "Excluded Test",
      email: "test@example.com",
      studentNumber: "S-9999",
    },
  });
}

const ZERO_STAGE_COUNTS = {
  FIRST_MISS: 0,
  DAY_3_WINDOW: 0,
  SECOND_CONSECUTIVE_MISS: 0,
  EXISTING_2_PLUS_MONTHS: 0,
  DEBT_RECOVERY: 0,
};

function makeCounts(overrides = {}) {
  const { byStage: byStageOverrides, ...rest } = overrides;
  return {
    total: 8,
    ...rest,
    byStage: {
      ...ZERO_STAGE_COUNTS,
      FIRST_MISS: 2,
      DAY_3_WINDOW: 1,
      SECOND_CONSECUTIVE_MISS: 1,
      EXISTING_2_PLUS_MONTHS: 1,
      DEBT_RECOVERY: 0,
      ...byStageOverrides,
    },
  };
}

const BACKEND_WARNINGS = [
  "Working-day calculations exclude weekends but do not exclude South African public holidays.",
  "1 visible case(s) require payment schedule review because the plan schedule could not be resolved safely.",
];

function makeSuccessPayload(overrides = {}) {
  return {
    success: true,
    cases: [makeCase(), makeBongi(), makeHannah(), makeDineo(), makeEthan()],
    counts: makeCounts(),
    warnings: BACKEND_WARNINGS,
    ...overrides,
  };
}

function renderBoard(includeExcluded = false) {
  const view = render(
    <MemoryRouter>
      <CollectionsBoard includeExcluded={includeExcluded} />
    </MemoryRouter>
  );
  return {
    ...view,
    rerenderBoard(nextExcluded) {
      view.rerender(
        <MemoryRouter>
          <CollectionsBoard includeExcluded={nextExcluded} />
        </MemoryRouter>
      );
    },
  };
}

async function renderLoaded(includeExcluded = false) {
  const view = renderBoard(includeExcluded);
  await screen.findByRole("columnheader", { name: "Student" });
  return view;
}

function stageButton(label) {
  return screen.getByRole("button", {
    name: (accessibleName) => accessibleName.startsWith(label),
  });
}

function dataRows() {
  const table = screen.getByRole("table");
  const body = table.querySelector("tbody");
  return within(body).getAllByRole("row").filter((row) => !row.querySelector("[colspan]"));
}

function rowFor(name) {
  return dataRows().find((row) => within(row).queryByRole("link", { name }));
}

function openCallPanelInDialog() {
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Log call" }));
}

function forbiddenBoardControls() {
  return [
    screen.queryByRole("button", { name: /auto-?cancel/i }),
    screen.queryByRole("button", { name: /switch/i }),
    screen.queryByRole("button", { name: /^email$/i }),
    screen.queryByRole("button", { name: /^block$/i }),
    screen.queryByRole("button", { name: /invoice/i }),
    screen.queryByRole("link", { name: /auto-?cancel/i }),
    screen.queryByRole("link", { name: /switch/i }),
  ];
}

beforeEach(() => {
  getFinanceCollections.mockReset();
  postFinanceCollectionEvent.mockReset();
  getFinanceCollectionsGmailStatus.mockReset();
  getFinanceCollectionReminders.mockReset();
  getFinanceCollectionCollected.mockReset();
  postFinanceCollectionCollectedApprove.mockReset();
  getFinanceCollectionsGmailAuthUrl.mockReset();
  postFinanceCollectionsGmailDisconnect.mockReset();
  getFinanceCollections.mockResolvedValue(makeSuccessPayload());
  postFinanceCollectionEvent.mockResolvedValue({ success: true, event: {} });
  getFinanceCollectionReminders.mockResolvedValue({ success: true, reminders: [] });
  getFinanceCollectionCollected.mockResolvedValue({ success: true, cases: [] });
  postFinanceCollectionCollectedApprove.mockResolvedValue({
    success: true,
    missCycle: { status: "cleared" },
  });
  getFinanceCollectionsGmailStatus.mockResolvedValue({
    success: true,
    connected: false,
    senderEmail: "accounts@zaio.io",
    allowedSenderEmails: ["accounts@zaio.io", "recruitment@zaio.io"],
    oauthConfigured: true,
  });
});

describe("CollectionsBoard", () => {
  it("shows an accessible loading state and does not treat pending data as loaded", async () => {
    const pending = deferred();
    getFinanceCollections.mockReturnValue(pending.promise);

    renderBoard(false);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/loading/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Álice Nkosi")).not.toBeInTheDocument();
    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
    expect(getFinanceCollections).toHaveBeenCalledWith({ includeExcluded: false });

    await act(async () => {
      pending.resolve(makeSuccessPayload());
    });
    expect(await screen.findByRole("link", { name: "Álice Nkosi" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("lists a paid collection on Collected and lets finance approve close", async () => {
    const collectedCase = {
      userId: "u-dean",
      planCode: "CUSTOM-dean",
      planName: "Full Stack Bootcamp",
      status: "collected",
      collectedAt: "2026-09-08T10:00:00.000Z",
      triggerInstallmentNumbers: [7, 8],
      student: { username: "Dean Zvauya", email: "deanzvauya38@gmail.com" },
    };
    getFinanceCollectionCollected.mockResolvedValue({
      success: true,
      cases: [collectedCase],
    });
    postFinanceCollectionCollectedApprove.mockImplementation(async () => {
      getFinanceCollectionCollected.mockResolvedValue({ success: true, cases: [] });
      return { success: true, missCycle: { status: "cleared" } };
    });

    await renderLoaded();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Collected cases" }));
    });
    expect(await screen.findByText("Dean Zvauya")).toBeInTheDocument();
    expect(screen.getByText("CUSTOM-dean")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Approve close/i }));
    });
    await waitFor(() => {
      expect(postFinanceCollectionCollectedApprove).toHaveBeenCalledWith("u-dean", "CUSTOM-dean");
    });
    await waitFor(() => {
      expect(screen.queryByText("Dean Zvauya")).not.toBeInTheDocument();
    });
  });

  it("opens the journey drawer from a collected case", async () => {
    getFinanceCollectionCollected.mockResolvedValue({
      success: true,
      cases: [
        {
          userId: "u-dia",
          planCode: "CUSTOM-28428d95",
          planName: "Cyber Security Analyst Aug 2026 Payment Plan",
          status: "collected",
          collectedAt: "2026-09-09T15:26:00.000Z",
          triggerInstallmentNumbers: [2],
          student: { username: "dia mouhameth", email: "dia421509@hotmail.com" },
          journey: [{ id: "ce-1", kind: "system", type: "cycle_collected", summary: "First miss collected", occurredAt: "2026-09-09T15:26:00.000Z" }],
        },
      ],
    });

    await renderLoaded();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Collected cases" }));
    });
    expect(await screen.findByText("dia mouhameth")).toBeInTheDocument();

    fireEvent.click(within(screen.getByText("dia mouhameth").closest("tr")).getByRole("button", { name: /^open$/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName(/collection journey/i);
    expect(within(dialog).getByText("dia mouhameth")).toBeInTheDocument();
    expect(within(dialog).getByText("Cyber Security Analyst Aug 2026 Payment Plan")).toBeInTheDocument();
  });

  it("renders one two-miss row, exact columns, counts including zeros, captions, and no forbidden actions", async () => {
    await renderLoaded();

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([
      "#",
      "Signal",
      "Student",
      "Bootcamp",
      "Plan",
      "Missed instalments",
      "Arrears",
      "Oldest due",
      "Days overdue",
      "Policy stage",
      "Miss cycle",
      "Next action",
      "Last contact",
      "Journey",
    ]);

    const aliceRows = dataRows().filter((row) =>
      Boolean(within(row).queryByRole("link", { name: "Álice Nkosi" }))
    );
    expect(aliceRows).toHaveLength(1);
    expect(within(aliceRows[0]).getByRole("cell", { name: "1" })).toBeInTheDocument();
    expect(aliceRows[0]).toHaveTextContent("4 + 5");
    expect(aliceRows[0]).toHaveTextContent("Full Stack Bootcamp");
    expect(aliceRows[0]).toHaveTextContent(formatCollectionsMoney(640000));
    expect(aliceRows[0].textContent).toMatch(/15 Jul 2026|Jul 15, 2026|2026-07-15/);
    expect(aliceRows[0]).toHaveTextContent("24");
    expect(aliceRows[0]).toHaveTextContent("2nd miss — review cancellation");
    expect(aliceRows[0]).toHaveTextContent(
      "5 business days to respond — Manga may manually cancel after window"
    );
    expect(aliceRows[0]).toHaveTextContent("—");
    expect(within(aliceRows[0]).getByRole("button", { name: /^open$/i })).toBeInTheDocument();

    const aliceLink = within(aliceRows[0]).getByRole("link", { name: "Álice Nkosi" });
    expect(aliceLink).toHaveAttribute("href", "/student-profile/u1");

    const dineoRow = rowFor("Dineo");
    expect(dineoRow).toHaveTextContent("—");
    expect(dineoRow).toHaveTextContent("3 + 4");

    const names = dataRows().map((row) => within(row).getByRole("link").textContent);
    expect(names).toEqual(["Álice Nkosi", "Bongi Mokoena", "Hannah", "Dineo", "Ethan"]);

    const counts = makeCounts();
    for (const [value, label] of COLLECTION_STAGE_OPTIONS) {
      const button = stageButton(label);
      const expected =
        value === "all"
          ? counts.total
          : value === SECOND_MISS_WINDOW_EXPIRED_FILTER
            ? 0
            : value === FIRST_MISS_EMAIL_SENT_FILTER
              ? 0
              : value === SECOND_MISS_EMAIL_SENT_FILTER
                ? 0
                : counts.byStage[value];
      expect(button).toHaveTextContent(String(expected));
      expect(button).toHaveAttribute("title", COLLECTION_STAGE_POLICY_HINTS[value]);
    }
    expect(stageButton("All arrears")).toHaveTextContent("8");
    expect(dataRows()).toHaveLength(5);
    expect(stageButton("Debt recovery")).toHaveTextContent("0");

    expect(screen.getByText(/working days exclude weekends but not public holidays/i)).toBeInTheDocument();
    expect(screen.getByText(/require human review/i)).toBeInTheDocument();
    expect(screen.getByText(/Connect with Google|Gmail connected/i)).toBeInTheDocument();
    expect(screen.getByText(/confirm cancellation in the journey drawer/i)).toBeInTheDocument();
    expect(screen.getByText(BACKEND_WARNINGS[0])).toBeInTheDocument();
    expect(screen.getByText(BACKEND_WARNINGS[1])).toBeInTheDocument();

    forbiddenBoardControls().forEach((node) => {
      expect(node).not.toBeInTheDocument();
    });
    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
    expect(getFinanceCollections).toHaveBeenCalledWith({ includeExcluded: false });
  });

  it("numbers visible rows from 1 and totals their arrears", async () => {
    await renderLoaded();

    const numbered = dataRows().map((row) => ({
      n: within(row).getAllByRole("cell")[0].textContent,
      name: within(row).getByRole("link").textContent,
    }));
    expect(numbered).toEqual([
      { n: "1", name: "Álice Nkosi" },
      { n: "2", name: "Bongi Mokoena" },
      { n: "3", name: "Hannah" },
      { n: "4", name: "Dineo" },
      { n: "5", name: "Ethan" },
    ]);

    const totals = screen.getByTestId("collections-totals");
    expect(totals).toHaveTextContent("5 cases");
    expect(totals).toHaveTextContent(formatCollectionsMoney(1860000));
  });

  it("renumbers and retotals after a bootcamp filter", async () => {
    await renderLoaded();

    fireEvent.change(screen.getByLabelText(/bootcamp/i), {
      target: { value: FS_COHORT.name },
    });

    const numbered = dataRows().map((row) => ({
      n: within(row).getAllByRole("cell")[0].textContent,
      name: within(row).getByRole("link").textContent,
    }));
    expect(numbered).toEqual([
      { n: "1", name: "Álice Nkosi" },
      { n: "2", name: "Dineo" },
    ]);

    const totals = screen.getByTestId("collections-totals");
    expect(totals).toHaveTextContent("2 cases");
    expect(totals).toHaveTextContent(formatCollectionsMoney(1140000));
  });

  it("hides the cash total when the visible queue is empty", async () => {
    await renderLoaded();
    fireEvent.click(stageButton("Debt recovery"));
    expect(screen.queryByTestId("collections-totals")).not.toBeInTheDocument();
  });

  it("names each student's bootcamp, listing every cohort and marking those with none", async () => {
    await renderLoaded();

    expect(rowFor("Álice Nkosi")).toHaveTextContent(FS_COHORT.name);
    expect(rowFor("Ethan")).toHaveTextContent(OC_COHORT.name);
    expect(rowFor("Dineo")).toHaveTextContent(DS_COHORT.name);
    expect(rowFor("Dineo")).toHaveTextContent(FS_COHORT.name);
    expect(rowFor("Hannah")).not.toHaveTextContent(FS_COHORT.name);
  });

  it("offers every cohort in the queue once, oldest intake first", async () => {
    await renderLoaded();

    const select = screen.getByLabelText(/bootcamp/i);
    const options = within(select).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual([
      "All bootcamps",
      OC_COHORT.name,
      DS_COHORT.name,
      FS_COHORT.name,
    ]);
  });

  it("filters rows by bootcamp client-side without refetching", async () => {
    await renderLoaded();
    expect(dataRows()).toHaveLength(5);

    const select = screen.getByLabelText(/bootcamp/i);
    fireEvent.change(select, { target: { value: FS_COHORT.name } });
    expect(dataRows()).toHaveLength(2);
    expect(rowFor("Álice Nkosi")).toBeTruthy();
    expect(rowFor("Dineo")).toBeTruthy();
    expect(rowFor("Hannah")).toBeUndefined();

    fireEvent.change(select, { target: { value: OC_COHORT.name } });
    expect(dataRows()).toHaveLength(1);
    expect(rowFor("Ethan")).toBeTruthy();

    fireEvent.change(select, { target: { value: "all" } });
    expect(dataRows()).toHaveLength(5);

    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
  });

  it("combines the bootcamp filter with stage and reports a filtered-empty queue", async () => {
    await renderLoaded();

    fireEvent.change(screen.getByLabelText(/bootcamp/i), {
      target: { value: DS_COHORT.name },
    });
    fireEvent.click(stageButton("First miss"));
    expect(dataRows()).toHaveLength(1);
    expect(rowFor("Bongi Mokoena")).toBeTruthy();

    fireEvent.click(stageButton("Debt recovery"));
    expect(screen.queryByRole("link", { name: "Bongi Mokoena" })).not.toBeInTheDocument();
    expect(screen.getByText(/no cases match the selected filters/i)).toBeInTheDocument();
  });

  it("filters rows by recovery signal client-side without refetching", async () => {
    getFinanceCollections.mockReset();
    getFinanceCollections.mockResolvedValue(
      makeSuccessPayload({
        cases: [
          makeCase({
            recoverySignals: ["yellow"],
            primaryRecoverySignal: "yellow",
            paidPreviousMonth: true,
          }),
          makeBongi({
            recoverySignals: ["green"],
            primaryRecoverySignal: "green",
            recentPlatformActivity: true,
          }),
          makeHannah({
            recoverySignals: ["blue"],
            primaryRecoverySignal: "blue",
            courseComplete: true,
            bootcampMaxCompletedPct: 100,
          }),
        ],
        counts: makeCounts({ total: 3 }),
      })
    );
    await renderLoaded();
    expect(dataRows()).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /yellow — paid last month/i }));
    expect(dataRows()).toHaveLength(1);
    expect(rowFor("Álice Nkosi")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /green — active recently/i }));
    expect(dataRows()).toHaveLength(1);
    expect(rowFor("Bongi Mokoena")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /all signals/i }));
    expect(dataRows()).toHaveLength(3);
    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
  });

  it("filters rows by stage client-side without refetching", async () => {
    await renderLoaded();
    expect(dataRows()).toHaveLength(5);

    fireEvent.click(stageButton("First miss"));
    expect(dataRows()).toHaveLength(2);
    expect(rowFor("Bongi Mokoena")).toBeTruthy();
    expect(rowFor("Hannah")).toBeTruthy();
    expect(rowFor("Álice Nkosi")).toBeUndefined();

    fireEvent.click(stageButton("All arrears"));
    expect(dataRows()).toHaveLength(5);

    fireEvent.click(stageButton("Debt recovery"));
    expect(screen.getByText(/no cases in this stage/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Álice Nkosi" })).not.toBeInTheDocument();

    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
  });

  it("applies normalized client-side search without refetching", async () => {
    await renderLoaded();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  ÁLICE  nkosi " } });
    expect(dataRows()).toHaveLength(1);
    expect(rowFor("Álice Nkosi")).toBeTruthy();
    expect(rowFor("Bongi Mokoena")).toBeUndefined();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "standalone" } });
    expect(dataRows()).toHaveLength(1);
    expect(rowFor("Hannah")).toBeTruthy();

    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
    expect(getFinanceCollections).toHaveBeenCalledWith({ includeExcluded: false });
  });

  it("distinguishes an empty queue from a combined filtered-empty state", async () => {
    getFinanceCollections.mockResolvedValue({
      success: true,
      cases: [],
      counts: makeCounts({ total: 0, byStage: ZERO_STAGE_COUNTS }),
      warnings: [],
    });
    const { unmount } = renderBoard();
    expect(await screen.findByText(/no collection cases in the queue/i)).toBeInTheDocument();
    expect(screen.queryByText(/no cases match the selected stage and search/i)).not.toBeInTheDocument();
    unmount();

    getFinanceCollections.mockResolvedValue(makeSuccessPayload());
    renderBoard();
    await screen.findByRole("link", { name: "Álice Nkosi" });
    fireEvent.click(stageButton("First miss"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dineo" } });
    expect(screen.getByText(/no cases match the selected stage and search/i)).toBeInTheDocument();
    expect(screen.queryByText(/no collection cases in the queue/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bongi Mokoena" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dineo" })).not.toBeInTheDocument();
  });

  it("opens the real journey drawer for the selected row", async () => {
    await renderLoaded();

    fireEvent.click(within(rowFor("Bongi Mokoena")).getByRole("button", { name: /^open$/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName(/collection journey/i);
    expect(within(dialog).getByText("Bongi Mokoena")).toBeInTheDocument();
    expect(within(dialog).getByText("Data Science Bootcamp")).toBeInTheDocument();
    expect(within(dialog).getByText(formatCollectionsMoney(180000))).toBeInTheDocument();
    expect(within(dialog).queryByText("Álice Nkosi")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Log call" })).toBeInTheDocument();
  });

  it("shows the API failure message and Retry repeats the current request", async () => {
    getFinanceCollections
      .mockResolvedValueOnce({ success: false, message: "Collections unavailable" })
      .mockResolvedValueOnce(makeSuccessPayload());

    renderBoard(true);

    expect(await screen.findByRole("alert")).toHaveTextContent("Collections unavailable");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
    expect(getFinanceCollections).toHaveBeenCalledWith({ includeExcluded: true });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Álice Nkosi" })).toBeInTheDocument();
    expect(getFinanceCollections).toHaveBeenCalledTimes(2);
    expect(getFinanceCollections).toHaveBeenNthCalledWith(2, { includeExcluded: true });
  });

  it("refetches when includeExcluded changes and ignores stale or unmounted responses", async () => {
    const first = deferred();
    const second = deferred();
    const third = deferred();
    getFinanceCollections
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);

    const { rerenderBoard, unmount } = renderBoard(false);
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    await waitFor(() => expect(getFinanceCollections).toHaveBeenCalledTimes(1));
    expect(getFinanceCollections).toHaveBeenNthCalledWith(1, { includeExcluded: false });

    rerenderBoard(true);
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(screen.queryByText("Álice Nkosi")).not.toBeInTheDocument();
    await waitFor(() => expect(getFinanceCollections).toHaveBeenCalledTimes(2));
    expect(getFinanceCollections).toHaveBeenNthCalledWith(2, { includeExcluded: true });

    await act(async () => {
      first.resolve(makeSuccessPayload());
    });
    expect(screen.queryByText("Álice Nkosi")).not.toBeInTheDocument();
    expect(screen.queryByText("Excluded Test")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);

    await act(async () => {
      second.resolve({
        success: true,
        cases: [makeExcluded()],
        counts: makeCounts({
          total: 1,
          byStage: { ...ZERO_STAGE_COUNTS, FIRST_MISS: 1 },
        }),
        warnings: [],
      });
    });
    expect(await screen.findByRole("link", { name: "Excluded Test" })).toBeInTheDocument();
    expect(screen.queryByText("Álice Nkosi")).not.toBeInTheDocument();

    rerenderBoard(false);
    await waitFor(() => expect(getFinanceCollections).toHaveBeenCalledTimes(3));
    expect(getFinanceCollections).toHaveBeenNthCalledWith(3, { includeExcluded: false });
    unmount();
    await act(async () => {
      third.resolve(makeSuccessPayload());
    });
  });

  it("merges a successful call note into the matching case without refetching", async () => {
    const created = {
      id: "ce-1",
      type: "call_note",
      summary: "Left voicemail",
      occurredAt: "2026-08-26T12:00:00.000Z",
      actorName: "Jane Admin",
      userId: "u1",
      planCode: "CUSTOM-aaa",
    };
    postFinanceCollectionEvent.mockResolvedValue({ success: true, event: created });
    await renderLoaded();

    fireEvent.click(within(rowFor("Álice Nkosi")).getByRole("button", { name: /^open$/i }));
    openCallPanelInDialog();
    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "  Left voicemail  " } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));

    await waitFor(() => {
      expect(rowFor("Álice Nkosi")).toHaveTextContent("Left voicemail");
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/call note/i)).toHaveValue("");
    });
    expect(rowFor("Álice Nkosi").textContent).toMatch(/26 Aug 2026|Aug 26, 2026|2026-08-26/);
    expect(within(screen.getByRole("dialog")).getByText("Left voicemail")).toBeInTheDocument();
    expect(rowFor("Bongi Mokoena")).not.toHaveTextContent("Left voicemail");
    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
    expect(postFinanceCollectionEvent).toHaveBeenCalledTimes(1);
  });

  it("does not merge a wrong-case event and only falls back to the selected case when identity is missing", async () => {
    const wrongCaseEvent = {
      id: "ce-wrong",
      type: "call_note",
      summary: "Note for Bongi",
      occurredAt: "2026-08-26T13:00:00.000Z",
      actorName: "Jane Admin",
      userId: "u2",
      planCode: "CUSTOM-bbb",
    };
    const unknownEvent = {
      id: "ce-unknown",
      type: "call_note",
      summary: "Orphan note",
      occurredAt: "2026-08-26T14:00:00.000Z",
      actorName: "Jane Admin",
      userId: "nope",
      planCode: "NOPE",
    };
    const identityLessEvent = {
      id: "ce-fallback",
      type: "call_note",
      summary: "Selected-case fallback",
      occurredAt: "2026-08-26T15:00:00.000Z",
      actorName: "Jane Admin",
    };

    postFinanceCollectionEvent
      .mockResolvedValueOnce({ success: true, event: wrongCaseEvent })
      .mockResolvedValueOnce({ success: true, event: unknownEvent })
      .mockResolvedValueOnce({ success: true, event: identityLessEvent });

    await renderLoaded();
    fireEvent.click(within(rowFor("Álice Nkosi")).getByRole("button", { name: /^open$/i }));
    openCallPanelInDialog();

    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Note for Bongi" } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));
    await waitFor(() => {
      expect(rowFor("Bongi Mokoena")).toHaveTextContent("Note for Bongi");
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/call note/i)).toHaveValue("");
    });
    expect(rowFor("Álice Nkosi")).not.toHaveTextContent("Note for Bongi");
    expect(within(screen.getByRole("dialog")).queryByText("Note for Bongi")).not.toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Álice Nkosi")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Orphan note" } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));
    await waitFor(() => {
      expect(postFinanceCollectionEvent).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/call note/i)).toHaveValue("");
    });
    expect(rowFor("Álice Nkosi")).not.toHaveTextContent("Orphan note");
    expect(rowFor("Bongi Mokoena")).not.toHaveTextContent("Orphan note");
    expect(within(screen.getByRole("dialog")).queryByText("Orphan note")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Selected-case fallback" } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));
    await waitFor(() => {
      expect(rowFor("Álice Nkosi")).toHaveTextContent("Selected-case fallback");
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/call note/i)).toHaveValue("");
    });
    expect(within(screen.getByRole("dialog")).getByText("Selected-case fallback")).toBeInTheDocument();
    expect(rowFor("Bongi Mokoena")).not.toHaveTextContent("Selected-case fallback");
    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
  });
});

describe("Finance view switch", () => {
  const MONTHLY_MARKER = /why you might see far fewer people/i;

  beforeEach(() => {
    getFinanceSummaryWithPolling.mockReset();
    getFinanceSummary.mockReset();
    getFinancePendingEftSubmissions.mockReset();
    getFinanceSummaryWithPolling.mockResolvedValue({
      success: true,
      stats: { amounts: {} },
      upcoming: [],
      paid: [],
      unpaid: [],
      range: { start: "2026-08-01", end: "2026-08-31" },
      filters: { excludingTestAccounts: true },
    });
    getFinanceSummary.mockResolvedValue({ success: true, stats: { amounts: {} } });
    getFinancePendingEftSubmissions.mockResolvedValue({ success: true, submissions: [] });
  });

  async function renderFinance() {
    const view = render(
      <MemoryRouter>
        <Finance />
      </MemoryRouter>
    );
    await screen.findByText(MONTHLY_MARKER);
    return view;
  }

  it("starts on Monthly summary and only loads collections once Collections is selected", async () => {
    await renderFinance();

    expect(screen.getByRole("button", { name: /monthly summary/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /^collections$/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.queryByRole("columnheader", { name: "Missed instalments" })).not.toBeInTheDocument();
    expect(getFinanceCollections).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^collections$/i }));

    expect(await screen.findByRole("columnheader", { name: "Missed instalments" })).toBeInTheDocument();
    expect(screen.queryByText(MONTHLY_MARKER)).not.toBeInTheDocument();
    expect(getFinanceCollections).toHaveBeenCalledTimes(1);
    expect(getFinanceCollections).toHaveBeenCalledWith({ includeExcluded: false });
    expect(await screen.findByRole("link", { name: "Álice Nkosi" })).toBeInTheDocument();
  });

  it("returns to Monthly summary without reloading the finance summary", async () => {
    await renderFinance();
    const summaryCallsAfterMount = getFinanceSummaryWithPolling.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /^collections$/i }));
    await screen.findByRole("columnheader", { name: "Missed instalments" });

    fireEvent.click(screen.getByRole("button", { name: /monthly summary/i }));

    expect(await screen.findByText(MONTHLY_MARKER)).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Missed instalments" })).not.toBeInTheDocument();
    expect(getFinanceSummaryWithPolling).toHaveBeenCalledTimes(summaryCallsAfterMount);
  });
});
