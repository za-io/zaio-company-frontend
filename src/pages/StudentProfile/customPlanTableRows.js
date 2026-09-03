export function parsePaymentSlotFromRow(p) {
  if (p?.installmentSlot != null && p.installmentSlot > 0) return p.installmentSlot;
  const label = p.installmentLabel || "";
  const m = String(label).match(/Payment\s+(\d+)\s+of\s+\d+/i);
  return m ? Number(m[1]) : null;
}

export function isEftPaymentType(paymentType) {
  const pt = String(paymentType || "").toLowerCase();
  return pt === "eft" || pt === "cash";
}

/** Map merged billing row → CustomPaymentPlan installment when `_inst` is missing (GET /billing rows omit installmentNumber). */
export function resolveCustomPlanRowInst(plan, row) {
  if (!row || !plan?.installments?.length) return null;
  if (row._inst) return row._inst;
  const installments = plan.installments;
  const paystackInsts = installments.filter((i) => i.type === "paystack");

  if (row.installmentNumber != null) {
    const found = installments.find((i) => i.number === row.installmentNumber);
    if (found) return found;
  }
  const instLabel = String(row.installmentLabel || "").match(/Instalment\s+(\d+)/i);
  if (instLabel) {
    const n = Number(instLabel[1]);
    const found = installments.find((i) => i.number === n);
    if (found) return found;
  }
  if (row.installmentSlot != null) {
    const found = installments.find((i) => i.number === row.installmentSlot);
    if (found) return found;
  }
  const slotFromPayment = parsePaymentSlotFromRow(row);
  if (slotFromPayment != null) {
    const found = installments.find((i) => i.number === slotFromPayment);
    if (found) return found;
  }
  if (row.billingRecordId != null) {
    const bid = String(row.billingRecordId);
    const found = installments.find((i) => i.billingRecordId && String(i.billingRecordId) === bid);
    if (found) return found;
  }

  /** Overdue “Pay now” row: same URL as plan’s first Paystack link, no Instalment label (billing.controller overdueRow). */
  const fpUrl = (plan.firstPaystackPaymentUrl || "").trim();
  if (fpUrl && row.paymentUrl && String(row.paymentUrl).trim() === fpUrl) {
    const firstPay = paystackInsts[0];
    if (firstPay) return firstPay;
  }

  /**
   * Outstanding Pay now / failed recurring row: often no label or slot; if the plan has a single Paystack line, that row maps to it.
   */
  if (
    paystackInsts.length === 1 &&
    row.isOutstanding &&
    (row.paymentType === "recurring" || row.paymentType === "paystack") &&
    row.installmentSlot == null &&
    row.installmentNumber == null &&
    !instLabel
  ) {
    return paystackInsts[0];
  }

  return null;
}

/** Resolve which plan installment number a billing row belongs to (prefer explicit ids over heuristics). */
export function resolveRowToInstNumber(plan, row) {
  if (row == null) return null;
  if (row.installmentNumber != null && Number(row.installmentNumber) > 0) {
    return Math.floor(Number(row.installmentNumber));
  }
  if (row.installmentSlot != null && Number(row.installmentSlot) > 0) {
    return Math.floor(Number(row.installmentSlot));
  }
  const m = String(row.installmentLabel || "").match(/Instalment\s+(\d+)/i);
  if (m) return Number(m[1]);
  const payN = parsePaymentSlotFromRow(row);
  if (payN != null && payN > 0) return payN;
  const inst = resolveCustomPlanRowInst(plan, row);
  if (inst?.number != null) return inst.number;
  return null;
}

export function rowMatchesInstallment(inst, plan, row) {
  const n = resolveRowToInstNumber(plan, row);
  if (n == null || n !== inst.number) return false;
  const pt = row.paymentType;
  if (inst.type === "cash") {
    return pt === "cash" || pt === "eft";
  }
  if (inst.type === "paystack") {
    // Admin "Record EFT payment" on a Paystack-typed line: same installment, method becomes EFT.
    return pt === "paystack" || pt === "recurring" || pt === "initial" || isEftPaymentType(pt);
  }
  return true;
}

