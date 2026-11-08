import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { formatLifecycleEnrolmentStatus } from "../../utils/enrollmentLifecycleDisplay";

const FIXTURE = {
  _id: "req1",
  kind: "transfer",
  status: "transfer_completed",
  studentEmail: "s@test",
  bootcampName: "Source cohort",
  destinationBootcampName: "Dest cohort",
  sourceEnrollmentStatus: "transferred",
  destinationEnrollmentStatus: "in_progress",
  transferLinks: {
    sourceEnrollmentId: "enr-src",
    sourceBootcampId: "bc-src",
    destinationBootcampId: "bc-dest",
    destinationEnrollmentId: "enr-dest",
  },
  triageNotes: "notes",
  escalatedAt: "2026-01-01T00:00:00.000Z",
};

function DetailFixture() {
  const item = FIXTURE;
  return (
    <dl data-testid="detail">
      <dt>Enrolment status (source)</dt>
      <dd>{formatLifecycleEnrolmentStatus(item.sourceEnrollmentStatus)}</dd>
      <dt>Destination enrolment status</dt>
      <dd>{formatLifecycleEnrolmentStatus(item.destinationEnrollmentStatus)}</dd>
      <dt>Source enrolment ID</dt>
      <dd>{item.transferLinks?.sourceEnrollmentId}</dd>
      <dt>Destination enrolment ID</dt>
      <dd>{item.transferLinks?.destinationEnrollmentId}</dd>
    </dl>
  );
}

test("shows withdrawn/transferred labels and transfer link ids from API fixture", () => {
  render(<DetailFixture />);
  expect(screen.getByText("Transferred")).toBeInTheDocument();
  expect(screen.getByText("In progress")).toBeInTheDocument();
  expect(screen.getByText("enr-src")).toBeInTheDocument();
  expect(screen.getByText("enr-dest")).toBeInTheDocument();
});
