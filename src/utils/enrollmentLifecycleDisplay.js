const STATUS_LABELS = {
  withdrawn: "Withdrawn",
  transferred: "Transferred",
  in_progress: "In progress",
};

export function formatLifecycleEnrolmentStatus(status) {
  if (!status) return "—";
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  return String(status).replace(/_/g, " ");
}

export function formatTransferLinks(transferLinks) {
  if (!transferLinks) return null;
  return transferLinks;
}