function resolvedInstallmentPaymentType(inst, matches) {
  const accepted = (matches || []).filter((m) => m.status === "accepted" || m.status === "paid");
  if (accepted.some((m) => isEftPaymentType(m.paymentType))) return "cash";
  if (inst.type === "paystack") return "paystack";
  if (inst.type === "cash") return "cash";
  return matches[0]?.paymentType;
}

export function mergeCustomPlanInstallmentWithPayments(plan, inst, matches) {
  if (!matches.length) {
    return {
      installmentLabel: `Instalment ${inst.number}`,
      amount: inst.amount,
      dueDate: inst.dueDate,
      paymentType: inst.type,
      status:
        inst.status === "paid"
          ? "accepted"
          : inst.status === "payment_arranged"
            ? "payment_arranged"
            : "pending",
      billingRecordId: inst.billingRecordId,
      customPlanId: plan._id,
      installmentNumber: inst.number,
      paymentUrl:
        inst.type === "paystack" && plan.firstPaystackPaymentUrl ? plan.firstPaystackPaymentUrl : null,
      arrangementNote: inst.arrangementNote || null,
      _inst: inst,
    };
  }

  const failed = matches.filter((m) => m.status === "failed" || m.status === "rejected");
  const accepted = matches.filter((m) => m.status === "accepted" || m.status === "paid");
  const pending = matches.filter((m) => m.status === "pending");

  let status = "pending";
  if (inst.status === "paid") status = "accepted";
  else if (accepted.length > 0) status = "accepted";
  else if (failed.length > 0) status = "failed";
  else if (inst.status === "payment_arranged") status = "payment_arranged";
  else if (pending.length > 0) status = "pending";

  const pickOutstanding = matches.find((m) => m.isOutstanding && m.paymentUrl);
  const pickFailed =
    failed.length === 0
      ? null
      : failed.reduce((a, b) => {
          const ta = a.paidAt ? new Date(a.paidAt).getTime() : 0;
          const tb = b.paidAt ? new Date(b.paidAt).getTime() : 0;
          return tb >= ta ? b : a;
        });
  const pickAccepted = accepted[0];
  const paymentType = resolvedInstallmentPaymentType(inst, matches);
  const showPaystackUrl =
    paymentType === "paystack" &&
    inst.type === "paystack" &&
    plan.firstPaystackPaymentUrl &&
    (status === "pending" || status === "failed");

  const paymentUrl =
    pickOutstanding?.paymentUrl ||
    (showPaystackUrl ? plan.firstPaystackPaymentUrl : null) ||
    null;

  return {
    installmentLabel: `Instalment ${inst.number}`,
    amount: inst.amount,
    dueDate: inst.dueDate,
    paidAt: pickAccepted?.paidAt ?? (inst.status === "paid" ? inst.paidAt : null),
    paymentType,
    status,
    billingRecordId: pickAccepted?.billingRecordId ?? inst.billingRecordId ?? pickFailed?.billingRecordId,
    customPlanId: plan._id,
    installmentNumber: inst.number,
    reference: pickFailed?.reference ?? pickAccepted?.reference ?? matches.find((m) => m.reference)?.reference,
    /** Paystack / billing timestamp for the failed debit (shown in Due date column). */
    failedAttemptAt: pickFailed?.paidAt ?? null,
    paymentUrl,
    isOutstanding: matches.some((m) => m.isOutstanding),
    expired: matches.some((m) => m.expired),
    outstandingPaymentId: matches.find((m) => m.outstandingPaymentId)?.outstandingPaymentId,
    failedChargeReference: matches.find((m) => m.failedChargeReference)?.failedChargeReference,
    xeroInvoiceUrl: matches.find((m) => m.xeroInvoiceUrl)?.xeroInvoiceUrl,
    arrangementNote: inst.arrangementNote || null,
    _inst: inst,
  };
}

/**
 * Failed Paystack subscription rows often omit installmentSlot → they become “orphans”.
 * Attach each to the first Paystack installment (by number) that is not yet satisfied, only if
 * every earlier Paystack installment is already complete (paid / accepted). That way a failed
 * “next” debit lands on instalment 3 when 1–2 are done, not on a spare row at the end.
 */
