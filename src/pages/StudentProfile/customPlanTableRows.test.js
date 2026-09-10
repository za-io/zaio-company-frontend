import { buildCustomPlanTableRows, customPlanRowTypeKind, isCustomInstallmentOverdue } from "./customPlanTableRows";

function lethaboShapedPlan() {
  return {
    _id: "plan-lethabo",
    firstPaystackPaymentUrl: "https://paystack.shop/pay/example",
    installments: [
      { number: 1, type: "cash", status: "paid", amount: 275000, billingRecordId: "br1" },
      { number: 2, type: "cash", status: "paid", amount: 275000, billingRecordId: "br2" },
      { number: 3, type: "cash", status: "paid", amount: 275000, billingRecordId: "br3" },
      { number: 4, type: "cash", status: "paid", amount: 275000, billingRecordId: "br4" },
      {
        number: 5,
        type: "paystack",
        status: "paid",
        amount: 275000,
        billingRecordId: "br5",
        paystackPlanCode: "PLN_1hn4ht4bsafu797",
      },
      {
        number: 6,
        type: "paystack",
        status: "paid",
        amount: 275000,
        billingRecordId: "br6",
        paystackPlanCode: "PLN_1hn4ht4bsafu797",
      },
      { number: 7, type: "paystack", status: "pending", amount: 275000, paystackPlanCode: "PLN_1hn4ht4bsafu797" },
    ],
  };
}

function eftPayment(id, n) {
  return {
    billingRecordId: id,
    paymentType: "eft",
    status: "accepted",
    amount: 275000,
    reference: `eft-admin-${n}`,
    eventType: "eft_admin",
  };
}

describe("buildCustomPlanTableRows — Paystack installment paid by EFT", () => {
  it("keeps one row per installment and shows Cash (EFT) for Paystack lines paid by EFT", () => {
    const plan = lethaboShapedPlan();
    const billingPlan = {
      planCode: "CUSTOM-2886360c",
      payments: [
        eftPayment("br1", 1),
        eftPayment("br2", 2),
        eftPayment("br3", 3),
        eftPayment("br4", 4),
        eftPayment("br5", 5),
        eftPayment("br6", 6),
      ],
    };

    const rows = buildCustomPlanTableRows(plan, billingPlan);

    expect(rows).toHaveLength(7);
    expect(rows.filter((r) => r._orphan)).toHaveLength(0);

    const five = rows.find((r) => r.installmentNumber === 5);
    const six = rows.find((r) => r.installmentNumber === 6);
    expect(five.status).toBe("accepted");
    expect(six.status).toBe("accepted");
    expect(five.paymentType).toBe("cash");
    expect(six.paymentType).toBe("cash");
    expect(customPlanRowTypeKind(five, five._inst)).toBe("cash");
    expect(customPlanRowTypeKind(six, six._inst)).toBe("cash");
  });

  it("still shows Paystack when the installment was collected on Paystack", () => {
    const plan = {
      _id: "plan-sharon",
      installments: [
        { number: 1, type: "cash", status: "paid", amount: 275000, billingRecordId: "br1" },
        {
          number: 2,
          type: "paystack",
          status: "paid",
          amount: 275000,
          billingRecordId: "br2",
          paystackPlanCode: "PLN_x",
        },
      ],
    };
    const billingPlan = {
      payments: [
        eftPayment("br1", 1),
        {
          billingRecordId: "br2",
          paymentType: "initial",
          status: "accepted",
          amount: 275000,
          reference: "T123",
          eventType: "charge.success",
        },
      ],
    };

    const rows = buildCustomPlanTableRows(plan, billingPlan);
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r._orphan)).toHaveLength(0);
    expect(rows[1].paymentType).toBe("paystack");
    expect(customPlanRowTypeKind(rows[1], rows[1]._inst)).toBe("paystack");
  });

  it("drops the synthetic Payment N of M placeholder when that slot is already paid by EFT", () => {
    const plan = lethaboShapedPlan();
    plan.installments[4].type = "cash";
    plan.installments[5].type = "cash";
    const billingPlan = {
      payments: [
        eftPayment("br1", 1),
        eftPayment("br2", 2),
        eftPayment("br3", 3),
        eftPayment("br4", 4),
        eftPayment("br5", 5),
        eftPayment("br6", 6),
        {
          amount: 275000,
          status: "pending",
          paymentType: "recurring",
          installmentLabel: "Payment 6 of 12",
          installmentSlot: 6,
          customPlanId: "plan-lethabo",
          dueDate: "2026-07-25T00:00:00.000Z",
        },
      ],
    };

    const rows = buildCustomPlanTableRows(plan, billingPlan);

    expect(rows).toHaveLength(7);
    expect(rows.filter((r) => r._orphan)).toHaveLength(0);
    expect(rows.some((r) => /Payment\s+6\s+of\s+12/i.test(r.installmentLabel || ""))).toBe(false);
  });

  it("shows payment_arranged when installment has arrangement status and no billing match", () => {
    const plan = {
      _id: "plan-arranged",
      installments: [
        {
          number: 8,
          type: "paystack",
          status: "payment_arranged",
          amount: 588605,
          dueDate: "2026-09-29",
          paystackPlanCode: "PLN_test",
          arrangementNote: "Pay both on 29 Sep",
        },
      ],
    };
    const rows = buildCustomPlanTableRows(plan, null);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("payment_arranged");
    expect(rows[0].arrangementNote).toBe("Pay both on 29 Sep");
  });

  it("prefers payment_arranged over pending Paystack billing rows", () => {
    const plan = {
      _id: "plan-arranged-billing",
      firstPaystackPaymentUrl: "https://paystack.shop/pay/example",
      installments: [
        {
          number: 8,
          type: "paystack",
          status: "payment_arranged",
          amount: 588605,
          dueDate: "2026-09-29",
          paystackPlanCode: "PLN_test",
        },
      ],
    };
    const billingPlan = {
      planCode: "CUSTOM-test",
      payments: [
        {
          installmentNumber: 8,
          paymentType: "paystack",
          status: "pending",
          amount: 588605,
        },
      ],
    };
    const rows = buildCustomPlanTableRows(plan, billingPlan);
    expect(rows[0].status).toBe("payment_arranged");
  });
});

