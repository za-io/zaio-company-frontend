import { parsePaymentSlotFromRow } from "./customPlanTableRows";

export function encodePaystackEftChoice(row) {
  return JSON.stringify({
    installmentSlot: row.installmentSlot != null && row.installmentSlot >= 1 ? row.installmentSlot : null,
    outstandingPaymentId: row.outstandingPaymentId || null,
    billingRecordId: row.billingRecordId || null,
  });
}

function slotFromRow(row) {
  if (row?.installmentSlot != null && row.installmentSlot >= 1) return row.installmentSlot;
  return parsePaymentSlotFromRow(row);
}

/** Instalment numbers that already have an accepted / paid row. */
export function settledPaystackSlots(plan) {
  const settled = new Set();
  for (const row of plan?.payments || []) {
    if (row.status !== "accepted" && row.status !== "paid") continue;
    const slot = slotFromRow(row);
    if (slot != null) settled.add(slot);
  }
  return settled;
}

function eventTime(row) {
  const value = row?.paidAt || row?.failedAttemptAt || row?.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

/**
 * One row per instalment for the payments table. Extra card retries for the same
 * slot become `attempts` so the UI can show them in an accordion instead of
 * stacking recovered Payment 3 rows.
 */
export function groupPaystackPaymentRows(payments = []) {
  const bySlot = new Map();
  const unslotted = [];
  payments.forEach((row, index) => {
    const slot =
      row?.installmentSlot != null && Number(row.installmentSlot) >= 1
        ? Number(row.installmentSlot)
        : parsePaymentSlotFromRow(row);
    if (slot == null) {
      unslotted.push({ slot: null, primary: row, attempts: [], index });
      return;
    }
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot).push(row);
  });

  const groups = [...bySlot.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([slot, rows]) => {
      const accepted = rows.filter((row) => row.status === "accepted" || row.status === "paid");
      const placeholders = rows.filter(
        (row) => row.status === "pending" || row.status === "overdue" || row.status === "written_off"
      );
      const failed = rows.filter((row) => row.status === "failed" || row.status === "rejected");
      const primary = accepted[0] || placeholders[0] || [...failed].sort((a, b) => eventTime(b) - eventTime(a))[0] || rows[0];
      const attempts = rows
        .filter((row) => row !== primary)
        .sort((a, b) => eventTime(b) - eventTime(a));
      return { slot, primary, attempts };
    });

  return [...groups, ...unslotted];
}

/** Failed debit whose instalment was later paid (EFT catch-up or a later Paystack success). */
export function isRecoveredPaystackFailure(plan, row) {
  if (!row) return false;
  const failed = row.status === "failed" || row.status === "rejected";
  if (!failed) return false;
  const slot = slotFromRow(row);
  if (slot == null) return false;
  return settledPaystackSlots(plan).has(slot);
}

/**
 * Pending, failed Pay now links, and rejected Paystack billing rows for standalone plans.
 * Recovered failures are omitted — they are already settled and must not be allocatable again.
 * Falls back to unpaid Payment 1..N when the plan has no open rows yet.
 */
export function buildPaystackEftPaymentChoices(plan) {
  if (plan?.partner) return [];
  const pc = (plan?.planCode || "").trim();
  const hasSubscriptionCode = !!(plan?.subscriptionCode && String(plan.subscriptionCode).trim());
  if (!hasSubscriptionCode && !pc.startsWith("PLN_")) return [];
  if (pc.startsWith("CUSTOM-") || pc.startsWith("2INST-")) return [];

  const settled = settledPaystackSlots(plan);
  const formatAmount = (amount, currency = "ZAR") => {
    if (amount == null) return "";
    const value = Number(amount) / 100;
    return new Intl.NumberFormat("en-ZA", { style: "currency", currency: currency || "ZAR" }).format(value);
  };

  const raw = [];
  (plan.payments || []).forEach((p, idx) => {
    const isPending = p.status === "pending" || p.status === "overdue";
    const isFailedOU = p.status === "failed" && p.isOutstanding;
    const isFailedRejected = p.status === "failed" && p.billingRecordId && !p.isOutstanding;
    if (!isPending && !isFailedOU && !isFailedRejected) return;

    const slot =
      p.installmentSlot != null && p.installmentSlot >= 1
        ? p.installmentSlot
        : parsePaymentSlotFromRow(p);
    if (slot != null && settled.has(slot)) return;

    const baseLabel = p.installmentLabel || (slot ? `Payment ${slot}` : `Line ${idx + 1}`);
    const failNote =
      isFailedRejected ? "rejected debit" : isFailedOU ? "Pay now" : p.status === "overdue" ? "overdue" : null;
    const label = [baseLabel, p.amount != null ? formatAmount(p.amount, p.currency) : "", failNote]
      .filter(Boolean)
      .join(" · ");
    raw.push({
      installmentSlot: slot,
      outstandingPaymentId: p.outstandingPaymentId || null,
      billingRecordId: p.billingRecordId || null,
      label,
      amountCents: p.amount != null ? Number(p.amount) : null,
    });
  });

  if (raw.length > 0) {
    raw.sort((a, b) => (a.installmentSlot ?? 999) - (b.installmentSlot ?? 999));
    return raw;
  }

  const total = plan.totalPaymentsRequired;
  if (total != null && total >= 1 && plan.amount != null) {
    return Array.from({ length: total }, (_, i) => {
      const slotNum = i + 1;
      if (settled.has(slotNum)) return null;
      return {
        installmentSlot: slotNum,
        outstandingPaymentId: null,
        label: `Payment ${slotNum} of ${total} · ${formatAmount(plan.amount, plan.currency)}`,
        amountCents: Number(plan.amount),
      };
    }).filter(Boolean);
  }
  return [];
}
