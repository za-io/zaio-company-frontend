import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  COLLECTION_STAGE_OPTIONS,
  formatCollectionsMoney,
} from "./collectionsViewModel";
import CollectionJourneyDrawer from "./CollectionJourneyDrawer";
import { postFinanceCollectionEvent, postFinanceCollectionEmailSentManually } from "../../../api/company";

jest.mock("../../../api/company", () => ({
  postFinanceCollectionEvent: jest.fn(),
  postFinanceCollectionReminder: jest.fn(),
  patchFinanceCollectionEmailDraft: jest.fn(),
  postFinanceCollectionCancel: jest.fn(),
  postFinanceCollectionSendEmail: jest.fn(),
  postFinanceCollectionEmailSentManually: jest.fn(),
}));

function stageLabel(stage) {
  return COLLECTION_STAGE_OPTIONS.find(([value]) => value === stage)?.[1];
}

function makeJourney() {
  return [
    {
      id: "p-old",
      kind: "payment",
      type: "cash",
      status: "accepted",
      amount: 150000,
      occurredAt: "2026-08-20T10:00:00.000Z",
      reference: "ref-old",
      duplicateCount: 0,
    },
    {
      id: "p-dup",
      kind: "payment",
      type: "recurring",
      status: "rejected",
      amount: 320000,
      occurredAt: "2026-08-24T08:00:00.000Z",
      reference: "ref-dup",
      duplicateCount: 2,
    },
    {
      id: "n-new",
      kind: "note",
      type: "call_note",
      summary: "Student promised to pay Friday",
      occurredAt: "2026-08-26T07:30:00.000Z",
      actorName: "Jane Admin",
    },
    {
      id: "p-bad",
      kind: "payment",
      type: "eft",
      status: "pending",
      amount: 1000,
      occurredAt: "not-a-date",
      reference: "ref-bad",
      duplicateCount: 0,
    },
    {
      id: "n-nodate",
      kind: "note",
      type: "call_note",
      summary: "No timestamp note",
      occurredAt: null,
      actorName: "Sam Ops",
    },
  ];
}

function makeCase(overrides = {}) {
  const { student: studentOverrides, ...rest } = overrides;
  return {
    caseKey: "u1:CUSTOM-aaa",
    userId: "u1",
    planCode: "CUSTOM-aaa",
    planName: "Full Stack Bootcamp",
    planType: "CustomPaymentPlan",
    stage: "SECOND_CONSECUTIVE_MISS",
    arrearsCents: 640000,
    missedInstallmentNumbers: [4, 5],
    nextAction: "5 business days to respond — Manga may manually cancel after window",
    policyCohort: "new",
    classificationConfidence: "high",
    lastContact: null,
    journey: makeJourney(),
    student: {
      username: "Alice Nkosi",
      email: "alice@example.com",
      phonenumber: "+27 82 555 1234",
      studentNumber: "S-1001",
      ...studentOverrides,
    },
    ...rest,
  };
}

function makeSecondCase() {
  return makeCase({
    caseKey: "u2:CUSTOM-bbb",
    userId: "u2",
    planCode: "CUSTOM-bbb",
    planName: "Data Science Bootcamp",
    arrearsCents: 180000,
    missedInstallmentNumbers: [1],
    stage: "FIRST_MISS",
    nextAction: "Within 3-working-day response window",
    policyCohort: "existing",
    classificationConfidence: "review",
    journey: [],
    student: {
      username: "Bongi Mokoena",
      email: "bongi@example.com",
      studentNumber: "S-2002",
    },
  });
}

function renderDrawer(overrides = {}) {
  const props = {
    collectionCase: makeCase(),
    onClose: jest.fn(),
    onEventCreated: jest.fn(),
    ...overrides,
  };
  return {
    ...render(
      <MemoryRouter>
        <CollectionJourneyDrawer {...props} />
      </MemoryRouter>
    ),
    props,
  };
}

function openCallPanel() {
  fireEvent.click(screen.getByRole("button", { name: "Log call" }));
}

function renderLongLived(collectionCase, extra = {}) {
  const onClose = extra.onClose || jest.fn();
  const onEventCreated = extra.onEventCreated || jest.fn();
  const view = render(
    <MemoryRouter>
      <CollectionJourneyDrawer
        collectionCase={collectionCase}
        onClose={onClose}
        onEventCreated={onEventCreated}
      />
    </MemoryRouter>
  );
  function rerenderCase(nextCase) {
    view.rerender(
      <MemoryRouter>
        <CollectionJourneyDrawer
          collectionCase={nextCase}
          onClose={onClose}
          onEventCreated={onEventCreated}
        />
      </MemoryRouter>
    );
  }
  return { ...view, onClose, onEventCreated, rerenderCase };
}