describe("buildCustomPlanTableRows — cash then Paystack subscription", () => {
  it("maps Paystack slot 1 to the first Paystack instalment and does not create ghost rows", () => {
    const plan = {
      _id: "cp-ndamulelo",
      installments: [
        { number: 1, type: "cash", status: "paid", amount: 275000, billingRecordId: "eft1" },
        { number: 2, type: "cash", status: "paid", amount: 275000, billingRecordId: "eft2" },
        { number: 3, type: "cash", status: "paid", amount: 275000, billingRecordId: "eft3" },
        {
          number: 4,
          type: "paystack",
          status: "paid",
          amount: 275000,
          billingRecordId: "ps1",
          paystackPlanCode: "PLN_xeo0i3dbkdmbm60",
        },
        { number: 5, type: "paystack", status: "pending", amount: 275000, paystackPlanCode: "PLN_xeo0i3dbkdmbm60" },
        { number: 6, type: "paystack", status: "pending", amount: 275000, paystackPlanCode: "PLN_xeo0i3dbkdmbm60" },
        { number: 7, type: "paystack", status: "pending", amount: 275000, paystackPlanCode: "PLN_xeo0i3dbkdmbm60" },
        { number: 8, type: "paystack", status: "pending", amount: 275000, paystackPlanCode: "PLN_xeo0i3dbkdmbm60" },
      ],
    };
    const billingPlan = {
      payments: [
        { billingRecordId: "eft1", paymentType: "eft", status: "accepted", amount: 275000 },
        { billingRecordId: "eft2", paymentType: "eft", status: "accepted", amount: 275000 },
        { billingRecordId: "eft3", paymentType: "eft", status: "accepted", amount: 275000 },
        {
          billingRecordId: "ps1",
          paymentType: "initial",
          status: "accepted",
          amount: 275000,
          installmentSlot: 1,
          installmentLabel: "Payment 1 of 9",
        },
        {
          billingRecordId: "ps2",
          paymentType: "recurring",
          status: "accepted",
          amount: 275000,
          reference: "2z7mxxx5of",
        },
        {
          billingRecordId: "fail3",
          paymentType: "recurring",
          status: "failed",
          amount: 275000,
          installmentSlot: 3,
          installmentLabel: "Payment 3 of 9",
        },
      ],
    };

    const rows = buildCustomPlanTableRows(plan, billingPlan);
    expect(rows.filter((r) => r._orphan)).toHaveLength(0);
    expect(rows).toHaveLength(8);
    expect(rows.find((r) => r.installmentNumber === 4).status).toBe("accepted");
    expect(rows.find((r) => r.installmentNumber === 5).status).toBe("accepted");
    expect(rows.find((r) => r.installmentNumber === 6).status).toBe("failed");
    expect(rows.filter((r) => r.status === "accepted")).toHaveLength(5);
  });
});

describe("buildCustomPlanTableRows — linked archived Paystack on cash instalments", () => {
  it("does not append a duplicate Paystack Instalment 3", () => {
    const plan = {
      _id: "plan-fs",
      installments: [
        { number: 1, type: "cash", status: "paid", amount: 150000, billingRecordId: "br1" },
        { number: 2, type: "cash", status: "paid", amount: 320000, billingRecordId: "br2" },
        { number: 3, type: "cash", status: "paid", amount: 320000, billingRecordId: "br3" },
      ],
    };
    const billingPlan = {
      planCode: "CUSTOM-new",
      payments: [
        {
          billingRecordId: "br3",
          paymentType: "recurring",
          status: "accepted",
          amount: 320000,
          installmentNumber: 3,
          installmentLabel: "Instalment 3",
        },
      ],
    };
    const rows = buildCustomPlanTableRows(plan, billingPlan);
    expect(rows.filter((r) => r.installmentNumber === 3 || r.installmentLabel === "Instalment 3")).toHaveLength(1);
    expect(rows.filter((r) => r._orphan)).toHaveLength(0);
    expect(customPlanRowTypeKind(rows[2], rows[2]._inst)).toBe("cash");
  });
});

describe("isCustomInstallmentOverdue", () => {
  const now = new Date("2026-09-07T12:00:00.000Z");

  test("pending due today or earlier is overdue", () => {
    expect(isCustomInstallmentOverdue({ status: "pending", dueDate: "2026-08-30T00:00:00.000Z" }, now)).toBe(true);
    expect(isCustomInstallmentOverdue({ status: "pending", dueDate: "2026-09-07T00:00:00.000Z" }, now)).toBe(true);
  });

  test("future pending, paid, and arranged rows are not overdue", () => {
    expect(isCustomInstallmentOverdue({ status: "pending", dueDate: "2026-09-30T00:00:00.000Z" }, now)).toBe(false);
    expect(isCustomInstallmentOverdue({ status: "accepted", dueDate: "2026-08-30T00:00:00.000Z" }, now)).toBe(false);
    expect(isCustomInstallmentOverdue({ status: "payment_arranged", dueDate: "2026-08-30T00:00:00.000Z" }, now)).toBe(
      false
    );
  });
});
