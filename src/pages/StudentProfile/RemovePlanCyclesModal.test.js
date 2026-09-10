import "@testing-library/jest-dom";
import React, { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import RemovePlanCyclesModal, { suggestedMissCycleIds } from "./RemovePlanCyclesModal";

test("suggests this-plan and leftover blocking cycles", () => {
  expect(
    suggestedMissCycleIds(
      [{ id: "this", suggested: true }],
      [
        { id: "old", suggested: true },
        { id: "keep", suggested: false },
      ]
    )
  ).toEqual(["this", "old"]);
});

function Harness() {
  const [selectedIds, setSelectedIds] = useState(["c-this", "c-old"]);
  return (
    <RemovePlanCyclesModal
      open
      title="Remove this custom plan"
      warning="Billing records stay on the student."
      thisPlan={[
        {
          id: "c-this",
          planCode: "CUSTOM-NEW",
          status: "active",
          cycleKind: "first_miss",
          triggerInstallmentNumbers: [2],
          planExists: true,
          suggested: true,
        },
      ]}
      otherCycles={[
        {
          id: "c-old",
          planCode: "CUSTOM-OLD",
          status: "active",
          cycleKind: "second_miss",
          triggerInstallmentNumbers: [2, 3],
          planExists: false,
          suggested: true,
        },
      ]}
      selectedIds={selectedIds}
      onToggle={(id) =>
        setSelectedIds((current) => (current.includes(id) ? current.filter((row) => row !== id) : [...current, id]))
      }
      onCancel={() => {}}
      onConfirm={() => {}}
    />
  );
}

test("shows this plan and leftover cycles so finance can unselect before delete", () => {
  render(<Harness />);
  expect(screen.getByText("This plan")).toBeInTheDocument();
  expect(screen.getByText("Other cycles on this student")).toBeInTheDocument();
  expect(screen.getByText("CUSTOM-NEW")).toBeInTheDocument();
  expect(screen.getByText("CUSTOM-OLD")).toBeInTheDocument();
  expect(screen.getByText("Leftover plan")).toBeInTheDocument();
  const leftoverBox = screen.getAllByRole("checkbox")[1];
  expect(leftoverBox).toBeChecked();
  fireEvent.click(leftoverBox);
  expect(leftoverBox).not.toBeChecked();
});