export function findPaystackInstIndexForOrphanFailure(base, matchesByInst) {
  const ordered = base
    .map((inst, j) => ({ inst, j }))
    .filter(({ inst }) => inst.type === "paystack")
    .sort((a, b) => a.inst.number - b.inst.number);

  const isPaystackInstComplete = (inst, j) => {
    if (inst.status === "paid") return true;
    const m = matchesByInst[j];
    return m.some((x) => x.status === "accepted" || x.status === "paid");
  };

  for (let k = 0; k < ordered.length; k++) {
    const { inst, j } = ordered[k];
    const predecessorsDone = ordered.slice(0, k).every((o) => isPaystackInstComplete(o.inst, o.j));
    if (!predecessorsDone) continue;

    if (inst.status === "paid") continue;
    const matches = matchesByInst[j];
    const hasFailed = matches.some((m) => m.status === "failed" || m.status === "rejected");
    const hasAccepted = matches.some((m) => m.status === "accepted" || m.status === "paid");
    if (hasAccepted) continue;
    if (hasFailed) continue;
    return j;
  }
  return null;
}

function isSyntheticPaystackPlaceholder(row) {
  if (!row || row.billingRecordId || row.reference) return false;
  if (row.status !== "pending" && row.status !== "written_off") return false;
  const slot = row.installmentSlot != null ? Number(row.installmentSlot) : parsePaymentSlotFromRow(row);
  if (!Number.isFinite(slot) || slot < 1) return false;
  return /^Payment\s+\d+\s+of\s+\d+/i.test(String(row.installmentLabel || ""));
}

export function buildCustomPlanTableRows(plan, billingPlan) {
  const base = [...(plan.installments || [])].sort((a, b) => a.number - b.number);
  if (!billingPlan?.payments?.length) {
    return base.map((inst) => mergeCustomPlanInstallmentWithPayments(plan, inst, []));
  }

  const payments = billingPlan.payments;
  const used = new Set();
  const matchesByInst = base.map(() => []);
  const existingNumbers = new Set(base.map((inst) => Number(inst.number)).filter((n) => Number.isFinite(n) && n > 0));

  payments.forEach((row, i) => {
    if (used.has(i)) return;
    if (isSyntheticPaystackPlaceholder(row)) {
      const slot = row.installmentSlot != null ? Number(row.installmentSlot) : parsePaymentSlotFromRow(row);
      if (existingNumbers.has(slot)) {
        used.add(i);
        return;
      }
    }
    for (let j = 0; j < base.length; j++) {
      if (rowMatchesInstallment(base[j], plan, row)) {
        matchesByInst[j].push(row);
        used.add(i);
        break;
      }
    }
  });

  /** Slot orphan failed debits to the next open Paystack installment (e.g. 3rd Paystack month → instalment 3). */
  payments.forEach((row, i) => {
    if (used.has(i)) return;
    if (row.status !== "failed" && row.status !== "rejected") return;
    const pt = String(row.paymentType || "");
    if (!["paystack", "recurring", "initial"].includes(pt)) return;
    const j = findPaystackInstIndexForOrphanFailure(base, matchesByInst);
    if (j != null) {
      matchesByInst[j].push(row);
      used.add(i);
    }
  });

  const canonical = base.map((inst, j) => mergeCustomPlanInstallmentWithPayments(plan, inst, matchesByInst[j]));

  const orphans = [];
  payments.forEach((row, i) => {
    if (used.has(i)) return;
    orphans.push({
      ...row,
      _inst: resolveCustomPlanRowInst(plan, row),
      _orphan: true,
    });
  });

  return [...canonical, ...orphans];
}

/** Lowest-numbered Paystack instalment on a custom plan (the “initial” Paystack payment for learner messaging). */
export function getFirstPaystackInstallment(plan) {
  const paystack = (plan?.installments || []).filter((i) => i.type === "paystack");
  if (!paystack.length) return null;
  return [...paystack].sort((a, b) => a.number - b.number)[0];
}

/** Type column: EFT recorded against a Paystack-typed line still shows as Cash (EFT). */
export function customPlanRowTypeKind(row, inst) {
  if (isEftPaymentType(row?.paymentType)) return "cash";
  if (row?.paymentType === "paystack" || row?.paymentType === "recurring" || row?.paymentType === "initial") {
    return "paystack";
  }
  if (inst?.type === "paystack") return "paystack";
  if (inst?.type === "cash") return "cash";
  return row?.paymentType || inst?.type || null;
}