function journeyItems() {
  return screen.getAllByRole("listitem");
}

function itemContaining(text) {
  return journeyItems().find((item) => item.textContent.includes(text));
}

beforeEach(() => {
  postFinanceCollectionEvent.mockReset();
});

describe("CollectionJourneyDrawer", () => {
  it("returns null when collectionCase is absent", () => {
    const { container, rerender } = render(
      <CollectionJourneyDrawer collectionCase={null} onClose={jest.fn()} onEventCreated={jest.fn()} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();

    rerender(
      <CollectionJourneyDrawer
        collectionCase={undefined}
        onClose={jest.fn()}
        onEventCreated={jest.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders an accessible right-side dialog with summary fields and v1 copy", () => {
    renderDrawer();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId)).toHaveTextContent(/collection journey/i);
    expect(dialog).toHaveAccessibleName(/collection journey/i);
    expect(dialog.className).toMatch(/fixed/);
    expect(dialog.className).toMatch(/right-0/);

    expect(screen.getByRole("button", { name: /^close$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open student profile/i })).toHaveAttribute(
      "href",
      "/student-profile/u1"
    );

    expect(screen.getByText("Alice Nkosi")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+27 82 555 1234" })).toHaveAttribute(
      "href",
      "tel:+27825551234"
    );
    expect(screen.getByText("S-1001")).toBeInTheDocument();
    expect(screen.getByText("Full Stack Bootcamp")).toBeInTheDocument();
    expect(screen.getByText("CUSTOM-aaa")).toBeInTheDocument();
    expect(screen.getByText("CustomPaymentPlan")).toBeInTheDocument();
    expect(screen.getByText(formatCollectionsMoney(640000))).toBeInTheDocument();
    expect(screen.getByText(stageLabel("SECOND_CONSECUTIVE_MISS"))).toBeInTheDocument();
    expect(screen.getByText("4 + 5")).toBeInTheDocument();
    expect(
      screen.getByText("5 business days to respond — Manga may manually cancel after window")
    ).toBeInTheDocument();
    expect(screen.getByText(/new/)).toBeInTheDocument();
    expect(screen.getByText(/high/)).toBeInTheDocument();

    expect(
      screen.getByText(/editable drafts below/i)
    ).toBeInTheDocument();

    const forbiddenNames = [
      /auto-?cancel/i,
      /switch/i,
      /^email$/i,
      /^block$/i,
      /invoice/i,
      /debt recovery/i,
    ];
    for (const name of forbiddenNames) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name })).not.toBeInTheDocument();
    }
  });

  it("renders the journey newest-first without mutating input, including payment and note details", () => {
    const collectionCase = makeCase();
    const snapshot = JSON.parse(JSON.stringify(collectionCase));

    renderDrawer({ collectionCase });

    expect(collectionCase).toEqual(snapshot);
    expect(collectionCase.journey.map((entry) => entry.id)).toEqual([
      "p-old",
      "p-dup",
      "n-new",
      "p-bad",
      "n-nodate",
    ]);

    const items = journeyItems();
    const texts = items.map((item) => item.textContent);
    const newestNoteIndex = texts.findIndex((text) =>
      text.includes("Student promised to pay Friday")
    );
    const dupPaymentIndex = texts.findIndex((text) => text.includes("ref-dup"));
    const oldPaymentIndex = texts.findIndex((text) => text.includes("ref-old"));
    expect(newestNoteIndex).toBeGreaterThanOrEqual(0);
    expect(dupPaymentIndex).toBeGreaterThan(newestNoteIndex);
    expect(oldPaymentIndex).toBeGreaterThan(dupPaymentIndex);

    const note = itemContaining("Student promised to pay Friday");
    expect(note).toHaveTextContent("Call note");
    expect(note).toHaveTextContent("Jane Admin");
    expect(note).toHaveTextContent("Student promised to pay Friday");
    expect(note.textContent).toMatch(/26 Aug 2026|Aug 26, 2026|2026-08-26/);

    const dupPayment = itemContaining("ref-dup");
    expect(dupPayment).toHaveTextContent("recurring");
    expect(dupPayment).toHaveTextContent("rejected");
    expect(dupPayment).toHaveTextContent(formatCollectionsMoney(320000));
    expect(dupPayment).toHaveTextContent("ref-dup");
    expect(dupPayment).toHaveTextContent("2");
    expect(dupPayment.textContent).toMatch(/duplicate/i);
    expect(dupPayment.textContent).toMatch(/24 Aug 2026|Aug 24, 2026|2026-08-24/);

    const oldPayment = itemContaining("ref-old");
    expect(oldPayment).toHaveTextContent("cash");
    expect(oldPayment).toHaveTextContent("accepted");
    expect(oldPayment).toHaveTextContent(formatCollectionsMoney(150000));
    expect(oldPayment).toHaveTextContent("ref-old");
    expect(oldPayment.textContent).not.toMatch(/duplicate/i);

    const badPayment = itemContaining("ref-bad");
    expect(badPayment).toHaveTextContent("eft");
    expect(badPayment).toHaveTextContent("pending");
    expect(badPayment).toHaveTextContent(formatCollectionsMoney(1000));
    expect(badPayment).toHaveTextContent("—");

    const undatedNote = itemContaining("No timestamp note");
    expect(undatedNote).toHaveTextContent("Call note");
    expect(undatedNote).toHaveTextContent("Sam Ops");
    expect(undatedNote).toHaveTextContent("—");
  });

  it("invokes onClose from Close and Escape, and removes the Escape listener on unmount", () => {
    const onClose = jest.fn();
    const { unmount } = renderDrawer({ onClose });

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("disables whitespace-only call-note submission", () => {
    renderDrawer();
    openCallPanel();

    const textarea = screen.getByLabelText(/call note/i);
    const submit = screen.getByRole("button", { name: /save call note/i });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(submit).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "   \n\t  " } });
    expect(submit).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "Reached voicemail" } });
    expect(submit).toBeEnabled();
  });

  it("submits a trimmed call note, notifies the parent, and clears the textarea", async () => {
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
    const onEventCreated = jest.fn();
    renderDrawer({ onEventCreated });
    openCallPanel();

    const textarea = screen.getByLabelText(/call note/i);
    fireEvent.change(textarea, { target: { value: "  Left voicemail  " } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));

    await waitFor(() => {
      expect(onEventCreated).toHaveBeenCalledWith(created);
    });
    expect(postFinanceCollectionEvent).toHaveBeenCalledWith("u1", "CUSTOM-aaa", {
      type: "call_note",
      summary: "Left voicemail",
    });
    expect(postFinanceCollectionEvent).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("");
  });

  it("preserves the textarea and shows a safe API message when create returns success false", async () => {
    postFinanceCollectionEvent.mockResolvedValue({
      success: false,
      message: "Not allowed",
    });
    const onEventCreated = jest.fn();
    renderDrawer({ onEventCreated });
    openCallPanel();

    const textarea = screen.getByLabelText(/call note/i);
    fireEvent.change(textarea, { target: { value: "Reached voicemail" } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Not allowed");
    expect(textarea).toHaveValue("Reached voicemail");
    expect(onEventCreated).not.toHaveBeenCalled();
  });

  it("preserves the textarea and shows a safe message when create throws", async () => {
    postFinanceCollectionEvent.mockRejectedValue(new Error("Network down"));
    const onEventCreated = jest.fn();
    renderDrawer({ onEventCreated });
    openCallPanel();

    const textarea = screen.getByLabelText(/call note/i);
    fireEvent.change(textarea, { target: { value: "Reached voicemail" } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
    expect(screen.getByRole("alert").textContent).not.toMatch(/stack|at Error/i);
    expect(textarea).toHaveValue("Reached voicemail");
    expect(onEventCreated).not.toHaveBeenCalled();
  });

  it("does not submit again while a call-note request is in flight", async () => {
    let resolvePost;
    postFinanceCollectionEvent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );
    renderDrawer();
    openCallPanel();

    const textarea = screen.getByLabelText(/call note/i);
    const submit = screen.getByRole("button", { name: /save call note/i });
    fireEvent.change(textarea, { target: { value: "Reached voicemail" } });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => {
      expect(postFinanceCollectionEvent).toHaveBeenCalledTimes(1);
    });
    expect(submit).toBeDisabled();

    resolvePost({
      success: true,
      event: { id: "ce-2", type: "call_note", summary: "Reached voicemail" },
    });
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("clears draft and error when collectionCase becomes null or a different case is opened", async () => {
    postFinanceCollectionEvent.mockResolvedValue({
      success: false,
      message: "Not allowed",
    });
    const caseA = makeCase();
    const caseB = makeSecondCase();
    const { rerenderCase } = renderLongLived(caseA);
    openCallPanel();

    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Alice draft" } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Not allowed");
    expect(screen.getByLabelText(/call note/i)).toHaveValue("Alice draft");

    rerenderCase(null);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerenderCase(caseA);
    openCallPanel();
    expect(screen.getByLabelText(/call note/i)).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Alice again" } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Not allowed");

    rerenderCase(caseB);
    expect(screen.getByText("Bongi Mokoena")).toBeInTheDocument();
    expect(screen.queryByText("Alice Nkosi")).not.toBeInTheDocument();
    openCallPanel();
    expect(screen.getByLabelText(/call note/i)).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores stale create completion after switching to another case", async () => {
    async function assertStaleCompletionIgnored(resolveValue) {
      let resolveA;
      postFinanceCollectionEvent.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveA = resolve;
          })
      );
      const caseA = makeCase();
      const caseB = makeSecondCase();
      const { rerenderCase, onEventCreated, unmount } = renderLongLived(caseA);
      openCallPanel();

      fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Note for Alice" } });
      fireEvent.click(screen.getByRole("button", { name: /save call note/i }));
      await waitFor(() => {
        expect(postFinanceCollectionEvent).toHaveBeenCalledTimes(1);
      });

      rerenderCase(caseB);
      openCallPanel();
      fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Note for Bongi" } });

      await act(async () => {
        resolveA(resolveValue);
      });

      expect(onEventCreated).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/call note/i)).toHaveValue("Note for Bongi");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("Bongi Mokoena")).toBeInTheDocument();

      unmount();
      postFinanceCollectionEvent.mockReset();
    }

    await assertStaleCompletionIgnored({
      success: true,
      event: {
        id: "ce-a",
        type: "call_note",
        summary: "Note for Alice",
        userId: "u1",
        planCode: "CUSTOM-aaa",
      },
    });
    await assertStaleCompletionIgnored({
      success: false,
      message: "Not allowed",
    });
  });

  it("lets the new case submit after a stale request remains in flight or finishes", async () => {
    const resolvers = [];
    postFinanceCollectionEvent.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        })
    );
    const caseA = makeCase();
    const caseB = makeSecondCase();
    const eventB = {
      id: "ce-b",
      type: "call_note",
      summary: "Bongi note",
      userId: "u2",
      planCode: "CUSTOM-bbb",
    };
    const { rerenderCase, onEventCreated } = renderLongLived(caseA);
    openCallPanel();

    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Alice note" } });
    fireEvent.click(screen.getByRole("button", { name: /save call note/i }));
    await waitFor(() => {
      expect(postFinanceCollectionEvent).toHaveBeenCalledTimes(1);
    });

    rerenderCase(caseB);
    openCallPanel();
    fireEvent.change(screen.getByLabelText(/call note/i), { target: { value: "Bongi note" } });
    const submit = screen.getByRole("button", { name: /save call note/i });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => {
      expect(postFinanceCollectionEvent).toHaveBeenCalledTimes(2);
    });
    expect(postFinanceCollectionEvent).toHaveBeenLastCalledWith("u2", "CUSTOM-bbb", {
      type: "call_note",
      summary: "Bongi note",
    });

    await act(async () => {
      resolvers[0]({
        success: true,
        event: { id: "ce-a", type: "call_note", summary: "Alice note", userId: "u1", planCode: "CUSTOM-aaa" },
      });
    });
    expect(onEventCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/call note/i)).toHaveValue("Bongi note");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(submit);
    expect(postFinanceCollectionEvent).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvers[1]({ success: true, event: eventB });
    });
    await waitFor(() => {
      expect(onEventCreated).toHaveBeenCalledWith(eventB);
    });
    expect(onEventCreated).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/call note/i)).toHaveValue("");
  });

  it("logs a manually sent miss email and updates the journey", async () => {
    postFinanceCollectionEmailSentManually.mockResolvedValue({
      success: true,
      event: {
        id: "evt-manual",
        type: "miss_notification_sent",
        summary: "Miss notification sent via manual to student@example.com",
        occurredAt: "2026-09-03T12:00:00.000Z",
      },
      missCycle: { pendingEmailDraft: null, notificationSentAt: "2026-09-03T12:00:00.000Z" },
    });

    const onEmailSent = jest.fn();
    renderDrawer({
      collectionCase: makeCase({
        missCycle: {
          active: true,
          cycleKind: "first_miss",
          status: "active",
          pendingEmailDraft: {
            emailKind: "first_miss",
            subject: "Action Required: Overdue Payment",
            bodyText: "Dear Student,\n\nPlease pay.",
          },
        },
      }),
      onEmailSent,
    });

    fireEvent.click(screen.getByRole("button", { name: /email sent manually/i }));

    await waitFor(() => {
      expect(postFinanceCollectionEmailSentManually).toHaveBeenCalledWith("u1", "CUSTOM-aaa", {
        subject: "Action Required: Overdue Payment",
        bodyText: "Dear Student,\n\nPlease pay.",
        studentEmail: "alice@example.com",
        arrearsCents: 640000,
      });
      expect(onEmailSent).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          event: expect.objectContaining({ type: "miss_notification_sent" }),
        })
      );
    });
  });
});
