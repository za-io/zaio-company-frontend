/** Status: roster presence / high-level bucket */
export const STATUS = {
  all: "all",
  /** In Zaio but no payment plan */
  inZaioNoPlan: "noPlan",
  /** Email not matched to a user */
  notInZaio: "notInZaio",
};

/** Payment plan source (matches backend `planTypes` keys) */
export const PLAN = {
  all: "all",
  /** No plan in Zaio */
  none: "none",
  /** At least one plan type */
  hasAny: "hasAny",
  studentPlan: "studentPlan",
  custom: "custom",
  installmentEft: "installmentEft",
  /** Finer categories (matches backend `planCategories`) */
  upfront: "upfront",
  customEftPaystack: "customEftPaystack",
  manati: "manati",
  /** Standalone Paystack plan (PLN) on StudentPlan; subscription code not linked yet */
  paystackPlan: "paystackPlan",
  paystackOnly: "paystackOnly",
  twoInstallmentsEft: "twoInstallmentsEft",
};

export const PLAN_LABELS = {
  [PLAN.all]: "All plans",
  [PLAN.none]: "No plan",
  [PLAN.hasAny]: "Has any plan",
  /** Excludes rows tagged upfront — they use the Upfront filter (StudentPlan exists for one-off Paystack too). */
  [PLAN.studentPlan]: "Paystack (excl. upfront)",
  [PLAN.custom]: "Custom plan",
  [PLAN.installmentEft]: "EFT installments",
  [PLAN.upfront]: "Upfront",
  [PLAN.customEftPaystack]: "Custom: EFT + Paystack",
  [PLAN.manati]: "Manati",
  [PLAN.paystackPlan]: "Paystack plan (excl. Manati)",
  [PLAN.paystackOnly]: "Paystack subscription",
  [PLAN.twoInstallmentsEft]: "2 installments",
};

/** Keys stored in row.planCategories from the API */
const CATEGORY_KEYS = new Set([
  PLAN.upfront,
  PLAN.customEftPaystack,
  PLAN.manati,
  PLAN.paystackPlan,
  PLAN.paystackOnly,
  PLAN.twoInstallmentsEft,
]);

/**
 * Roster UI: plan filter chips — all / none / has any, then one chip per planCategories bucket.
 * (Legacy planTypes-only filters are not shown; matching still works if called programmatically.)
 */
export const PLAN_FILTER_OPTIONS = [
  PLAN.all,
  PLAN.none,
  PLAN.hasAny,
  PLAN.upfront,
  PLAN.customEftPaystack,
  PLAN.manati,
  PLAN.paystackPlan,
  PLAN.paystackOnly,
  PLAN.twoInstallmentsEft,
];

function matchesStatus(row, status) {
  if (status === STATUS.all) return true;
  if (status === STATUS.inZaioNoPlan) return row.inSystem && !row.hasPaymentPlan;
  if (status === STATUS.notInZaio) return !row.inSystem;
  return true;
}

function matchesPlan(row, plan) {
  if (plan === PLAN.all) return true;
  if (CATEGORY_KEYS.has(plan)) {
    const cats = Array.isArray(row.planCategories) ? row.planCategories : [];
    if (!cats.includes(plan)) return false;
    /** Manati rows often also include paystackPlan; treat them as Manati only — do not match "Paystack plan" alone. */
    if (plan === PLAN.paystackPlan && cats.includes(PLAN.manati)) return false;
    return true;
  }
  const types = Array.isArray(row.planTypes) ? row.planTypes : [];
  if (plan === PLAN.none) return !row.hasPaymentPlan;
  if (plan === PLAN.hasAny) return !!row.hasPaymentPlan;
  if (plan === PLAN.studentPlan) {
    if (!types.includes("studentPlan")) return false;
    const cats = Array.isArray(row.planCategories) ? row.planCategories : [];
    /** StudentPlan is created for any Paystack plan incl. one-off upfront; upfront is filtered separately. */
    if (cats.includes(PLAN.upfront)) return false;
    return true;
  }
  if (plan === PLAN.custom) return types.includes("custom");
  if (plan === PLAN.installmentEft) return types.includes("installmentEft");
  return true;
}

/** AND of status + plan filters */
export function filterRosterRows(rows, status, plan) {
  return rows.filter((row) => matchesStatus(row, status) && matchesPlan(row, plan));
}

/** Human-readable labels for a row's planCategories (for tables). */
export function formatPlanCategories(row) {
  const cats = Array.isArray(row.planCategories) ? row.planCategories : [];
  if (cats.length === 0) return "";
  return cats.map((c) => PLAN_LABELS[c] || c).join(", ");
}
