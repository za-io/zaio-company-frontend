import { buildCustomPlanTableRows, customPlanRowTypeKind } from "./customPlanTableRows";

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
});
