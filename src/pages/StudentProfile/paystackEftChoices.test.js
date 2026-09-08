import {
  buildPaystackEftPaymentChoices,
  groupPaystackPaymentRows,
  isRecoveredPaystackFailure,
  paystackRowStatusLabel,
} from "./paystackEftChoices";

const plan = (payments) => ({
  planCode: "PLN_0732cfkparcqe9h",
  subscriptionCode: "SUB_test",
  amount: 320000,
  currency: "ZAR",
  totalPaymentsRequired: 12,
  payments,
});

describe("groupPaystackPaymentRows", () => {
  test("folds retry failures under the accepted instalment", () => {
    const groups = groupPaystackPaymentRows([
      { installmentSlot: 3, status: "accepted", billingRecordId: "eft", paidAt: "2026-05-02" },
      { installmentSlot: 3, status: "failed", billingRecordId: "a", paidAt: "2026-05-01T10:00:00.000Z" },
      { installmentSlot: 3, status: "failed", billingRecordId: "b", paidAt: "2026-05-01T11:00:00.000Z" },
      { installmentSlot: 4, status: "pending" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].slot).toBe(3);
    expect(groups[0].primary.status).toBe("accepted");
    expect(groups[0].attempts).toHaveLength(2);
    expect(groups[1].attempts).toHaveLength(0);
  });

  test("groups custom-plan invoices by instalment number, not the leftover Paystack slot", () => {
    const groups = groupPaystackPaymentRows([
      {
        installmentNumber: 3,
        installmentLabel: "Instalment 3",
        installmentSlot: 2,
        status: "accepted",
        dueDate: "2026-04-27T09:27:25.000Z",
      },
      {
        installmentNumber: 7,
        installmentLabel: "Instalment 7",
        installmentSlot: 3,
        status: "accepted",
        dueDate: "2026-08-27T09:27:25.000Z",
      },
    ]);
    expect(groups.map((group) => [group.slot, group.primary.installmentLabel])).toEqual([
      [3, "Instalment 3"],
      [7, "Instalment 7"],
    ]);
  });
});

describe("recovered Paystack failures", () => {
  const recoveredPlan = plan([
    { installmentSlot: 4, status: "failed", billingRecordId: "br-jun-fail", installmentLabel: "Payment 4 of 12", amount: 320000 },
    { installmentSlot: 5, status: "accepted", billingRecordId: "br-jul-eft", installmentLabel: "Payment 5 of 12", amount: 320000 },
    { installmentSlot: 5, status: "failed", billingRecordId: "br-jul-fail", installmentLabel: "Payment 5 of 12", amount: 320000 },
    { installmentSlot: 6, status: "pending", installmentLabel: "Payment 6 of 12", amount: 320000 },
  ]);

  test("a failed debit is recovered once that instalment has an accepted payment", () => {
    expect(isRecoveredPaystackFailure(recoveredPlan, recoveredPlan.payments[2])).toBe(true);
    expect(isRecoveredPaystackFailure(recoveredPlan, recoveredPlan.payments[0])).toBe(false);
  });

  test("the EFT list keeps the open miss and drops the recovered failure", () => {
    const slots = buildPaystackEftPaymentChoices(recoveredPlan).map((row) => row.installmentSlot);
    expect(slots).toContain(4);
    expect(slots).not.toContain(5);
    expect(slots).toContain(6);
    const june = buildPaystackEftPaymentChoices(recoveredPlan).find((row) => row.installmentSlot === 4);
    expect(june.label).toMatch(/rejected debit/);
  });

  test("overdue empty slots stay on the EFT list", () => {
    const slots = buildPaystackEftPaymentChoices(
      plan([
        { installmentSlot: 4, status: "accepted", amount: 320000 },
        { installmentSlot: 7, status: "overdue", installmentLabel: "Payment 7 of 12", amount: 320000 },
      ])
    ).map((row) => row.installmentSlot);
    expect(slots).toContain(7);
    expect(slots).not.toContain(4);
    const sept = buildPaystackEftPaymentChoices(
      plan([
        { installmentSlot: 4, status: "accepted", amount: 320000 },
        { installmentSlot: 7, status: "overdue", installmentLabel: "Payment 7 of 12", amount: 320000 },
      ])
    ).find((row) => row.installmentSlot === 7);
    expect(sept.label).toMatch(/overdue/);
  });

  test("unpaid failed months use the same overdue label as a missed hole", () => {
    const now = new Date("2026-09-08T12:00:00.000Z");
    expect(
      paystackRowStatusLabel(
        {
          status: "rejected",
          dueDate: "2026-06-25T13:35:32.000Z",
        },
        now
      )
    ).toBe("overdue");
    expect(
      paystackRowStatusLabel(
        {
          status: "overdue",
          dueDate: "2026-03-25T13:35:32.000Z",
        },
        now
      )
    ).toBe("overdue");
  });

  test("fallback list skips already-paid instalments", () => {
    const slots = buildPaystackEftPaymentChoices(
      plan([{ installmentSlot: 1, status: "accepted", amount: 320000 }])
    ).map((row) => row.installmentSlot);
    expect(slots[0]).toBe(2);
    expect(slots).not.toContain(1);
  });
});
