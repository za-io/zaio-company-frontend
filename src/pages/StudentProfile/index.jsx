import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentProfile, getStudentBilling, getStudentManatiStatement, refreshStudentManatiStatement, getStudentEftSubmissions, getEftSubmissionProofUrl, approveEftSubmission, rejectEftSubmission, addEftPaymentAdmin, getStudentInstallmentPlans, createStudentInstallmentPlan, deleteStudentInstallmentPlan, updateInstallment, splitTwoInstallmentPlan, updateCustomInstallment, splitCustomInstallment, deleteCustomInstallment, getProofByBillingRecordId, attachProofToBillingRecord, deleteBillingRecord, updateBillingRecordStatus, dismissOutstandingPayment, updateCustomPlan, deleteCustomPaymentPlan, getCustomPlans, createCustomPlan, createUpfrontPlan, getPaystackPlanInfo, setupPaystackPlanPreview, setupPaystackPlan, generatePaymentLink, changePaystackPaymentDate, updateSubscriptionCode, updateStandaloneScheduleSlot, removeStandalonePaystackPlan, archiveStudentBillingPlan, getStudentMissCyclesForPlanRemoval, addStudentManatiPlan, blockUser, unblockUser, releasePaymentBlockOverride, updateStudentNumber, updateStudentFinanceExclude, syncPaystackPaymentsToBilling, listStudentPaystackSubscriptions, cancelStudentPaystackSubscription, writeOffUpcomingPayments } from "../../api/student";
import RemovePlanCyclesModal, { suggestedMissCycleIds } from "./RemovePlanCyclesModal";
import { postStudentLoginAsToken, postFinanceRecordPaystackEft, getEditTilesToken } from "../../api/company";
import Loader from "../../components/loader/loader";
import {
  parsePaymentSlotFromRow,
  resolveCustomPlanRowInst,
  buildCustomPlanTableRows,
  getFirstPaystackInstallment,
  customPlanRowTypeKind,
  isCustomInstallmentOverdue,
} from "./customPlanTableRows";
import {
  encodePaystackEftChoice,
  buildPaystackEftPaymentChoices,
  groupPaystackPaymentRows,
  paystackRowStatusLabel,
} from "./paystackEftChoices";
import CustomInstallmentActions from "./CustomInstallmentActions";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
};

const utcDay = (dateStr) => {
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const formatAmount = (amount, currency = "ZAR") => {
  if (amount == null) return "—";
  const value = Number(amount) / 100;
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: currency || "ZAR" }).format(value);
};

const toDateInputValue = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const isAcceptedBillingPayment = (payment) => {
  const status = String(payment?.status || "").toLowerCase();
  return status === "accepted" || status === "paid";
};

const collectArchivedAcceptedPayments = (plans = [], customPlans = []) => {
  const seen = new Set();
  const rows = [];
  const pushRow = ({ billingRecordId, planName, planCode, amountCents, paidAt, dueDate, label }) => {
    const id = billingRecordId != null ? String(billingRecordId) : "";
    if (!id || seen.has(id)) return;
    seen.add(id);
    rows.push({
      billingRecordId: id,
      planName: planName || planCode || "Archived plan",
      planCode: planCode || "",
      amountCents: Number(amountCents) || 0,
      paidAt: paidAt || null,
      dueDate: dueDate || paidAt || null,
      label: label || "Accepted payment",
    });
  };

  for (const plan of plans || []) {
    if (!plan?.archived) continue;
    for (const payment of plan.payments || []) {
      if (!isAcceptedBillingPayment(payment) || !payment.billingRecordId) continue;
      pushRow({
        billingRecordId: payment.billingRecordId,
        planName: plan.planName,
        planCode: plan.planCode,
        amountCents: payment.amount,
        paidAt: payment.paidAt,
        dueDate: payment.dueDate,
        label: payment.installmentLabel || payment.reference || "Accepted payment",
      });
    }
  }

  for (const plan of customPlans || []) {
    if (!plan?.archivedAt) continue;
    for (const inst of plan.installments || []) {
      if (!isAcceptedBillingPayment(inst) || !inst.billingRecordId) continue;
      pushRow({
        billingRecordId: inst.billingRecordId,
        planName: plan.planName,
        planCode: plan.planCode,
        amountCents: inst.amount,
        paidAt: inst.paidAt,
        dueDate: inst.dueDate,
        label: inst.number != null ? `Instalment ${inst.number}` : "Accepted payment",
      });
    }
  }

  return rows;
};

const EMPTY_CUSTOM_INSTALLMENT = {
  amount: "",
  due_date: "",
  type: "cash",
  paystack_plan_code: "",
  paystack_expected_first_date: "",
  paystack_payment_url: "",
  paystackLookup: null,
};

let customInstallmentKeySeq = 0;
const createEmptyCustomInstallment = () => ({
  ...EMPTY_CUSTOM_INSTALLMENT,
  _key: `custom-row-${++customInstallmentKeySeq}`,
});

const createDefaultCustomPlanForm = () => ({
  planName: "",
  manatiAgreementCode: "",
  totalDue: "",
  installments: [createEmptyCustomInstallment()],
});

const installmentRowAmountRands = (row) => {
  if ((row?.type || "cash").toLowerCase() === "paystack") {
    const lookup = row?.paystackLookup;
    if (!lookup) return 0;
    const perPaymentCents = Number(lookup.amount);
    if (!Number.isFinite(perPaymentCents) || perPaymentCents <= 0) return 0;
    const count = Math.min(Math.max(1, Number(lookup.invoice_limit) || 1), 24);
    return (perPaymentCents * count) / 100;
  }
  const amount = Number(row?.amount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const duplicateCustomInstallment = (row) => ({
  ...row,
  _key: `custom-row-${++customInstallmentKeySeq}`,
  due_date: row?.due_date ? addMonthsToDateInput(row.due_date, 1) || row.due_date : "",
  paystack_expected_first_date: row?.paystack_expected_first_date
    ? addMonthsToDateInput(row.paystack_expected_first_date, 1) || row.paystack_expected_first_date
    : "",
});

const parseAmountString = (val) => {
  if (val == null || val === "" || val === "—") return 0;
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const addMonthsToDateInput = (dateStr, months) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const buildSplitRows = (count, inst) => {
  const rows = Math.max(2, Number(count) || 2);
  const baseDate = inst.dueDate ? new Date(inst.dueDate).toISOString().slice(0, 10) : "";
  return Array.from({ length: rows }, (_, idx) => ({
    amount: "",
    dueDate: addMonthsToDateInput(baseDate, idx) || baseDate,
  }));
};

const buildDefaultSplitForm = (inst, paymentCount = 3) => {
  const count = Math.max(2, Number(paymentCount) || 3);
  return {
    paymentCount: count,
    splits: buildSplitRows(count, inst),
    arrangementNote: inst.arrangementNote || "",
  };
};

const resizeSplitRows = (currentSplits, newCount, inst) => {
  const count = Math.max(2, Number(newCount) || 2);
  const baseDate = inst.dueDate ? new Date(inst.dueDate).toISOString().slice(0, 10) : "";
  return Array.from({ length: count }, (_, idx) => {
    if (currentSplits[idx]) return currentSplits[idx];
    return { amount: "", dueDate: addMonthsToDateInput(baseDate, idx) || baseDate };
  });
};

const maxSplitCountForPlan = (plan) => {
  const current = (plan?.installments || []).length;
  return Math.max(2, Math.min(24, 48 - current + 1));
};

const canSplitInstallmentRow = (inst) =>
  !!inst && (inst.status === "pending" || inst.status === "payment_arranged") && inst.type !== "paystack";

const formatTotal = (num) =>
  new Intl.NumberFormat("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

/**
 * zaio-frontend base URL for “Open student dashboard” (impersonate). Baked in at build time.
 * Defaults to production learner; override with REACT_APP_LEARNER_APP_URL (e.g. http://localhost:3000 for local dev).
 */
function getLearnerAppBaseUrl() {
  const fromEnv = (
    process.env.REACT_APP_LEARNER_APP_URL ||
    process.env.REACT_APP_STUDENT_APP_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://www.zaio.io";
}

const StudentProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [paymentBlockStatus, setPaymentBlockStatus] = useState(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [billing, setBilling] = useState({ plans: [], outstandingLinks: [] });
  const [billingLoading, setBillingLoading] = useState(false);
  const [syncPaystackBillingLoading, setSyncPaystackBillingLoading] = useState(false);
  const [syncPaystackBillingMessage, setSyncPaystackBillingMessage] = useState(null);
  const [cancelSubModalOpen, setCancelSubModalOpen] = useState(false);
  const [cancelSubLoading, setCancelSubLoading] = useState(false);
  const [cancelSubList, setCancelSubList] = useState([]);
  const [cancelSubError, setCancelSubError] = useState(null);
  const [cancelSubSuccess, setCancelSubSuccess] = useState(null);
  const [cancelSubActionCode, setCancelSubActionCode] = useState(null);
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [writeOffSelected, setWriteOffSelected] = useState(() => new Set());
  const [writeOffSubmitting, setWriteOffSubmitting] = useState(false);
  const [writeOffMessage, setWriteOffMessage] = useState(null);
  const [dismissingOutstandingId, setDismissingOutstandingId] = useState(null);
  const [statementModal, setStatementModal] = useState(null);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementRefreshing, setStatementRefreshing] = useState(false);
  const [paymentsModalPlan, setPaymentsModalPlan] = useState(null);
  const [openPaymentTries, setOpenPaymentTries] = useState({});
  const [paymentsModalRemoving, setPaymentsModalRemoving] = useState(false);
  const [eftSubmissions, setEftSubmissions] = useState([]);
  const [eftLoading, setEftLoading] = useState(false);
  const [eftActionId, setEftActionId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [addEftModal, setAddEftModal] = useState(false);
  const [addEftForm, setAddEftForm] = useState({
    planCode: "",
    paymentDate: "",
    amount: "",
    file: null,
    installmentPlanId: "",
    installmentNumber: "",
    customPlanId: "",
    replaceBillingRecordId: "",
  });
  const [addEftPaystackInitialDisclaimer, setAddEftPaystackInitialDisclaimer] = useState(false);
  const [addEftSubmitting, setAddEftSubmitting] = useState(false);
  const [addEftError, setAddEftError] = useState(null);
  const [installmentPlans, setInstallmentPlans] = useState([]);
  const [installmentPlansLoading, setInstallmentPlansLoading] = useState(false);
  const [addInstallmentModal, setAddInstallmentModal] = useState(false);
  const [addInstallmentForm, setAddInstallmentForm] = useState({ amount1: "", amount2: "", dueDate1: "", dueDate2: "", planName: "" });
  const [addInstallmentSubmitting, setAddInstallmentSubmitting] = useState(false);
  const [addInstallmentError, setAddInstallmentError] = useState(null);
  const [editInstallmentModal, setEditInstallmentModal] = useState(null);
  const [editInstallmentForm, setEditInstallmentForm] = useState({ amount: "", dueDate: "" });
  const [editInstallmentSubmitting, setEditInstallmentSubmitting] = useState(false);
  const [editInstallmentError, setEditInstallmentError] = useState(null);
  const [attachProofModal, setAttachProofModal] = useState(null);
  const [attachProofFile, setAttachProofFile] = useState(null);
  const [attachProofSubmitting, setAttachProofSubmitting] = useState(false);
  const [attachProofError, setAttachProofError] = useState(null);
  const [customPlans, setCustomPlans] = useState([]);
  const [customPlansLoading, setCustomPlansLoading] = useState(false);
  const [addCustomModal, setAddCustomModal] = useState(false);
  const [addCustomModalOffset, setAddCustomModalOffset] = useState({ x: 0, y: 0 });
  const addCustomModalDragRef = useRef(null);
  const [copiedArchivedPaymentIds, setCopiedArchivedPaymentIds] = useState([]);
  const [addCustomForm, setAddCustomForm] = useState(createDefaultCustomPlanForm);
  const [paystackLookupLoading, setPaystackLookupLoading] = useState(null);
  const [addCustomSubmitting, setAddCustomSubmitting] = useState(false);
  const [addCustomError, setAddCustomError] = useState(null);
  const [linkPaystackForm, setLinkPaystackForm] = useState({ planCode: "", payerEmail: "", subscriptionCode: "" });
  const [linkPaystackMessage, setLinkPaystackMessage] = useState(null);
  const [paystackPreview, setPaystackPreview] = useState(null);
  const [paystackPreviewLoading, setPaystackPreviewLoading] = useState(false);
  const [paystackSelectedRefs, setPaystackSelectedRefs] = useState(new Set());
  const [paystackSaveLoading, setPaystackSaveLoading] = useState(false);
  const [generateLinkLoading, setGenerateLinkLoading] = useState(false);
  const [updatePaymentStatusLoading, setUpdatePaymentStatusLoading] = useState(null);
  const [backfillCustomPlan, setBackfillCustomPlan] = useState(null);
  const [linkManatiCode, setLinkManatiCode] = useState("");
  const [linkManatiMessage, setLinkManatiMessage] = useState(null);
  const [linkManatiSubmitting, setLinkManatiSubmitting] = useState(false);
  const [addUpfrontModal, setAddUpfrontModal] = useState(false);
  const [addUpfrontForm, setAddUpfrontForm] = useState({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), file: null });
  const [addUpfrontSubmitting, setAddUpfrontSubmitting] = useState(false);
  const [addUpfrontError, setAddUpfrontError] = useState(null);
  const [studentNumberValue, setStudentNumberValue] = useState("");
  const [studentNumberSaving, setStudentNumberSaving] = useState(false);
  const [studentNumberMessage, setStudentNumberMessage] = useState(null);
  const [financeExcludeSaving, setFinanceExcludeSaving] = useState(false);
  const [financeExcludeMessage, setFinanceExcludeMessage] = useState(null);
  const [deleteRecordModal, setDeleteRecordModal] = useState(null);
  const [deleteRecordSubmitting, setDeleteRecordSubmitting] = useState(false);
  const [deleteRecordError, setDeleteRecordError] = useState(null);
  const [removeWholePlanLoading, setRemoveWholePlanLoading] = useState(null);
  const [archivePlanLoading, setArchivePlanLoading] = useState(null);
  const [removePlanModal, setRemovePlanModal] = useState(null);
  const [editPlanModal, setEditPlanModal] = useState(null);
  const [editPlanForm, setEditPlanForm] = useState({ planName: "", manatiAgreementCode: "", newInstallments: [] });
  const [editPlanSubmitting, setEditPlanSubmitting] = useState(false);
  const [editPlanError, setEditPlanError] = useState(null);
  const [editPlanPaystackLookupLoading, setEditPlanPaystackLookupLoading] = useState(null);
  const [changeDateModal, setChangeDateModal] = useState(null);
  const [changeDateForm, setChangeDateForm] = useState({ mode: "day", dayOfMonth: "1", specificDate: "" });
  const [changeDateLoading, setChangeDateLoading] = useState(false);
  const [changeDateError, setChangeDateError] = useState(null);
  const [subscriptionCodeModal, setSubscriptionCodeModal] = useState(null);
  const [subscriptionCodeForm, setSubscriptionCodeForm] = useState({ subscriptionCode: "" });
  const [subscriptionCodeLoading, setSubscriptionCodeLoading] = useState(false);
  const [subscriptionCodeError, setSubscriptionCodeError] = useState(null);
  const [loginAsPassword, setLoginAsPassword] = useState("");
  const [loginAsLoading, setLoginAsLoading] = useState(false);
  const [loginAsMessage, setLoginAsMessage] = useState(null);
  /** Custom plan table: inline due date save — key `${planId}-${installmentNumber}` */
  const [inlineCustomDueSaving, setInlineCustomDueSaving] = useState(null);
  const [markArrangedSaving, setMarkArrangedSaving] = useState(null);
  const [clearArrangementSaving, setClearArrangementSaving] = useState(null);
  const [installmentHistoryModal, setInstallmentHistoryModal] = useState(null);
  const [revertHistorySaving, setRevertHistorySaving] = useState(null);
  const [instActionsMenuKey, setInstActionsMenuKey] = useState(null);
  const [splitInstallmentModal, setSplitInstallmentModal] = useState(null);
  const [splitForm, setSplitForm] = useState({ paymentCount: 3, splits: [{ amount: "", dueDate: "" }, { amount: "", dueDate: "" }, { amount: "", dueDate: "" }], arrangementNote: "" });
  const [splitSubmitting, setSplitSubmitting] = useState(false);
  const [splitError, setSplitError] = useState(null);

  /** Standalone Paystack subscription: record EFT (same as POST /bootcamp/finance-record-paystack-eft) */
  const [paystackEftModal, setPaystackEftModal] = useState(null);
  const [paystackEftPaidAt, setPaystackEftPaidAt] = useState("");
  const [paystackEftAmountRands, setPaystackEftAmountRands] = useState("");
  const [paystackEftProofUrl, setPaystackEftProofUrl] = useState("");
  const [paystackEftProofFile, setPaystackEftProofFile] = useState(null);
  const [paystackEftSubmitting, setPaystackEftSubmitting] = useState(false);
  const [paystackEftError, setPaystackEftError] = useState(null);
  const [paystackEftPaymentChoice, setPaystackEftPaymentChoice] = useState("");

  const openPaystackEftModal = (plan, preferredRow = null) => {
    const choices = buildPaystackEftPaymentChoices(plan);
    let defaultChoice = "";
    if (preferredRow) {
      const prSlot =
        preferredRow.installmentSlot != null && preferredRow.installmentSlot >= 1
          ? preferredRow.installmentSlot
          : parsePaymentSlotFromRow(preferredRow);
      const match = choices.find(
        (c) =>
          (preferredRow.outstandingPaymentId &&
            c.outstandingPaymentId &&
            String(c.outstandingPaymentId) === String(preferredRow.outstandingPaymentId)) ||
          (preferredRow.billingRecordId &&
            c.billingRecordId &&
            String(c.billingRecordId) === String(preferredRow.billingRecordId)) ||
          (prSlot != null &&
            c.installmentSlot === prSlot &&
            !preferredRow.outstandingPaymentId &&
            !preferredRow.billingRecordId)
      );
      defaultChoice = encodePaystackEftChoice(
        match || {
          installmentSlot: prSlot,
          outstandingPaymentId: preferredRow.outstandingPaymentId || null,
          billingRecordId: preferredRow.billingRecordId || null,
        }
      );
    } else if (choices.length >= 1) {
      defaultChoice = encodePaystackEftChoice(choices[0]);
    }
    setPaystackEftModal({ plan });
    setPaystackEftPaymentChoice(defaultChoice);
    setPaystackEftPaidAt(new Date().toISOString().slice(0, 10));
    const centsFromPreferred =
      preferredRow?.amount != null ? Number(preferredRow.amount) : null;
    const centsFromChoice = choices[0]?.amountCents;
    const cents = centsFromPreferred ?? centsFromChoice ?? plan.amount;
    const n = cents != null ? Number(cents) : NaN;
    setPaystackEftAmountRands(Number.isFinite(n) ? (n / 100).toFixed(2) : "");
    setPaystackEftProofUrl("");
    setPaystackEftProofFile(null);
    setPaystackEftError(null);
  };

  const submitPaystackEft = async (e) => {
    e.preventDefault();
    if (!paystackEftModal?.plan || !userId) return;
    const plan = paystackEftModal.plan;
    const totalReq = plan.totalPaymentsRequired != null ? Number(plan.totalPaymentsRequired) : null;
    const choiceList = buildPaystackEftPaymentChoices(plan);
    if (choiceList.length > 0 && !paystackEftPaymentChoice.trim()) {
      setPaystackEftError("Select which payment this EFT is for.");
      return;
    }
    if (choiceList.length === 0 && totalReq != null && Number.isFinite(totalReq) && totalReq >= 1) {
      setPaystackEftError("No payment lines to attach this EFT to. Try refreshing billing.");
      return;
    }
    const rands = parseFloat(String(paystackEftAmountRands).replace(",", "."));
    if (!Number.isFinite(rands) || rands <= 0) {
      setPaystackEftError("Enter a valid amount in rands.");
      return;
    }
    const amountCents = Math.round(rands * 100);
    setPaystackEftSubmitting(true);
    setPaystackEftError(null);
    const fd = new FormData();
    fd.append("userId", userId);
    fd.append("planCode", plan.planCode);
    fd.append("paidAt", paystackEftPaidAt);
    fd.append("amountCents", String(amountCents));
    if (paystackEftPaymentChoice.trim()) {
      try {
        const ch = JSON.parse(paystackEftPaymentChoice);
        if (ch.installmentSlot != null && ch.installmentSlot >= 1) {
          fd.append("installmentSlot", String(ch.installmentSlot));
        }
        if (ch.outstandingPaymentId) {
          fd.append("outstandingPaymentId", String(ch.outstandingPaymentId));
        }
        if (ch.billingRecordId) {
          fd.append("billingRecordId", String(ch.billingRecordId));
        }
      } catch {
        setPaystackEftError("Invalid payment selection.");
        setPaystackEftSubmitting(false);
        return;
      }
    }
    if (paystackEftProofUrl.trim()) fd.append("proofUrl", paystackEftProofUrl.trim());
    if (paystackEftProofFile) fd.append("proof", paystackEftProofFile);
    const res = await postFinanceRecordPaystackEft(fd);
    setPaystackEftSubmitting(false);
    if (res?.success) {
      setPaystackEftModal(null);
      setPaystackEftPaymentChoice("");
      const billingRes = await getStudentBilling(userId);
      if (billingRes?.success && billingRes.plans) {
        setBilling({ plans: billingRes.plans, outstandingLinks: billingRes.outstandingLinks || [] });
        setPaymentsModalPlan((prev) => {
          if (!prev) return prev;
          const u = billingRes.plans.find((pl) => pl.planCode === prev.planCode);
          return u || prev;
        });
      }
    } else {
      setPaystackEftError(res?.message || "Could not record payment");
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    console.log("Fetching profile for userId:", userId);
    try {
      const result = await getStudentProfile(userId);
      console.log("Profile result:", result);
      if (result?.success) {
        setStudent(result.student);
        setPaymentBlockStatus(result.paymentBlockStatus || null);
        setStudentNumberValue(result.student?.studentNumber ?? "");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
    setLoading(false);
  };

  const fetchBilling = async () => {
    if (!userId) return;
    setBillingLoading(true);
    try {
      const result = await getStudentBilling(userId);
      if (result?.success) {
        setBilling({
          plans: result.plans || [],
          outstandingLinks: result.outstandingLinks || [],
        });
      }
    } catch (err) {
      console.error("Error fetching billing:", err);
    }
    setBillingLoading(false);
  };

  const handleSyncPaystackPaymentsToBilling = async () => {
    if (!userId) return;
    setSyncPaystackBillingLoading(true);
    setSyncPaystackBillingMessage(null);
    try {
      const res = await syncPaystackPaymentsToBilling(userId, (student?.email || "").trim() || undefined);
      if (res.success) {
        setSyncPaystackBillingMessage({ type: "success", text: res.message || "Sync complete." });
        await fetchBilling();
      } else {
        setSyncPaystackBillingMessage({ type: "error", text: res.message || "Sync failed." });
      }
    } catch (e) {
      setSyncPaystackBillingMessage({ type: "error", text: e?.message || "Sync failed." });
    }
    setSyncPaystackBillingLoading(false);
  };

  const openCancelSubModal = async () => {
    setCancelSubModalOpen(true);
    setCancelSubError(null);
    setCancelSubSuccess(null);
    setCancelSubList([]);
    setCancelSubLoading(true);
    try {
      const res = await listStudentPaystackSubscriptions(userId);
      if (res.success) {
        setCancelSubList(Array.isArray(res.subscriptions) ? res.subscriptions : []);
      } else {
        setCancelSubError(res.message || "Could not load Paystack subscriptions");
      }
    } catch (e) {
      setCancelSubError(e?.message || "Could not load Paystack subscriptions");
    } finally {
      setCancelSubLoading(false);
    }
  };

  const archivedAcceptedPayments = useMemo(
    () => collectArchivedAcceptedPayments(billing.plans, customPlans),
    [billing.plans, customPlans]
  );

  const activeCustomPlans = useMemo(
    () => (customPlans || []).filter((plan) => !plan.archivedAt),
    [customPlans]
  );
  const archivedCustomPlans = useMemo(
    () => (customPlans || []).filter((plan) => plan.archivedAt),
    [customPlans]
  );
  const activeInstallmentPlans = useMemo(
    () => (installmentPlans || []).filter((plan) => !plan.archivedAt),
    [installmentPlans]
  );
  const archivedInstallmentPlans = useMemo(
    () => (installmentPlans || []).filter((plan) => plan.archivedAt),
    [installmentPlans]
  );
  const activeBillingPlans = useMemo(
    () => (billing.plans || []).filter((plan) => !plan.archived),
    [billing.plans]
  );
  const archivedBillingPlans = useMemo(
    () => (billing.plans || []).filter((plan) => plan.archived),
    [billing.plans]
  );
  const archivedStandaloneBillingPlans = useMemo(
    () => archivedBillingPlans.filter((plan) => {
      const code = plan.planCode || "";
      return !code.startsWith("CUSTOM-") && !code.startsWith("2INST-");
    }),
    [archivedBillingPlans]
  );
  const hasArchivedHistory =
    archivedCustomPlans.length > 0 ||
    archivedInstallmentPlans.length > 0 ||
    archivedStandaloneBillingPlans.length > 0;

  const addCustomPlanTotals = useMemo(() => {
    const selectedArchived = archivedAcceptedPayments.filter((payment) =>
      copiedArchivedPaymentIds.includes(payment.billingRecordId)
    );
    const collectedCents = selectedArchived.reduce((sum, payment) => sum + (Number(payment.amountCents) || 0), 0);
    const scheduledRands = (addCustomForm.installments || []).reduce(
      (sum, row) => sum + installmentRowAmountRands(row),
      0
    );
    const scheduledCents = Math.round(scheduledRands * 100);
    const totalDueRands = Number(addCustomForm.totalDue);
    const hasTotalDue = Number.isFinite(totalDueRands) && totalDueRands > 0;
    const totalDueCents = hasTotalDue ? Math.round(totalDueRands * 100) : collectedCents + scheduledCents;
    let leftoverCents = totalDueCents;
    const leftoverAfterCollected = {};
    for (const payment of selectedArchived) {
      leftoverCents -= Number(payment.amountCents) || 0;
      leftoverAfterCollected[payment.billingRecordId] = leftoverCents;
    }
    const leftoverAfterRows = (addCustomForm.installments || []).map((row) => {
      leftoverCents -= Math.round(installmentRowAmountRands(row) * 100);
      return leftoverCents;
    });
    return {
      selectedArchived,
      collectedCents,
      scheduledCents,
      totalDueCents,
      remainingCents: leftoverCents,
      leftoverAfterCollected,
      leftoverAfterRows,
      hasTotalDue,
    };
  }, [archivedAcceptedPayments, copiedArchivedPaymentIds, addCustomForm.installments, addCustomForm.totalDue]);

  const upcomingWriteOffRows = useMemo(() => {
    const rows = [];
    (billing.plans || []).forEach((plan) => {
      (plan.upcomingPayments || []).forEach((up, idx) => {
        if (!up?.writeOff) return;
        rows.push({
          rowKey: `${plan.planCode}-${idx}-${up.installmentLabel || ""}-${up.amount}`,
          plan,
          up,
        });
      });
    });
    return rows;
  }, [billing.plans]);

  const openWriteOffModal = async () => {
    setWriteOffMessage(null);
    setWriteOffSelected(() => new Set());
    setWriteOffModalOpen(true);
    await fetchBilling();
  };

  const toggleWriteOffRow = (writeOffObj) => {
    const k = JSON.stringify(writeOffObj);
    setWriteOffSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleSubmitWriteOff = async () => {
    const items = [...writeOffSelected].map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (items.length === 0) {
      setWriteOffMessage({ type: "error", text: "Select at least one upcoming payment to write off." });
      return;
    }
    setWriteOffSubmitting(true);
    setWriteOffMessage(null);
    try {
      const res = await writeOffUpcomingPayments(userId, items);
      if (res.success) {
        setWriteOffMessage({ type: "success", text: res.message || "Written off." });
        setWriteOffSelected(() => new Set());
        await fetchBilling();
      } else {
        setWriteOffMessage({ type: "error", text: res.message || "Failed." });
      }
    } catch (e) {
      setWriteOffMessage({ type: "error", text: e?.message || "Failed." });
    } finally {
      setWriteOffSubmitting(false);
    }
  };

  const handleCancelOnePaystackSubscription = async (subscriptionCode) => {
    if (!subscriptionCode) return;
    const ok = window.confirm(
      `Cancel Paystack subscription ${subscriptionCode}? This stops recurring debits for this plan.`
    );
    if (!ok) return;
    setCancelSubActionCode(subscriptionCode);
    setCancelSubError(null);
    setCancelSubSuccess(null);
    try {
      const res = await cancelStudentPaystackSubscription(userId, subscriptionCode);
      if (res.success) {
        setCancelSubSuccess(res.message || "Subscription cancelled.");
        setCancelSubList((prev) => prev.filter((s) => s.subscription_code !== subscriptionCode));
        await fetchBilling();
      } else {
        setCancelSubError(res.message || "Cancel failed");
      }
    } catch (e) {
      setCancelSubError(e?.message || "Cancel failed");
    } finally {
      setCancelSubActionCode(null);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    setOpenPaymentTries({});
  }, [paymentsModalPlan?.planCode]);

  useEffect(() => {
    if (userId) {
      fetchBilling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when userId changes only
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setEftLoading(true);
    getStudentEftSubmissions(userId)
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.data)) setEftSubmissions(res.data);
      })
      .finally(() => { if (!cancelled) setEftLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setInstallmentPlansLoading(true);
    getStudentInstallmentPlans(userId)
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.data)) setInstallmentPlans(res.data);
      })
      .finally(() => { if (!cancelled) setInstallmentPlansLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setCustomPlansLoading(true);
    getCustomPlans(userId)
      .then((res) => {
        if (!cancelled && res.success && Array.isArray(res.data)) setCustomPlans(res.data);
      })
      .finally(() => { if (!cancelled) setCustomPlansLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const handleSaveStudentNumber = async () => {
    if (!userId) return;
    setStudentNumberMessage(null);
    setStudentNumberSaving(true);
    try {
      const res = await updateStudentNumber(userId, studentNumberValue.trim() || null);
      if (res.success) {
        setStudent((s) => (s ? { ...s, studentNumber: studentNumberValue.trim() || null } : s));
        setStudentNumberMessage("Student number saved");
        setTimeout(() => setStudentNumberMessage(null), 3000);
      } else {
        setStudentNumberMessage(res.message || "Failed to save");
      }
    } catch (err) {
      setStudentNumberMessage("Failed to save student number");
    }
    setStudentNumberSaving(false);
  };

  const handleFinanceExcludeToggle = async (e) => {
    if (!userId) return;
    const next = e.target.checked;
    setFinanceExcludeMessage(null);
    setFinanceExcludeSaving(true);
    try {
      const res = await updateStudentFinanceExclude(userId, next);
      if (res?.success && res.student) {
        setStudent((s) =>
          s ? { ...s, excludeFromFinanceReports: !!res.student.excludeFromFinanceReports } : s
        );
      } else {
        setFinanceExcludeMessage(res?.message || "Failed to update");
      }
    } catch (err) {
      setFinanceExcludeMessage("Failed to update");
    }
    setFinanceExcludeSaving(false);
  };

  const handleBlockToggle = async () => {
    if (!student) return;
    setBlockLoading(true);
    
    if (student.accBlocked) {
      await unblockUser({ userid: student._id, hard: true });
    } else {
      await blockUser({ userid: student._id });
    }
    
    await fetchProfile();
    setBlockLoading(false);
  };

  const handleReleasePaymentBlockOverride = async () => {
    if (!student) return;
    setBlockLoading(true);
    await releasePaymentBlockOverride({ userid: student._id });
    await fetchProfile();
    setBlockLoading(false);
  };

  const openBootcampAnalytics = (bootcamp) => {
    if (!bootcamp?._id) return;
    const params = new URLSearchParams({ bootcamp: String(bootcamp._id) });
    const email = String(student?.email || "").trim();
    if (email) params.set("q", email);
    window.open(`/student/analytics?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const openLearnerProgressProfile = async () => {
    const email = String(student?.email || "").trim();
    if (!email) return;
    const baseUrl = `https://www.zaio.io/app/zaio-profile/${email}`;
    try {
      const res = await getEditTilesToken(email);
      const qs = res?.success && res?.token ? `?editTiles=${encodeURIComponent(res.token)}` : "";
      window.open(baseUrl + qs, "_blank", "noopener,noreferrer");
    } catch {
      window.open(baseUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenLearnerAsStudent = async () => {
    if (!userId) return;
    setLoginAsLoading(true);
    setLoginAsMessage(null);
    try {
      const res = await postStudentLoginAsToken({
        studentUserId: userId,
        password: loginAsPassword.trim(),
      });
      if (!res?.success || !res?.token) {
        setLoginAsMessage(res?.message || "Could not start student session");
        return;
      }
      const session = {
        success: res.success,
        message: res.message,
        token: res.token,
        data: res.data,
      };
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(session))));
      const learnerBase = getLearnerAppBaseUrl();
      const url = `${learnerBase}/impersonate-session?session=${encodeURIComponent(b64)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      setLoginAsMessage("Opened learner app in a new tab.");
      setTimeout(() => setLoginAsMessage(null), 5000);
    } catch (err) {
      setLoginAsMessage(err?.message || "Failed");
    } finally {
      setLoginAsLoading(false);
    }
  };

  const handleManatiRowClick = async (plan) => {
    const code = plan.agreementCode || plan.planCode;
    if (!code) return;
    setStatementModal({ agreementCode: code, planName: plan.planName || plan.planCode });
    setStatementData(null);
    setStatementLoading(true);
    try {
      const res = await getStudentManatiStatement(userId, code);
      setStatementData(res.success ? res.data : null);
    } catch (err) {
      setStatementData(null);
    }
    setStatementLoading(false);
  };

  const closeStatementModal = () => {
    setStatementModal(null);
    setStatementData(null);
  };

  const handleRefreshManatiStatement = async () => {
    if (!statementModal?.agreementCode || !userId) return;
    setStatementRefreshing(true);
    try {
      const res = await refreshStudentManatiStatement(userId, statementModal.agreementCode);
      if (res.success && res.data) {
        setStatementData(res.data);
        await fetchBilling();
      }
    } catch (err) {
      console.error("Manati refresh failed", err);
    }
    setStatementRefreshing(false);
  };

  const handleBillingRowClick = (plan) => {
    if (plan.partner === "Manati") {
      handleManatiRowClick(plan);
    } else {
      setOpenPaymentTries({});
      setPaymentsModalPlan(plan);
    }
  };

  const handleViewEftProof = async (submissionId) => {
    const res = await getEftSubmissionProofUrl(userId, submissionId);
    if (res.success && res.data?.url) window.open(res.data.url, "_blank");
    else alert(res.message || "Could not open proof");
  };

  const handleApproveEft = async (submissionId) => {
    setEftActionId(submissionId);
    const res = await approveEftSubmission(userId, submissionId);
    setEftActionId(null);
    if (res.success) {
      const listRes = await getStudentEftSubmissions(userId);
      if (listRes.success && Array.isArray(listRes.data)) setEftSubmissions(listRes.data);
      fetchBilling();
    } else alert(res.message || "Approve failed");
  };

  const handleRejectEft = async (submissionId, reason) => {
    setEftActionId(submissionId);
    const res = await rejectEftSubmission(userId, submissionId, reason);
    setEftActionId(null);
    setRejectModal(null);
    if (res.success) {
      const listRes = await getStudentEftSubmissions(userId);
      if (listRes.success && Array.isArray(listRes.data)) setEftSubmissions(listRes.data);
    } else alert(res.message || "Reject failed");
  };

  const handleAddInstallmentPlanSubmit = async (e) => {
    e.preventDefault();
    setAddInstallmentError(null);
    const amount1 = Number(addInstallmentForm.amount1);
    const amount2 = Number(addInstallmentForm.amount2);
    const dueDate2 = (addInstallmentForm.dueDate2 || "").trim();
    if (!(amount1 > 0 && amount2 > 0)) {
      setAddInstallmentError("Amount 1 and Amount 2 must be positive numbers (Rands).");
      return;
    }
    if (!dueDate2) {
      setAddInstallmentError("Due date for installment 2 is required.");
      return;
    }
    setAddInstallmentSubmitting(true);
    try {
      const res = await createStudentInstallmentPlan(userId, {
        amount1,
        amount2,
        due_date1: (addInstallmentForm.dueDate1 || "").trim() || undefined,
        due_date2: dueDate2,
        plan_name: (addInstallmentForm.planName || "").trim() || undefined,
      });
      if (res.success) {
        setAddInstallmentModal(false);
        setAddInstallmentForm({ amount1: "", amount2: "", dueDate1: "", dueDate2: "", planName: "" });
        const listRes = await getStudentInstallmentPlans(userId);
        if (listRes.success && Array.isArray(listRes.data)) setInstallmentPlans(listRes.data);
        fetchBilling();
      } else {
        setAddInstallmentError(res.message || "Failed to create plan");
      }
    } catch (err) {
      setAddInstallmentError(err?.response?.data?.message || "Failed to create plan");
    } finally {
      setAddInstallmentSubmitting(false);
    }
  };

  const handleEditInstallmentClick = (plan, inst, planType = "2_installment") => {
    setEditInstallmentModal({ plan, inst, planType });
    setEditInstallmentForm({
      amount: inst.amount != null ? (Number(inst.amount) / 100).toString() : "",
      dueDate: inst.dueDate ? new Date(inst.dueDate).toISOString().slice(0, 10) : "",
    });
    setEditInstallmentError(null);
  };

  const refreshInstallmentPlans = async (planType) => {
    if (planType === "custom") {
      const listRes = await getCustomPlans(userId);
      if (listRes.success && Array.isArray(listRes.data)) setCustomPlans(listRes.data);
    } else {
      const listRes = await getStudentInstallmentPlans(userId);
      if (listRes.success && Array.isArray(listRes.data)) setInstallmentPlans(listRes.data);
    }
    fetchBilling();
  };

  const patchInstallment = (planType, planId, installmentNumber, payload) =>
    planType === "custom"
      ? updateCustomInstallment(userId, planId, installmentNumber, payload)
      : updateInstallment(userId, planId, installmentNumber, payload);

  const handleStandaloneDueDateBlur = async (plan, row, newValueRaw) => {
    const slot = parsePaymentSlotFromRow(row);
    if (slot == null || !plan?.planCode) return;
    const prev = row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : "";
    const newValue = (newValueRaw || "").trim();
    if (!newValue || newValue === prev) return;
    const key = `standalone-${plan.planCode}-${slot}`;
    setInlineCustomDueSaving(key);
    try {
      const res = await updateStandaloneScheduleSlot(userId, {
        planCode: plan.planCode,
        paymentSlot: slot,
        dueDate: newValue.replace(/\//g, "-"),
      });
      if (res.success) {
        const billingRes = await getStudentBilling(userId);
        if (billingRes?.success) {
          setBilling({
            plans: billingRes.plans || [],
            outstandingLinks: billingRes.outstandingLinks || [],
          });
          const updated = (billingRes.plans || []).find((p) => p.planCode === plan.planCode);
          if (updated) setPaymentsModalPlan(updated);
        }
      } else {
        alert(res.message || "Could not update due date");
      }
    } catch (err) {
      alert(err?.response?.data?.message ?? err?.message ?? "Could not update due date");
    } finally {
      setInlineCustomDueSaving(null);
    }
  };

  const handleInlineDueDateBlur = async (plan, inst, planType, newValueRaw) => {
    const prev = inst.dueDate ? new Date(inst.dueDate).toISOString().slice(0, 10) : "";
    const newValue = (newValueRaw || "").trim();
    if (newValue === prev) return;
    if (!newValue) {
      return;
    }
    const planId = plan._id?.toString?.() ?? plan._id;
    const key = `${planId}-${inst.number}`;
    setInlineCustomDueSaving(key);
    try {
      const res = await patchInstallment(planType, planId, inst.number, {
        due_date: newValue.replace(/\//g, "-"),
        mark_payment_arranged: inst.status === "pending" || inst.status === "payment_arranged",
      });
      if (res.success) {
        await refreshInstallmentPlans(planType);
      } else {
        alert(res.message || "Could not update due date");
      }
    } catch (err) {
      alert(err?.response?.data?.message ?? err?.message ?? "Could not update due date");
    } finally {
      setInlineCustomDueSaving(null);
    }
  };

  const handleMarkPaymentArranged = async (plan, inst, planType = "custom", note = "") => {
    const planId = plan._id?.toString?.() ?? plan._id;
    const key = `${planId}-${inst.number}`;
    setMarkArrangedSaving(key);
    try {
      const payload = { mark_payment_arranged: true };
      if (note) payload.arrangement_note = note;
      const res = await patchInstallment(planType, planId, inst.number, payload);
      if (res.success) {
        await refreshInstallmentPlans(planType);
      } else {
        alert(res.message || "Could not mark payment arranged");
      }
    } catch (err) {
      alert(err?.response?.data?.message ?? err?.message ?? "Could not mark payment arranged");
    } finally {
      setMarkArrangedSaving(null);
    }
  };

  const handleClearPaymentArrangement = async (plan, inst, planType = "custom") => {
    const planId = plan._id?.toString?.() ?? plan._id;
    const key = `${planId}-${inst.number}`;
    setClearArrangementSaving(key);
    try {
      const res = await patchInstallment(planType, planId, inst.number, { clear_arrangement: true });
      if (res.success) {
        await refreshInstallmentPlans(planType);
      } else {
        alert(res.message || "Could not clear arrangement");
      }
    } catch (err) {
      alert(err?.response?.data?.message ?? err?.message ?? "Could not clear arrangement");
    } finally {
      setClearArrangementSaving(null);
    }
  };

  const handleRevertInstallmentHistory = async (plan, inst, historyId, planType = "custom") => {
    const planId = plan._id?.toString?.() ?? plan._id;
    const key = `${planId}-${inst.number}-${historyId}`;
    setRevertHistorySaving(key);
    try {
      const res = await patchInstallment(planType, planId, inst.number, { revert_history_id: historyId });
      if (res.success) {
        await refreshInstallmentPlans(planType);
        const updatedInst = (res.data?.installments || []).find((i) => i.number === inst.number);
        if (updatedInst) {
          setInstallmentHistoryModal({ plan: res.data, inst: updatedInst, planType });
        } else {
          setInstallmentHistoryModal(null);
        }
      } else {
        alert(res.message || "Could not revert change");
      }
    } catch (err) {
      alert(err?.response?.data?.message ?? err?.message ?? "Could not revert change");
    } finally {
      setRevertHistorySaving(null);
    }
  };

  const handleSplitInstallmentClick = (plan, inst, planType) => {
    setSplitInstallmentModal({
      plan,
      inst,
      planType,
      maxSplitCount: maxSplitCountForPlan(plan),
    });
    setSplitForm(buildDefaultSplitForm(inst, 3));
    setSplitError(null);
  };

  const handleSplitInstallmentSubmit = async (e) => {
    e.preventDefault();
    if (!splitInstallmentModal) return;
    setSplitError(null);

    const sourceAmount = Number(splitInstallmentModal.inst.amount || 0);
    const splits = (splitForm.splits || []).map((row, idx) => {
      const amount = parseAmountString(row.amount);
      const dueDate = (row.dueDate || "").trim();
      if (!(amount > 0)) {
        throw new Error(`Split ${idx + 1}: enter a positive amount`);
      }
      if (!dueDate) {
        throw new Error(`Split ${idx + 1}: due date is required`);
      }
      return { amount, due_date: dueDate.replace(/\//g, "-") };
    });

    if (splits.length < 2) {
      setSplitError("Add at least 2 split payments.");
      return;
    }

    const totalCents = splits.reduce((sum, row) => sum + Math.round(row.amount * 100), 0);
    if (totalCents !== sourceAmount) {
      setSplitError(
        `Split amounts must total ${formatAmount(sourceAmount, splitInstallmentModal.plan.currency)} (currently ${formatAmount(totalCents, splitInstallmentModal.plan.currency)}).`
      );
      return;
    }

    setSplitSubmitting(true);
    try {
      const planId = splitInstallmentModal.plan._id?.toString?.() ?? splitInstallmentModal.plan._id;
      const payload = {
        splits,
        arrangement_note: (splitForm.arrangementNote || "").trim() || undefined,
      };
      const planType = splitInstallmentModal.planType;
      const res =
        planType === "custom"
          ? await splitCustomInstallment(userId, planId, splitInstallmentModal.inst.number, payload)
          : await splitTwoInstallmentPlan(userId, planId, splitInstallmentModal.inst.number, payload);

      if (res.success) {
        setSplitInstallmentModal(null);
        if (res.convertedToCustom) {
          const [instRes, customRes] = await Promise.all([
            getStudentInstallmentPlans(userId),
            getCustomPlans(userId),
          ]);
          if (instRes.success && Array.isArray(instRes.data)) setInstallmentPlans(instRes.data);
          if (customRes.success && Array.isArray(customRes.data)) setCustomPlans(customRes.data);
        } else {
          await refreshInstallmentPlans("custom");
        }
        fetchBilling();
      } else {
        setSplitError(res.message || "Could not split instalment");
      }
    } catch (err) {
      setSplitError(err?.message || err?.response?.data?.message || "Could not split instalment");
    } finally {
      setSplitSubmitting(false);
    }
  };

  const handleEditInstallmentSubmit = async (e) => {
    e.preventDefault();
    if (!editInstallmentModal) return;
    setEditInstallmentError(null);
    const amount = parseAmountString(editInstallmentForm.amount);
    const dueDate = (editInstallmentForm.dueDate || "").trim();
    if (!(amount > 0) && !dueDate) {
      setEditInstallmentError("Provide amount and/or due date.");
      return;
    }
    setEditInstallmentSubmitting(true);
    try {
      const isCustom = editInstallmentModal.planType === "custom";
      const payload = {};
      if (amount > 0) payload.amount = amount;
      if (dueDate) payload.due_date = dueDate.replace(/\//g, "-");
      if (
        (editInstallmentModal.inst.status === "pending" || editInstallmentModal.inst.status === "payment_arranged") &&
        (isCustom || editInstallmentModal.planType === "2_installment")
      ) {
        payload.mark_payment_arranged = true;
      }
      const planId = editInstallmentModal.plan._id?.toString?.() ?? editInstallmentModal.plan._id;
      const res = isCustom
        ? await updateCustomInstallment(userId, planId, editInstallmentModal.inst.number, payload)
        : await updateInstallment(userId, planId, editInstallmentModal.inst.number, payload);
      if (res.success) {
        setEditInstallmentModal(null);
        if (isCustom) {
          const listRes = await getCustomPlans(userId);
          if (listRes.success && Array.isArray(listRes.data)) setCustomPlans(listRes.data);
        } else {
          const listRes = await getStudentInstallmentPlans(userId);
          if (listRes.success && Array.isArray(listRes.data)) setInstallmentPlans(listRes.data);
        }
        fetchBilling();
      } else {
        setEditInstallmentError(res.message || "Update failed");
      }
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? "Update failed";
      setEditInstallmentError(msg);
    } finally {
      setEditInstallmentSubmitting(false);
    }
  };

  const handleViewInstallmentPop = async (billingRecordId) => {
    const res = await getProofByBillingRecordId(userId, billingRecordId);
    if (res.success && res.data?.url) window.open(res.data.url, "_blank");
    else alert(res.message || "Could not open proof");
  };

  const handleAttachProofClick = (plan, inst, planType = "2_installment") => {
    setAttachProofModal({ plan, inst, planType });
    setAttachProofFile(null);
    setAttachProofError(null);
  };

  const handleAttachProofSubmit = async (e) => {
    e.preventDefault();
    if (!attachProofModal || !attachProofFile) {
      setAttachProofError("Please select a file to upload.");
      return;
    }
    setAttachProofError(null);
    setAttachProofSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", attachProofFile);
      const res = await attachProofToBillingRecord(userId, attachProofModal.inst.billingRecordId, formData);
      if (res.success) {
        setAttachProofModal(null);
        setAttachProofFile(null);
        const isCustom = attachProofModal.planType === "custom";
        if (isCustom) {
          const listRes = await getCustomPlans(userId);
          if (listRes.success && Array.isArray(listRes.data)) setCustomPlans(listRes.data);
        } else {
          const listRes = await getStudentInstallmentPlans(userId);
          if (listRes.success && Array.isArray(listRes.data)) setInstallmentPlans(listRes.data);
        }
        fetchBilling();
      } else {
        setAttachProofError(res.message || "Failed to attach proof");
      }
    } catch (err) {
      setAttachProofError(err?.response?.data?.message || "Failed to attach proof");
    } finally {
      setAttachProofSubmitting(false);
    }
  };

  const handleDeleteBillingRecordClick = (plan, inst, planType = "2_installment") => {
    setDeleteRecordModal({ plan, inst, planType });
    setDeleteRecordError(null);
  };

  const handleDeleteBillingRecordSubmit = async () => {
    if (!deleteRecordModal) return;
    setDeleteRecordError(null);
    setDeleteRecordSubmitting(true);
    try {
      const isCustom = deleteRecordModal.planType === "custom";
      const hasBillingRecord = !!deleteRecordModal.inst.billingRecordId;
      let res;
      if (isCustom && !hasBillingRecord) {
        res = await deleteCustomInstallment(userId, deleteRecordModal.plan._id, deleteRecordModal.inst.number);
      } else if (hasBillingRecord) {
        res = await deleteBillingRecord(userId, deleteRecordModal.inst.billingRecordId);
      } else {
        setDeleteRecordError("Nothing to delete");
        setDeleteRecordSubmitting(false);
        return;
      }
      if (res.success) {
        setDeleteRecordModal(null);
        if (isCustom) {
          const listRes = await getCustomPlans(userId);
          if (listRes.success && Array.isArray(listRes.data)) setCustomPlans(listRes.data);
        } else {
          const listRes = await getStudentInstallmentPlans(userId);
          if (listRes.success && Array.isArray(listRes.data)) setInstallmentPlans(listRes.data);
        }
        fetchBilling();
      } else {
        setDeleteRecordError(res.message || "Delete failed");
      }
    } catch (err) {
      setDeleteRecordError(err?.response?.data?.message || "Delete failed");
    } finally {
      setDeleteRecordSubmitting(false);
    }
  };

  const refreshProfileBlockStatus = async () => {
    if (!userId) return;
    try {
      const result = await getStudentProfile(userId);
      if (result?.success) {
        setStudent(result.student);
        setPaymentBlockStatus(result.paymentBlockStatus || null);
      }
    } catch (_) {
      /* keep current profile */
    }
  };

  const openRemovePlanModal = async ({ kind, plan, warning }) => {
    if (!userId || !plan) return;
    setRemovePlanModal({
      kind,
      plan,
      warning,
      thisPlan: [],
      otherCycles: [],
      selectedIds: [],
      loading: true,
      confirming: false,
      error: null,
    });
    const res = await getStudentMissCyclesForPlanRemoval(userId, plan.planCode);
    setRemovePlanModal((prev) => {
      if (!prev) return prev;
      if (!res?.success) {
        return { ...prev, loading: false, error: res?.message || "Failed to load collection cycles" };
      }
      const thisPlan = Array.isArray(res.thisPlan) ? res.thisPlan : [];
      const otherCycles = Array.isArray(res.otherCycles) ? res.otherCycles : [];
      return {
        ...prev,
        loading: false,
        thisPlan,
        otherCycles,
        selectedIds: suggestedMissCycleIds(thisPlan, otherCycles),
      };
    });
  };

  const handleRemoveTwoInstallmentPlan = (plan) => {
    openRemovePlanModal({
      kind: "2inst",
      plan,
      warning: `Remove this 2-installment plan (${plan.planCode || plan.planName})? Existing billing records stay on the student; the plan will disappear from this page.`,
    });
  };

  const handleRemoveCustomPlan = (plan) => {
    openRemovePlanModal({
      kind: "custom",
      plan,
      warning: `Remove this custom plan (${plan.planCode || plan.planName})? Existing billing records stay on the student; the plan will disappear from this page.`,
    });
  };

  const handleRemoveStandalonePlanFromPaymentsModal = () => {
    const plan = paymentsModalPlan;
    const planCode = (plan?.planCode || "").trim();
    if (!planCode || !userId) return;
    openRemovePlanModal({
      kind: "standalone",
      plan,
      warning: `Remove this Paystack plan (${plan.planName || planCode}) from Zaio and delete its billing records and outstanding payment links? The Paystack subscription will keep running so you can re-add and fetch. This cannot be undone.`,
    });
  };

  const handleArchivePlan = async (plan) => {
    const planCode = (plan?.planCode || "").trim();
    if (!planCode || !userId || plan.archived) return;
    const note = window.prompt(
      `Archive ${plan.planName || planCode}? This stops any Paystack subscription and removes it from LMS access checks. Billing history stays. Optional note:`,
      ""
    );
    if (note === null) return;
    setArchivePlanLoading(planCode);
    try {
      const res = await archiveStudentBillingPlan(userId, { planCode, archiveNote: note });
      if (!res?.success) {
        window.alert(res?.message || "Failed to archive plan");
        return;
      }
      if (res.paystackError) window.alert(res.message);
      const billingRes = await getStudentBilling(userId);
      if (billingRes?.success && billingRes.plans) {
        setBilling({ plans: billingRes.plans, outstandingLinks: billingRes.outstandingLinks || [] });
      }
    } finally {
      setArchivePlanLoading(null);
    }
  };

  const handleRemoveStandalonePlanFromBillingRow = (plan) => {
    const planCode = (plan?.planCode || "").trim();
    if (!planCode || !userId) return;
    openRemovePlanModal({
      kind: "standalone",
      plan,
      warning: `Remove this Paystack plan (${plan.planName || planCode}) from Zaio and delete its billing records and outstanding payment links? The Paystack subscription will keep running so you can re-add and fetch. This cannot be undone.`,
    });
  };

  const confirmRemovePlanModal = async () => {
    if (!removePlanModal?.plan || !userId) return;
    const { kind, plan, selectedIds } = removePlanModal;
    const loadingKey =
      kind === "custom"
        ? `custom-${plan._id}`
        : kind === "2inst"
          ? `2inst-${plan._id}`
          : `standalone-${plan.planCode || ""}`;
    setRemoveWholePlanLoading(loadingKey);
    if (kind === "standalone" && paymentsModalPlan) setPaymentsModalRemoving(true);
    setRemovePlanModal((prev) => (prev ? { ...prev, confirming: true, error: null } : prev));
    try {
      const ids = Array.isArray(selectedIds) ? selectedIds : [];
      let res;
      if (kind === "custom") res = await deleteCustomPaymentPlan(userId, plan._id, ids);
      else if (kind === "2inst") res = await deleteStudentInstallmentPlan(userId, plan._id, ids);
      else res = await removeStandalonePaystackPlan(userId, plan.planCode, ids);

      if (!res?.success) {
        setRemovePlanModal((prev) => (prev ? { ...prev, confirming: false, error: res?.message || "Failed to remove plan" } : prev));
        return;
      }

      if (kind === "custom") {
        const listRes = await getCustomPlans(userId);
        if (listRes.success && Array.isArray(listRes.data)) setCustomPlans(listRes.data);
      } else if (kind === "2inst") {
        const listRes = await getStudentInstallmentPlans(userId);
        if (listRes.success && Array.isArray(listRes.data)) setInstallmentPlans(listRes.data);
      } else if (paymentsModalPlan) {
        setPaymentsModalPlan(null);
      }
      setRemovePlanModal(null);
      fetchBilling();
      await refreshProfileBlockStatus();
    } catch (err) {
      setRemovePlanModal((prev) => (
        prev
          ? { ...prev, confirming: false, error: err?.response?.data?.message || err?.message || "Failed to remove plan" }
          : prev
      ));
    } finally {
      setRemoveWholePlanLoading(null);
      setPaymentsModalRemoving(false);
    }
  };

  const handleEditPlanClick = (plan) => {
    setEditPlanModal(plan);
    setEditPlanForm({
      planName: plan.planName || plan.planCode || "",
      manatiAgreementCode: plan.manatiAgreementCode || "",
      newInstallments: [],
    });
    setEditPlanError(null);
  };

  const handleEditPlanPaystackLookup = async (rowIdx) => {
    const row = editPlanForm.newInstallments[rowIdx];
    const code = (row?.paystack_plan_code || "").trim();
    if (!code) {
      setEditPlanError("Enter a Paystack plan code to look up.");
      return;
    }
    setEditPlanPaystackLookupLoading(rowIdx);
    setEditPlanError(null);
    const res = await getPaystackPlanInfo(code);
    setEditPlanPaystackLookupLoading(null);
    if (res.success && res.data) {
      setEditPlanForm((f) => ({
        ...f,
        newInstallments: f.newInstallments.map((r, i) =>
          i === rowIdx ? { ...r, paystackLookup: res.data } : r
        ),
      }));
    } else {
      setEditPlanError(res.message || "Plan not found. Check the plan code.");
    }
  };

  const handleEditPlanSubmit = async (e) => {
    e.preventDefault();
    if (!editPlanModal) return;
    const planName = (editPlanForm.planName || "").trim();
    if (!planName) {
      setEditPlanError("Plan name is required.");
      return;
    }
    const newInst = (editPlanForm.newInstallments || []).filter((r) => {
      const type = (r.type || "cash").toLowerCase();
      if (type === "paystack") return (r.paystack_plan_code || "").trim();
      return Number(r.amount) > 0;
    });
    const hasNewPaystack = newInst.some((r) => (r.type || "cash").toLowerCase() === "paystack" && (r.paystack_plan_code || "").trim());
    const planHasPaystack = (editPlanModal.installments || []).some((i) => i.type === "paystack");
    const needsFirstUrl = hasNewPaystack && !planHasPaystack && !editPlanModal.firstPaystackPaymentUrl;
    const firstPaystackRow = newInst.find((r) => (r.type || "cash").toLowerCase() === "paystack" && (r.paystack_plan_code || "").trim());
    const firstUrl = (firstPaystackRow?.paystack_payment_url || "").trim();
    if (needsFirstUrl && !firstUrl) {
      setEditPlanError("First Paystack payment link is required when adding Paystack installments.");
      return;
    }
    const paystackWithoutDate = newInst.some((r) =>
      (r.type || "cash").toLowerCase() === "paystack" && (r.paystack_plan_code || "").trim() && !(r.paystack_expected_first_date || "").trim()
    );
    if (paystackWithoutDate) {
      setEditPlanError("For each Paystack plan code, set the expected first payment date.");
      return;
    }
    setEditPlanError(null);
    setEditPlanSubmitting(true);
    try {
      const payload = {
        plan_name: planName,
        manati_agreement_code: (editPlanForm.manatiAgreementCode || "").trim() || undefined,
      };
      if (newInst.length > 0) {
        payload.installments = newInst.map((r) => {
          const type = (r.type || "cash").toLowerCase();
          const base = { type: type === "paystack" ? "paystack" : "cash" };
          if (type === "paystack") {
            return {
              ...base,
              paystack_plan_code: (r.paystack_plan_code || "").trim(),
              paystack_expected_first_date: (r.paystack_expected_first_date || "").trim() || undefined,
              paystack_payment_url: (r.paystack_payment_url || "").trim() || undefined,
            };
          }
          return {
            ...base,
            amount: Number(r.amount),
            due_date: (r.due_date || "").trim() || undefined,
          };
        });
        if (needsFirstUrl && firstUrl) payload.first_paystack_payment_url = firstUrl;
      }
      const res = await updateCustomPlan(userId, editPlanModal._id, payload);
      if (res.success) {
        setEditPlanModal(null);
        const listRes = await getCustomPlans(userId);
        if (listRes.success && Array.isArray(listRes.data)) setCustomPlans(listRes.data);
        fetchBilling();
      } else {
        setEditPlanError(res.message || "Update failed");
      }
    } catch (err) {
      setEditPlanError(err?.response?.data?.message || "Update failed");
    } finally {
      setEditPlanSubmitting(false);
    }
  };

  const handlePaystackLookup = async (rowIdx) => {
    const row = addCustomForm.installments[rowIdx];
    const code = (row.paystack_plan_code || "").trim();
    if (!code) {
      setAddCustomError("Enter a Paystack plan code to look up.");
      return;
    }
    setPaystackLookupLoading(rowIdx);
    setAddCustomError(null);
    const res = await getPaystackPlanInfo(code);
    setPaystackLookupLoading(null);
    if (res.success && res.data) {
      setAddCustomForm((f) => ({
        ...f,
        installments: f.installments.map((r, i) =>
          i === rowIdx ? { ...r, paystackLookup: res.data } : r
        ),
      }));
    } else {
      setAddCustomError(res.message || "Plan not found. Check the plan code.");
    }
  };

  const handleAddCustomModalDragStart = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = addCustomModalOffset.x;
    const origY = addCustomModalOffset.y;
    addCustomModalDragRef.current = { startX, startY, origX, origY };
    const onMove = (ev) => {
      setAddCustomModalOffset({
        x: origX + ev.clientX - startX,
        y: origY + ev.clientY - startY,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      addCustomModalDragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleAddCustomPlanSubmit = async (e) => {
    e.preventDefault();
    setAddCustomError(null);
    const rows = addCustomForm.installments;
    const copiedRows = archivedAcceptedPayments
      .filter((payment) => copiedArchivedPaymentIds.includes(payment.billingRecordId))
      .map((payment) => ({
        amount: Number((payment.amountCents / 100).toFixed(2)),
        due_date: toDateInputValue(payment.dueDate) || undefined,
        type: "cash",
        status: "paid",
        paid_at: payment.paidAt || undefined,
        billing_record_id: payment.billingRecordId,
      }));
    const newInstallments = rows
      .map((row) => {
        const type = (row.type || "cash").toLowerCase() === "paystack" ? "paystack" : "cash";
        const paystackCode = (row.paystack_plan_code || "").trim() || undefined;
        if (type === "paystack" && paystackCode) {
          return {
            type: "paystack",
            paystack_plan_code: paystackCode,
            paystack_expected_first_payment_date: (row.paystack_expected_first_date || "").trim() || undefined,
          };
        }
        const amount = Number(row.amount);
        if (!Number.isFinite(amount) || amount <= 0) return null;
        return {
          amount,
          due_date: (row.due_date || "").trim() || undefined,
          type: "cash",
        };
      })
      .filter(Boolean);
    if (copiedRows.length < 1 && newInstallments.length < 1) {
      setAddCustomError("Add at least one installment: copy an accepted payment from an archived plan, add Cash with amount (Rands), or add Paystack with a plan code.");
      return;
    }
    const paystackWithoutDate = newInstallments.some((row) => (
      row.type === "paystack" && !(row.paystack_expected_first_payment_date || "").trim()
    ));
    if (paystackWithoutDate) {
      setAddCustomError("For each Paystack plan code, set the expected first payment date.");
      return;
    }
    const firstPaystackRow = rows.find((r) => (r.type || "cash").toLowerCase() === "paystack" && (r.paystack_plan_code || "").trim());
    const firstUrl = (firstPaystackRow?.paystack_payment_url || "").trim();
    if (firstPaystackRow && !firstUrl) {
      setAddCustomError("Set the Paystack payment link on the Paystack row. If the student does not pay by the expected date, they will be blocked and directed to Billing with a Pay now button.");
      return;
    }
    const payload = {
      plan_name: (addCustomForm.planName || "").trim() || undefined,
      manati_agreement_code: (addCustomForm.manatiAgreementCode || "").trim() || undefined,
      first_paystack_payment_url: firstUrl || undefined,
      installments: [...copiedRows, ...newInstallments],
    };
    setAddCustomSubmitting(true);
    try {
      const res = await createCustomPlan(userId, payload);
      if (res.success) {
        setAddCustomModal(false);
        setAddCustomModalOffset({ x: 0, y: 0 });
        setCopiedArchivedPaymentIds([]);
        setAddCustomForm(createDefaultCustomPlanForm());
        const listRes = await getCustomPlans(userId);
        if (listRes.success && Array.isArray(listRes.data)) setCustomPlans(listRes.data);
        fetchBilling();
      } else {
        setAddCustomError(res.message || "Failed to create custom plan");
      }
    } catch (err) {
      setAddCustomError(err?.response?.data?.message || "Failed to create custom plan");
    } finally {
      setAddCustomSubmitting(false);
    }
  };

  const handleAddEftSubmit = async (e) => {
    e.preventDefault();
    setAddEftError(null);
    const { planCode, paymentDate, amount, file, installmentPlanId, installmentNumber, customPlanId, replaceBillingRecordId } = addEftForm;
    if (!planCode || !paymentDate || !amount || !file) {
      setAddEftError("Please fill plan, payment date, amount and upload proof.");
      return;
    }
    const amountNum = Number(amount);
    if (!(amountNum > 0)) {
      setAddEftError("Amount must be a positive number (in Rands).");
      return;
    }
    const selectedInstallmentPlanForValidation = installmentPlans.find((p) => p.planCode === planCode);
    if (selectedInstallmentPlanForValidation && !installmentNumber) {
      setAddEftError("Select which instalment (1 or 2) this payment is for.");
      return;
    }
    const selectedCustomPlanForValidation = customPlans.find((p) => p.planCode === planCode);
    if (selectedCustomPlanForValidation && !installmentNumber) {
      setAddEftError("Select which instalment this payment is for.");
      return;
    }
    setAddEftSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("plan_code", planCode);
      formData.append("payment_date", paymentDate);
      formData.append("amount", amountNum);
      formData.append("file", file);
      if (installmentPlanId) formData.append("installment_plan_id", installmentPlanId);
      if (installmentNumber) formData.append("installment_number", installmentNumber);
      if (customPlanId) formData.append("custom_plan_id", customPlanId);
      if (replaceBillingRecordId) formData.append("replace_billing_record_id", replaceBillingRecordId);
      const res = await addEftPaymentAdmin(userId, formData);
      if (res.success) {
        setAddEftModal(false);
        setAddEftPaystackInitialDisclaimer(false);
        setAddEftForm({
          planCode: "",
          paymentDate: "",
          amount: "",
          file: null,
          installmentPlanId: "",
          installmentNumber: "",
          customPlanId: "",
          replaceBillingRecordId: "",
        });
        fetchBilling();
        const listRes = await getStudentInstallmentPlans(userId);
        if (listRes.success && Array.isArray(listRes.data)) setInstallmentPlans(listRes.data);
        const customRes = await getCustomPlans(userId);
        if (customRes.success && Array.isArray(customRes.data)) setCustomPlans(customRes.data);
      } else {
        setAddEftError(res.message || "Failed to add EFT payment");
      }
    } catch (err) {
      setAddEftError(err.response?.data?.message || "Failed to add EFT payment");
    } finally {
      setAddEftSubmitting(false);
    }
  };

  const selectedPlanIsInstallment = addEftForm.planCode && installmentPlans.some((p) => p.planCode === addEftForm.planCode);
  const selectedInstallmentPlan = installmentPlans.find((p) => p.planCode === addEftForm.planCode);
  const selectedPlanIsCustom = addEftForm.planCode && customPlans.some((p) => p.planCode === addEftForm.planCode);
  const selectedCustomPlan = customPlans.find((p) => p.planCode === addEftForm.planCode);

  const handleAddUpfrontSubmit = async (e) => {
    e.preventDefault();
    setAddUpfrontError(null);
    const amountNum = parseAmountString(addUpfrontForm.amount);
    if (!(amountNum > 0)) {
      setAddUpfrontError("Amount must be a positive number (Rands).");
      return;
    }
    if (!addUpfrontForm.file) {
      setAddUpfrontError("Proof of payment file is required.");
      return;
    }
    setAddUpfrontSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("amount", String(amountNum));
      formData.append("payment_date", addUpfrontForm.paymentDate || new Date().toISOString().slice(0, 10));
      formData.append("file", addUpfrontForm.file);
      const res = await createUpfrontPlan(userId, formData);
      if (res.success) {
        setAddUpfrontModal(false);
        setAddUpfrontForm({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), file: null });
        fetchBilling();
        const customRes = await getCustomPlans(userId);
        if (customRes.success && Array.isArray(customRes.data)) setCustomPlans(customRes.data);
      } else {
        setAddUpfrontError(res.message || "Failed to create upfront plan");
      }
    } catch (err) {
      setAddUpfrontError(err?.response?.data?.message || "Failed to create upfront plan");
    } finally {
      setAddUpfrontSubmitting(false);
    }
  };

  const outstandingPaymentRows = useMemo(
    () => (billing.outstandingLinks || []).filter((o) => o?.outstandingPaymentId),
    [billing.outstandingLinks]
  );

  const handleDismissOutstandingRow = async (outstandingPaymentId) => {
    if (!userId || !outstandingPaymentId) return;
    if (!window.confirm("Remove this outstanding Pay now link? The student will no longer see it on billing; this does not refund Paystack.")) return;
    setDismissingOutstandingId(outstandingPaymentId);
    try {
      const res = await dismissOutstandingPayment(userId, outstandingPaymentId);
      if (res.success) await fetchBilling();
      else alert(res.message || "Could not remove");
    } finally {
      setDismissingOutstandingId(null);
    }
  };

  if (loading) {
    return (
      <div className="px-36 py-12">
        <p className="text-white text-xl mb-4">Loading student profile...</p>
        <Loader />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="px-36 py-12">
        <p className="text-white text-xl">Student not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="px-36 py-12">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-white hover:text-blue-400 flex items-center gap-2"
      >
        <span className="text-2xl">←</span> Back
      </button>

      {/* Student Info Card */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{student.username}</h1>
            <p className="text-lg text-gray-600 mt-1">{student.email}</p>
            <p className="text-base text-gray-600 mt-1">
              <span className="text-gray-500">Phone: </span>
              {(student.phonenumber || "").trim() || "—"}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Joined: {new Date(student.createdAt).toLocaleDateString()}
            </p>
            {/* Student Number */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <label className="text-sm font-medium text-gray-600">Student number:</label>
              <input
                type="text"
                value={studentNumberValue}
                onChange={(e) => setStudentNumberValue(e.target.value)}
                placeholder="e.g. STU12345"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSaveStudentNumber}
                disabled={studentNumberSaving}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {studentNumberSaving ? "Saving..." : "Save"}
              </button>
              {studentNumberMessage && (
                <span className={`text-sm ${studentNumberMessage.includes("saved") ? "text-green-600" : "text-red-600"}`}>
                  {studentNumberMessage}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-start gap-2 max-w-xl">
              <input
                id="finance-exclude"
                type="checkbox"
                checked={!!student?.excludeFromFinanceReports}
                onChange={handleFinanceExcludeToggle}
                disabled={financeExcludeSaving}
                className="mt-1 rounded border-gray-300"
              />
              <label htmlFor="finance-exclude" className="text-sm text-gray-600 cursor-pointer">
                <span className="font-medium text-gray-800">Test / demo account (exclude from Finance)</span>
                <span className="block text-gray-500 mt-0.5">
                  When checked, this student does not appear on the Finance dashboard unless &quot;Include test / excluded
                  accounts&quot; is enabled there.
                </span>
                {financeExcludeSaving && (
                  <span className="block text-gray-400 mt-1">Saving…</span>
                )}
                {financeExcludeMessage && (
                  <span className="block text-red-600 mt-1">{financeExcludeMessage}</span>
                )}
              </label>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            {/* Account Status Badge */}
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                student.accBlocked
                  ? "bg-red-100 text-red-800"
                  : paymentBlockStatus?.paymentBlockOverride
                    ? "bg-amber-100 text-amber-900"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {student.accBlocked
                ? "Blocked"
                : paymentBlockStatus?.paymentBlockOverride
                  ? "Active (auto-block paused)"
                  : "Active"}
            </span>

            {paymentBlockStatus?.summary ? (
              <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-700">
                <p className="font-semibold text-gray-900">Account block status</p>
                <p className="mt-1">{paymentBlockStatus.summary}</p>
                {paymentBlockStatus.missCycle ? (
                  <ul className="mt-2 space-y-1 text-[11px] text-gray-600">
                    <li>
                      Plan: <span className="font-medium">{paymentBlockStatus.missCycle.planCode}</span>
                    </li>
                    <li>
                      Cycle:{" "}
                      <span className="font-medium">
                        {paymentBlockStatus.missCycle.cycleKind === "second_miss" ? "Second miss" : "First miss"}
                      </span>
                    </li>
                    {paymentBlockStatus.missCycle.triggerInstallments?.map((row) => (
                      <li key={row.number}>
                        Instalment #{row.number}: {row.status}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {paymentBlockStatus.blockedForPayment ? (
                  <p className="mt-2 text-[11px] text-red-700">Blocked automatically for payment / collections.</p>
                ) : student.accBlocked ? (
                  <p className="mt-2 text-[11px] text-red-700">Blocked manually by admin.</p>
                ) : null}
              </div>
            ) : null}

            {/* Block / Hard unblock */}
            <button
              onClick={handleBlockToggle}
              disabled={blockLoading}
              className={`px-6 py-2 rounded font-medium ${
                student.accBlocked
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              } disabled:opacity-50`}
            >
              {blockLoading
                ? "..."
                : student.accBlocked
                  ? paymentBlockStatus?.blockedForPayment || paymentBlockStatus?.wouldBlock
                    ? "Hard unblock"
                    : "Unblock student"
                  : "Block student"}
            </button>
            {student.accBlocked && (paymentBlockStatus?.blockedForPayment || paymentBlockStatus?.wouldBlock) ? (
              <p className="text-xs text-gray-500 text-right max-w-[220px]">
                Hard unblock restores access and pauses automatic re-block from collections until you re-enable it.
              </p>
            ) : null}
            {paymentBlockStatus?.paymentBlockOverride ? (
              <>
                <button
                  type="button"
                  onClick={handleReleasePaymentBlockOverride}
                  disabled={blockLoading}
                  className="px-6 py-2 rounded font-medium bg-amber-700 hover:bg-amber-800 text-white text-sm disabled:opacity-50"
                >
                  {blockLoading ? "..." : "Re-enable auto-block"}
                </button>
                <p className="text-xs text-gray-500 text-right max-w-[220px]">
                  Applies collections / payment blocking again if arrears or an active miss cycle still apply.
                </p>
              </>
            ) : null}
            <button
              type="button"
              onClick={openCancelSubModal}
              className="px-6 py-2 rounded font-medium bg-amber-700 hover:bg-amber-800 text-white text-sm"
            >
              Cancel Paystack subscriptions
            </button>
            <p className="text-xs text-gray-500 text-right max-w-[220px]">
              Use when the student has deregistered — lists Paystack recurring plans and lets you cancel them.
            </p>
            <button
              type="button"
              onClick={openWriteOffModal}
              className="px-6 py-2 rounded font-medium bg-slate-700 hover:bg-slate-800 text-white text-sm"
            >
              Clear upcoming payments
            </button>
            <p className="text-xs text-gray-500 text-right max-w-[220px]">
              Write off selected upcoming instalments (custom, 2‑inst EFT, or standalone Paystack slots). Refreshes billing after apply.
            </p>
            <div className="w-full max-w-xs border border-gray-200 rounded-lg p-3 bg-gray-50 mt-2 text-left">
              <p className="text-xs font-semibold text-gray-700 mb-1">Open learner app as this student</p>
              <p className="text-[11px] text-gray-500 mb-2">
                Uses the server secret <code className="text-gray-700">COMPANY_LOGIN_AS_STUDENT_PASSWORD</code> (same value you enter below).
              </p>
              <input
                type="password"
                autoComplete="off"
                value={loginAsPassword}
                onChange={(e) => setLoginAsPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-2"
              />
              <button
                type="button"
                onClick={handleOpenLearnerAsStudent}
                disabled={loginAsLoading || !loginAsPassword.trim()}
                className="w-full px-3 py-2 rounded text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loginAsLoading ? "Opening…" : "Open student dashboard (new tab)"}
              </button>
              {loginAsMessage && (
                <p className={`text-xs mt-2 ${loginAsMessage.includes("Opened") ? "text-green-700" : "text-red-600"}`}>
                  {loginAsMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bootcamp Enrollments */}
      <h2 className="text-2xl font-bold text-white mb-4">Bootcamp Enrollments</h2>
      
      {student.bootcamps?.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No bootcamp enrollments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Bootcamp Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Learning Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Enrolled
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {student.bootcamps?.map((bootcamp, idx) => (
                <tr
                  key={bootcamp._id || idx}
                  className="hover:bg-blue-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {bootcamp.bootcampName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {bootcamp.learningpathName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            bootcamp.completedPercentage >= 100
                              ? "bg-green-500"
                              : bootcamp.completedPercentage >= 50
                              ? "bg-blue-500"
                              : "bg-orange-500"
                          }`}
                          style={{ width: `${Math.min(bootcamp.completedPercentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {Math.round(bootcamp.completedPercentage)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {bootcamp.isCompleted ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Completed
                      </span>
                    ) : bootcamp.isDeferred ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Deferred
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        In Progress
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {bootcamp.enrolledAt
                      ? new Date(bootcamp.enrolledAt).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!bootcamp._id}
                        onClick={() => openBootcampAnalytics(bootcamp)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-800 bg-indigo-100 rounded hover:bg-indigo-200 disabled:opacity-50"
                      >
                        Open bootcamp
                      </button>
                      <button
                        type="button"
                        disabled={!student?.email}
                        onClick={() => openLearnerProgressProfile()}
                        className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-100 rounded hover:bg-teal-200 disabled:opacity-50"
                      >
                        Open learner profile
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* OC (Operational Cohort) enrollments */}
      <h2 className="text-2xl font-bold text-white mb-4 mt-10">OC cohort</h2>
      {!student.ocCohortEnrollments?.length ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">Not enrolled in an operational cohort</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Cohort
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Learning path (OC)
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Additional path
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Learner status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Enrolled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {student.ocCohortEnrollments.map((oc, idx) => (
                <tr key={oc.enrollmentId || idx}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    {oc.cohortName}
                    {oc.skillsProgramName ? (
                      <span className="block text-xs font-normal text-gray-500 mt-0.5">
                        {oc.skillsProgramName}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{oc.learningPathName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {oc.nonQctoLearningPathName || "—"}
                  </td>
                  <td className="px-6 py-4">
                    {oc.status === "completed" ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full capitalize">
                        {oc.status}
                      </span>
                    ) : oc.status === "deferred" ? (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full capitalize">
                        {oc.status}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                        {oc.status || "active"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {oc.enrolledAt ? formatDate(oc.enrolledAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Set up Paystack plan: fetch transactions by email → select which to keep → save. Can also backfill for a custom plan. */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 mt-10">
        <h2 className="text-xl font-bold text-white mb-2">
          {backfillCustomPlan ? "Backfill Paystack for custom plan" : "Set up Paystack plan for this learner"}
        </h2>
        {backfillCustomPlan && (
          <p className="text-sm text-amber-200 mb-2">
            Linking to custom plan: <strong>{backfillCustomPlan.planName}</strong>. Accepted payments will be marked on that plan&apos;s Paystack installments.
            <button type="button" onClick={() => setBackfillCustomPlan(null)} className="ml-2 text-gray-400 hover:text-white underline">Cancel</button>
          </p>
        )}
        <p className="text-sm text-gray-400 mb-4">
          Enter the <strong className="text-gray-300">plan code</strong> (required) and optional <strong className="text-gray-300">payer email</strong>. Click Fetch transactions to load successful and failed payments for that email, then select the ones to keep and save. You can also add a <strong className="text-gray-300">subscription code</strong> (e.g. SUB_xxx) manually if the automatic lookup fails.
        </p>

        {!paystackPreview ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const planCode = (linkPaystackForm.planCode || "").trim();
              if (!planCode) {
                setLinkPaystackMessage({ type: "error", text: "Plan code is required." });
                return;
              }
              setLinkPaystackMessage(null);
              setPaystackPreviewLoading(true);
              setupPaystackPlanPreview(userId, planCode, (linkPaystackForm.payerEmail || "").trim() || undefined)
                .then((res) => {
                  if (res.success && res.data?.transactions) {
                    const txs = res.data.transactions;
                    setPaystackPreview({
                      transactions: txs,
                      emailUsed: res.data.emailUsed,
                      planCode: res.data.planCode || planCode,
                      planName: res.data.planName,
                    });
                    setPaystackSelectedRefs(new Set(txs.map((t) => t.reference).filter(Boolean)));
                  } else {
                    setLinkPaystackMessage({ type: "error", text: res.message || "No transactions found." });
                  }
                })
                .catch((err) => {
                  setLinkPaystackMessage({ type: "error", text: err?.response?.data?.message || "Request failed." });
                })
                .finally(() => setPaystackPreviewLoading(false));
            }}
            className="flex flex-wrap items-end gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Plan code *</label>
              <input
                type="text"
                value={linkPaystackForm.planCode}
                onChange={(e) => setLinkPaystackForm((f) => ({ ...f, planCode: e.target.value }))}
                placeholder="e.g. PLN_xxxxxxxx"
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 min-w-[200px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Payer email (optional)</label>
              <input
                type="email"
                value={linkPaystackForm.payerEmail}
                onChange={(e) => setLinkPaystackForm((f) => ({ ...f, payerEmail: e.target.value }))}
                placeholder={student?.email ? `Leave blank to use ${student.email}` : "e.g. payer@example.com"}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 min-w-[220px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Subscription code (optional)</label>
              <input
                type="text"
                value={linkPaystackForm.subscriptionCode}
                onChange={(e) => setLinkPaystackForm((f) => ({ ...f, subscriptionCode: e.target.value }))}
                placeholder="e.g. SUB_xxxxxxxx"
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 min-w-[200px]"
              />
            </div>
            <button
              type="submit"
              disabled={paystackPreviewLoading || !student?.email}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {paystackPreviewLoading ? "Fetching…" : "Fetch transactions"}
            </button>
          </form>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-2">
              Email: <span className="text-gray-300">{paystackPreview.emailUsed}</span>
              {" · "}
              Plan: <span className="text-gray-300">{paystackPreview.planCode || "—"}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Subscription code (optional)</label>
              <input
                type="text"
                value={linkPaystackForm.subscriptionCode}
                onChange={(e) => setLinkPaystackForm((f) => ({ ...f, subscriptionCode: e.target.value }))}
                placeholder="e.g. SUB_xxxxxxxx – add manually if Change payment date fails"
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 min-w-[280px]"
              />
            </div>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-sm text-left text-gray-300">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="py-2 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={paystackSelectedRefs.size === paystackPreview.transactions.length && paystackPreview.transactions.every((t) => t.reference)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPaystackSelectedRefs(new Set(paystackPreview.transactions.map((t) => t.reference).filter(Boolean)));
                          } else {
                            setPaystackSelectedRefs(new Set());
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {paystackPreview.transactions.map((tx) => (
                    <tr key={tx.reference || tx.id} className="border-b border-gray-700">
                      <td className="py-2 pr-2">
                        {tx.reference ? (
                          <input
                            type="checkbox"
                            checked={paystackSelectedRefs.has(tx.reference)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPaystackSelectedRefs((s) => new Set([...s, tx.reference]));
                              } else {
                                setPaystackSelectedRefs((s) => {
                                  const n = new Set(s);
                                  n.delete(tx.reference);
                                  return n;
                                });
                              }
                            }}
                            className="rounded"
                          />
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{tx.paidAt ? formatDate(tx.paidAt) : "—"}</td>
                      <td className="py-2 pr-4">{formatAmount(tx.amount, tx.currency)}</td>
                      <td className="py-2 pr-4">
                        <span className={tx.status === "accepted" ? "text-green-400" : "text-amber-400"}>
                          {tx.status === "accepted" ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{tx.reference || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPaystackPreview(null);
                  setPaystackSelectedRefs(new Set());
                  setLinkPaystackMessage(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-500"
              >
                Back
              </button>
              <button
                type="button"
                disabled={paystackSaveLoading || paystackSelectedRefs.size === 0}
                onClick={() => {
                  const selected = paystackPreview.transactions.filter((t) => t.reference && paystackSelectedRefs.has(t.reference));
                  if (selected.length === 0) return;
                  setLinkPaystackMessage(null);
                  setPaystackSaveLoading(true);
                  setupPaystackPlan(
                    userId,
                    paystackPreview.planCode,
                    (linkPaystackForm.payerEmail || "").trim() || undefined,
                    selected,
                    backfillCustomPlan?.planId || undefined,
                    (linkPaystackForm.subscriptionCode || "").trim() || undefined
                  )
                    .then((res) => {
                      if (res.success) {
                        const d = res.data || {};
                        const parts = [res.message];
                        if (d.paymentsLeft != null) parts.push(`Payments left: ${d.paymentsLeft} of ${d.totalPaymentsRequired ?? "?"}.`);
                        setLinkPaystackMessage({ type: "success", text: parts.join(" ") });
                        setPaystackPreview(null);
                        setPaystackSelectedRefs(new Set());
                        setBackfillCustomPlan(null);
                        fetchBilling();
                        getCustomPlans(userId).then((r) => { if (r?.success && Array.isArray(r.data)) setCustomPlans(r.data); });
                      } else {
                        setLinkPaystackMessage({ type: "error", text: res.message || "Save failed." });
                      }
                    })
                    .catch((err) => {
                      setLinkPaystackMessage({ type: "error", text: err?.response?.data?.message || "Request failed." });
                    })
                    .finally(() => setPaystackSaveLoading(false));
                }}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {paystackSaveLoading ? "Saving…" : `Save selected (${paystackSelectedRefs.size})`}
              </button>
            </div>
          </>
        )}
        {linkPaystackMessage && (
          <p className={`mt-3 text-sm ${linkPaystackMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {linkPaystackMessage.text}
          </p>
        )}
      </div>

      {/* Link Manati financing – attach agreement code so student sees it under Billing */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 mt-10">
        <h2 className="text-xl font-bold text-white mb-2">Link Manati financing</h2>
        <p className="text-sm text-gray-400 mb-4">
          Attach a Manati agreement code to this learner so their financing plan and statement appear under Billing. Use &quot;Refresh from Manati&quot; on the plan to load the latest statement.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const code = (linkManatiCode || "").trim();
            if (!code) {
              setLinkManatiMessage({ type: "error", text: "Agreement code is required." });
              return;
            }
            setLinkManatiMessage(null);
            setLinkManatiSubmitting(true);
            addStudentManatiPlan(userId, code, "Company app (student profile)")
              .then((res) => {
                if (res.success) {
                  setLinkManatiMessage({ type: "success", text: res.message || "Manati agreement linked." });
                  setLinkManatiCode("");
                  fetchBilling();
                } else {
                  setLinkManatiMessage({ type: "error", text: res.message || "Failed to link." });
                }
              })
              .catch((err) => {
                setLinkManatiMessage({ type: "error", text: err?.response?.data?.message || "Request failed." });
              })
              .finally(() => setLinkManatiSubmitting(false));
          }}
          className="flex flex-wrap items-end gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Agreement code</label>
            <input
              type="text"
              value={linkManatiCode}
              onChange={(e) => setLinkManatiCode(e.target.value)}
              placeholder="e.g. CS1156617615"
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 min-w-[200px]"
            />
          </div>
          <button
            type="submit"
            disabled={linkManatiSubmitting}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {linkManatiSubmitting ? "Linking…" : "Link Manati"}
          </button>
        </form>
        {linkManatiMessage && (
          <p className={`mt-3 text-sm ${linkManatiMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {linkManatiMessage.text}
          </p>
        )}
      </div>

      {/* Billing (Paystack or Financing) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-10 mb-4">
        <h2 className="text-2xl font-bold text-white">Billing</h2>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <button
            type="button"
            onClick={handleSyncPaystackPaymentsToBilling}
            disabled={syncPaystackBillingLoading || !userId}
            className="px-3 py-2 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-600 disabled:opacity-50 border border-slate-500"
            title="Reads PaystackPayment (webhook log) for this learner and linked payer email, and creates any missing BillingRecord rows"
          >
            {syncPaystackBillingLoading ? "Syncing…" : "Sync Paystack webhooks → billing"}
          </button>
          {syncPaystackBillingMessage && (
            <p className={`text-sm max-w-xl text-right ${syncPaystackBillingMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
              {syncPaystackBillingMessage.text}
            </p>
          )}
        </div>
      </div>

      {!billingLoading && outstandingPaymentRows.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-950/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/25 bg-amber-950/30">
            <h3 className="text-sm font-semibold text-amber-100">Outstanding Pay now links</h3>
            <p className="text-xs text-amber-200/80 mt-1">
              Failed recurring debits with a one-time Paystack checkout link (<code className="text-amber-50/90">OutstandingPayment</code>). Delete a row to remove it from billing and Finance; it does not cancel Paystack charges already taken.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-amber-200/90 border-b border-amber-500/20">
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="px-4 py-2 font-medium">Amount</th>
                  <th className="px-4 py-2 font-medium">Reference</th>
                  <th className="px-4 py-2 font-medium">Subscription</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Expires</th>
                  <th className="px-4 py-2 font-medium w-[100px]">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                {outstandingPaymentRows.map((row) => (
                  <tr key={row.outstandingPaymentId} className="border-b border-white/5 hover:bg-white/[0.04]">
                    <td className="px-4 py-2.5">
                      <span className="text-white font-medium">{row.planName || row.planCode || "—"}</span>
                      <span className="block text-xs text-gray-500">{row.planCode}</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{formatAmount(row.amount, row.currency)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs break-all max-w-[140px]">{row.reference || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 break-all max-w-[120px]">{row.subscriptionCode || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{row.createdAt ? formatDate(row.createdAt) : "—"}</td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{row.expiresAt ? formatDate(row.expiresAt) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        disabled={dismissingOutstandingId === row.outstandingPaymentId}
                        onClick={() => handleDismissOutstandingRow(row.outstandingPaymentId)}
                        className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {dismissingOutstandingId === row.outstandingPaymentId ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {billingLoading ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">Loading billing...</p>
        </div>
      ) : !activeBillingPlans.length && outstandingPaymentRows.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No billing records</p>
        </div>
      ) : activeBillingPlans.length > 0 ? (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Agreement / Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Payments made
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Total required
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Next payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeBillingPlans.map((plan, idx) => {
                const isManati = plan.partner === "Manati";
                const is2InstallmentEft = (plan.planCode || "").startsWith("2INST-");
                const isCustom = (plan.planCode || "").startsWith("CUSTOM-");
                const paymentsMade = isManati && (plan.manatiPaymentCount != null)
                  ? plan.manatiPaymentCount
                  : (plan.paymentCount ?? 0);
                const totalRequired = plan.totalPaymentsRequired ?? "—";
                const billingTypeLabel = isManati
                  ? "Financing (Manati)"
                  : is2InstallmentEft
                    ? "2-installment EFT"
                    : isCustom
                      ? "Custom"
                      : "Paystack";
                const billingTypeClass = isManati
                  ? "bg-purple-100 text-purple-800"
                  : is2InstallmentEft
                    ? "bg-emerald-100 text-emerald-800"
                    : isCustom
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800";
                return (
                  <tr
                    key={plan.planCode || idx}
                    className={isManati ? "hover:bg-purple-50 cursor-pointer transition-colors" : is2InstallmentEft ? "hover:bg-emerald-50 cursor-pointer transition-colors" : isCustom ? "hover:bg-amber-50 cursor-pointer transition-colors" : "hover:bg-blue-50 cursor-pointer transition-colors"}
                    onClick={() => handleBillingRowClick(plan)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {plan.planName || plan.planCode || "—"}
                      {plan.archived ? (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-slate-200 text-slate-700">Archived</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 ${billingTypeClass} text-xs rounded-full`}>
                        {billingTypeLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {plan.agreementCode || plan.planCode || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {paymentsMade}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {totalRequired === "—" ? "—" : String(totalRequired)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {plan.nextPaymentDate ? formatDate(plan.nextPaymentDate) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {!plan.archived && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchivePlan(plan);
                            }}
                            disabled={archivePlanLoading === (plan.planCode || "")}
                            className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-200 rounded hover:bg-slate-300 disabled:opacity-50"
                          >
                            {archivePlanLoading === (plan.planCode || "") ? "Archiving…" : "Archive plan"}
                          </button>
                        )}
                        {billingTypeLabel === "Paystack" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubscriptionCodeModal(plan);
                              setSubscriptionCodeForm({ subscriptionCode: plan.subscriptionCode || "" });
                              setSubscriptionCodeError(null);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            {plan.subscriptionCode ? "Update subscription code" : "Add subscription code"}
                          </button>
                        )}
                        {plan.subscriptionCode && (plan.nextPaymentDate || (plan.payments || []).some((p) => p.paymentType === "recurring")) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              let specificDate = "";
                              const nextPd = plan.nextPaymentDate;
                              if (nextPd) {
                                try {
                                  const d = typeof nextPd === "string" ? new Date(nextPd) : new Date(nextPd);
                                  if (!Number.isNaN(d.getTime())) specificDate = d.toISOString().slice(0, 10);
                                } catch (_) {
                                  /* ignore */
                                }
                              }
                              setChangeDateForm({ mode: "day", dayOfMonth: "1", specificDate });
                              setChangeDateModal(plan);
                              setChangeDateError(null);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200"
                          >
                            Change payment date
                          </button>
                        )}
                        {billingTypeLabel === "Paystack" &&
                          (plan.subscriptionCode || (plan.planCode || "").startsWith("PLN_")) &&
                          !plan.partner && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPaystackEftModal(plan);
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-100 rounded hover:bg-emerald-200"
                          >
                            Record EFT payment
                          </button>
                        )}
                        {billingTypeLabel === "Paystack" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStandalonePlanFromBillingRow(plan);
                            }}
                            disabled={removeWholePlanLoading === `standalone-${plan.planCode || ""}`}
                            className="px-3 py-1.5 text-xs font-medium text-red-800 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            {removeWholePlanLoading === `standalone-${plan.planCode || ""}` ? "Removing…" : "Remove plan"}
                          </button>
                        )}
                        {billingTypeLabel !== "Paystack" && "—"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Upfront plan */}
      <div className="flex items-center justify-between mb-4 mt-10">
        <h2 className="text-2xl font-bold text-white">Upfront plan</h2>
        <button
          type="button"
          onClick={() => { setAddUpfrontModal(true); setAddUpfrontError(null); }}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          Add upfront plan
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-4">Add a single upfront payment with amount and proof of payment. It will appear on the student&apos;s billing tab as paid.</p>

      {/* 2-installment EFT plans */}
      <div className="flex items-center justify-between mb-4 mt-10">
        <h2 className="text-2xl font-bold text-white">2-installment EFT plans</h2>
        <button
          type="button"
          onClick={() => { setAddInstallmentModal(true); setAddInstallmentError(null); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          Add 2-installment plan
        </button>
      </div>
      {installmentPlansLoading ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">Loading plans…</p>
        </div>
      ) : !activeInstallmentPlans.length ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No 2-installment EFT plans. Add one to define two EFT installments for this student.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeInstallmentPlans.map((plan) => (
            <div key={plan._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                <span className="font-semibold text-gray-800">{plan.planName || "2-installment EFT"}</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-600">Total: {formatAmount(plan.totalAmount, plan.currency)} · Plan: {plan.planCode}</span>
                  <button
                    type="button"
                    disabled={removeWholePlanLoading === `2inst-${plan._id}`}
                    onClick={() => handleRemoveTwoInstallmentPlan(plan)}
                    className="px-3 py-1.5 text-xs font-medium text-red-800 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
                  >
                    {removeWholePlanLoading === `2inst-${plan._id}` ? "Removing…" : "Remove plan"}
                  </button>
                </div>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Installment</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Due date</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(plan.installments || []).map((inst) => {
                    const rowKey = `2inst-${plan._id}-${inst.number}`;
                    const rowBg =
                      inst.status === "payment_arranged"
                        ? "bg-sky-50"
                        : inst.status === "pending"
                          ? "bg-amber-50"
                          : "";
                    return (
                    <tr key={inst.number} className={rowBg}>
                      <td className="px-6 py-3 text-sm text-gray-800">Instalment {inst.number}</td>
                      <td className="px-6 py-3 text-sm text-gray-800">{formatAmount(inst.amount, plan.currency)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 align-middle">
                        <div className="flex flex-wrap items-center gap-1">
                          <input
                            type="date"
                            disabled={inlineCustomDueSaving === `${plan._id}-${inst.number}`}
                            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 max-w-[11rem]"
                            key={`due-2inst-${plan._id}-${inst.number}-${inst.dueDate ? new Date(inst.dueDate).getTime() : "none"}-${inst.status || ""}`}
                            defaultValue={inst.dueDate ? new Date(inst.dueDate).toISOString().slice(0, 10) : ""}
                            onBlur={(e) => handleInlineDueDateBlur(plan, inst, "2_installment", e.target.value)}
                            title="Scheduled due date for this instalment"
                          />
                          {inlineCustomDueSaving === `${plan._id}-${inst.number}` && (
                            <span className="text-xs text-gray-500">Saving…</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${inst.status === "paid" ? "bg-green-100 text-green-800" : inst.status === "payment_arranged" ? "bg-sky-100 text-sky-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {inst.status === "payment_arranged" ? "Payment arranged" : inst.status}
                        </span>
                        {inst.status === "payment_arranged" && inst.arrangementNote ? (
                          <p className="mt-1 text-[11px] text-sky-700">{inst.arrangementNote}</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-3 align-middle">
                        <CustomInstallmentActions
                          menuKey={rowKey}
                          openMenuKey={instActionsMenuKey}
                          setOpenMenuKey={setInstActionsMenuKey}
                          sections={[
                            {
                              title: "Schedule",
                              items: [
                                {
                                  key: "edit",
                                  label: "Edit instalment",
                                  onClick: () => handleEditInstallmentClick(plan, inst, "2_installment"),
                                },
                                {
                                  key: "mark-arranged",
                                  label:
                                    markArrangedSaving === `${plan._id}-${inst.number}`
                                      ? "Marking arranged…"
                                      : "Mark payment arranged",
                                  show: inst.status === "pending",
                                  disabled: markArrangedSaving === `${plan._id}-${inst.number}`,
                                  onClick: () => handleMarkPaymentArranged(plan, inst, "2_installment"),
                                },
                                {
                                  key: "clear-arranged",
                                  label:
                                    clearArrangementSaving === `${plan._id}-${inst.number}`
                                      ? "Clearing…"
                                      : "Clear arrangement",
                                  show: inst.status === "payment_arranged",
                                  disabled: clearArrangementSaving === `${plan._id}-${inst.number}`,
                                  onClick: () => handleClearPaymentArrangement(plan, inst, "2_installment"),
                                },
                                {
                                  key: "history",
                                  label: "View history",
                                  badge: (inst.changeHistory || []).length || null,
                                  onClick: () =>
                                    setInstallmentHistoryModal({ plan, inst, planType: "2_installment" }),
                                },
                                {
                                  key: "split",
                                  label: "Split instalment",
                                  show: canSplitInstallmentRow(inst),
                                  onClick: () => handleSplitInstallmentClick(plan, inst, "2_installment"),
                                },
                              ],
                            },
                            {
                              title: "Payment",
                              items: [
                                {
                                  key: "add-pop",
                                  label: "Add proof of payment",
                                  show: inst.status === "pending" || inst.status === "payment_arranged",
                                  onClick: () => {
                                    setAddEftForm({
                                      planCode: plan.planCode,
                                      planName: plan.planName || "",
                                      installmentPlanId: plan._id,
                                      customPlanId: "",
                                      installmentNumber: String(inst.number),
                                      paymentDate: new Date().toISOString().slice(0, 10),
                                      amount: inst.amount ? String(Number(inst.amount) / 100) : "",
                                      file: null,
                                      replaceBillingRecordId: "",
                                    });
                                    setAddEftPaystackInitialDisclaimer(false);
                                    setAddEftModal(true);
                                    setAddEftError(null);
                                  },
                                },
                                {
                                  key: "view-pop",
                                  label: "View proof of payment",
                                  show: inst.status === "paid" && !!inst.billingRecordId,
                                  onClick: () => handleViewInstallmentPop(inst.billingRecordId),
                                },
                                {
                                  key: "attach-proof",
                                  label: "Attach proof",
                                  show: inst.status === "paid" && !!inst.billingRecordId,
                                  onClick: () => handleAttachProofClick(plan, inst, "2_installment"),
                                },
                              ],
                            },
                            {
                              items: [
                                {
                                  key: "delete-paid",
                                  label: "Delete payment record",
                                  danger: true,
                                  show: inst.status === "paid" && !!inst.billingRecordId,
                                  onClick: () => handleDeleteBillingRecordClick(plan, inst, "2_installment"),
                                },
                              ],
                            },
                          ]}
                        />
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="px-6 py-2 text-xs text-gray-500">Use &quot;Add EFT payment&quot; below and select plan <strong>{plan.planCode}</strong> to record payments for instalment 1 or 2.</p>
            </div>
          ))}
        </div>
      )}

      {/* Add 2-installment plan modal */}
      {addInstallmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !addInstallmentSubmitting && setAddInstallmentModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Add 2-installment EFT plan</h3>
            <p className="text-sm text-gray-600 mb-4">Both installments are EFT (cash). Set amounts in Rands and due date for instalment 2 (instalment 1 due date is optional).</p>
            <form onSubmit={handleAddInstallmentPlanSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan name (optional)</label>
                <input
                  type="text"
                  value={addInstallmentForm.planName}
                  onChange={(e) => setAddInstallmentForm((f) => ({ ...f, planName: e.target.value }))}
                  placeholder="e.g. Bootcamp 2025"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instalment 1 amount (R)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={addInstallmentForm.amount1}
                  onChange={(e) => setAddInstallmentForm((f) => ({ ...f, amount1: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instalment 1 due date (optional)</label>
                <input
                  type="date"
                  value={addInstallmentForm.dueDate1}
                  onChange={(e) => setAddInstallmentForm((f) => ({ ...f, dueDate1: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instalment 2 amount (R)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={addInstallmentForm.amount2}
                  onChange={(e) => setAddInstallmentForm((f) => ({ ...f, amount2: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instalment 2 due date</label>
                <input
                  type="date"
                  value={addInstallmentForm.dueDate2}
                  onChange={(e) => setAddInstallmentForm((f) => ({ ...f, dueDate2: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              {addInstallmentError && <p className="text-sm text-red-600">{addInstallmentError}</p>}
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={addInstallmentSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addInstallmentSubmitting ? "Creating…" : "Create plan"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddInstallmentModal(false)}
                  disabled={addInstallmentSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit installment modal */}
      {editInstallmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !editInstallmentSubmitting && setEditInstallmentModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Edit instalment {editInstallmentModal.inst.number}</h3>
            <p className="text-sm text-gray-600 mb-4">Update amount (Rands) and/or due date for this instalment.</p>
            <form onSubmit={handleEditInstallmentSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (R)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editInstallmentForm.amount}
                  onChange={(e) => setEditInstallmentForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 20000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input
                  type="date"
                  value={editInstallmentForm.dueDate}
                  onChange={(e) => setEditInstallmentForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {editInstallmentError && <p className="text-sm text-red-600">{editInstallmentError}</p>}
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={editInstallmentSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editInstallmentSubmitting ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditInstallmentModal(null)}
                  disabled={editInstallmentSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete billing record / Remove installment modal */}
      {deleteRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleteRecordSubmitting && setDeleteRecordModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {deleteRecordModal.inst.billingRecordId ? "Delete billing record" : "Remove installment"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {deleteRecordModal.inst.billingRecordId
                ? "This will permanently delete the entire billing record (undoing the finance entry). The instalment will be marked pending so the student can submit proof again. Continue?"
                : "This will remove instalment " + deleteRecordModal.inst.number + " from the plan. It cannot be undone. Continue?"}
            </p>
            {deleteRecordError && <p className="text-sm text-red-600 mb-2">{deleteRecordError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeleteRecordModal(null)}
                disabled={deleteRecordSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBillingRecordSubmit}
                disabled={deleteRecordSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteRecordSubmitting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit custom plan modal */}
      {editPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !editPlanSubmitting && setEditPlanModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Edit custom plan</h3>
            <p className="text-sm text-gray-600 mb-4">Update plan name, Manati agreement code, or add new installments (Cash/EFT or Paystack). Paystack installments can be backfilled later.</p>
            <form onSubmit={handleEditPlanSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan name</label>
                <input
                  type="text"
                  value={editPlanForm.planName}
                  onChange={(e) => setEditPlanForm((f) => ({ ...f, planName: e.target.value }))}
                  placeholder="e.g. Bootcamp 2025 – custom"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manati agreement code (optional)</label>
                <input
                  type="text"
                  value={editPlanForm.manatiAgreementCode || ""}
                  onChange={(e) => setEditPlanForm((f) => ({ ...f, manatiAgreementCode: e.target.value }))}
                  placeholder="e.g. CS1697227222"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-0.5">Student will see Manati statement (scraped) for this agreement code.</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Add new installments</label>
                  <button
                    type="button"
                    onClick={() => setEditPlanForm((f) => ({
                      ...f,
                      newInstallments: [...(f.newInstallments || []), { amount: "", due_date: "", type: "cash", paystack_plan_code: "", paystack_expected_first_date: "", paystack_payment_url: "", paystackLookup: null }],
                    }))}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    + Add row
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(editPlanForm.newInstallments || []).map((row, idx) => {
                    const isPaystack = (row.type || "cash").toLowerCase() === "paystack";
                    const planHasPaystack = (editPlanModal.installments || []).some((i) => i.type === "paystack");
                    const isFirstPaystackInForm = editPlanForm.newInstallments.findIndex((r) => (r.type || "cash").toLowerCase() === "paystack") === idx;
                    const needsPaymentUrl = isFirstPaystackInForm && !planHasPaystack;
                    return (
                      <div key={idx} className="border border-gray-200 rounded p-2 bg-gray-50 space-y-1">
                        <div className="flex gap-2 items-center flex-wrap">
                          <span className="text-xs font-medium text-gray-500 w-8">+{idx + 1}</span>
                          <select
                            value={row.type || "cash"}
                            onChange={(e) => setEditPlanForm((f) => ({
                              ...f,
                              newInstallments: f.newInstallments.map((r, i) => i === idx ? { ...r, type: e.target.value, paystack_plan_code: "", paystack_expected_first_date: "", paystack_payment_url: "", paystackLookup: null } : r),
                            }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="cash">Cash (EFT)</option>
                            <option value="paystack">Paystack (backfillable)</option>
                          </select>
                          {isPaystack ? (
                            <>
                              <input
                                type="text"
                                placeholder="Paystack plan code (e.g. PLN_xxx)"
                                value={row.paystack_plan_code || ""}
                                onChange={(e) => setEditPlanForm((f) => ({
                                  ...f,
                                  newInstallments: f.newInstallments.map((r, i) => i === idx ? { ...r, paystack_plan_code: e.target.value, paystackLookup: null } : r),
                                }))}
                                className="flex-1 min-w-[140px] border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => handleEditPlanPaystackLookup(idx)}
                                disabled={editPlanPaystackLookupLoading === idx || !(row.paystack_plan_code || "").trim()}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200 disabled:opacity-50 shrink-0"
                              >
                                {editPlanPaystackLookupLoading === idx ? "Looking up…" : "Look up"}
                              </button>
                              <span className="text-xs text-gray-500 shrink-0">Expected first:</span>
                              <input
                                type="date"
                                value={row.paystack_expected_first_date || ""}
                                onChange={(e) => setEditPlanForm((f) => ({
                                  ...f,
                                  newInstallments: f.newInstallments.map((r, i) => i === idx ? { ...r, paystack_expected_first_date: e.target.value } : r),
                                }))}
                                className="w-[140px] border border-gray-300 rounded px-2 py-1 text-sm shrink-0"
                              />
                              <div className="w-full mt-1">
                                <label className="text-xs text-gray-600 block mb-0.5">
                                  Payment link {needsPaymentUrl ? "(required for first Paystack)" : "(optional)"}
                                </label>
                                <input
                                  type="url"
                                  value={row.paystack_payment_url || ""}
                                  onChange={(e) => setEditPlanForm((f) => ({
                                    ...f,
                                    newInstallments: f.newInstallments.map((r, i) => i === idx ? { ...r, paystack_payment_url: e.target.value } : r),
                                  }))}
                                  placeholder="https://… Paystack payment page URL"
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                />
                              </div>
                              {row.paystackLookup && (
                                <span className="text-xs text-green-700 shrink-0">
                                  {row.paystackLookup.invoice_limit != null ? `${row.paystackLookup.invoice_limit} payment(s)` : "Plan found"}
                                  {row.paystackLookup.name ? ` · ${row.paystackLookup.name}` : ""}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="Amount (R)"
                                value={row.amount}
                                onChange={(e) => setEditPlanForm((f) => ({
                                  ...f,
                                  newInstallments: f.newInstallments.map((r, i) => i === idx ? { ...r, amount: e.target.value } : r),
                                }))}
                                className="w-24 min-w-[100px] border border-gray-300 rounded px-2 py-1 text-sm shrink-0"
                              />
                              <input
                                type="date"
                                placeholder="Due"
                                value={row.due_date || ""}
                                onChange={(e) => setEditPlanForm((f) => ({
                                  ...f,
                                  newInstallments: f.newInstallments.map((r, i) => i === idx ? { ...r, due_date: e.target.value } : r),
                                }))}
                                className="w-[140px] border border-gray-300 rounded px-2 py-1 text-sm shrink-0"
                              />
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditPlanForm((f) => ({ ...f, newInstallments: (f.newInstallments || []).filter((_, i) => i !== idx) }))}
                            className="text-red-600 hover:underline text-xs shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {(editPlanForm.newInstallments || []).length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Use &quot;Backfill Paystack&quot; on the plan card after saving to link existing Paystack payments.</p>
                )}
              </div>
              {editPlanError && <p className="text-sm text-red-600">{editPlanError}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditPlanModal(null)}
                  disabled={editPlanSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editPlanSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editPlanSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach proof modal */}
      {attachProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !attachProofSubmitting && setAttachProofModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Attach proof of payment</h3>
            <p className="text-sm text-gray-600 mb-4">
              This billing record has no proof stored. Upload the proof document to attach it. After attaching, &quot;View POP&quot; will work.
            </p>
            <form onSubmit={handleAttachProofSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof document (PDF, image)</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif"
                  onChange={(e) => setAttachProofFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {attachProofError && <p className="text-sm text-red-600">{attachProofError}</p>}
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={attachProofSubmitting || !attachProofFile}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {attachProofSubmitting ? "Uploading…" : "Attach"}
                </button>
                <button
                  type="button"
                  onClick={() => setAttachProofModal(null)}
                  disabled={attachProofSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Write off upcoming payments */}
      {writeOffModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !writeOffSubmitting && setWriteOffModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">Clear upcoming payments (write off)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tick the lines you have waived in the business (e.g. deregistered learner). They disappear from upcoming
              billing and Finance instalment schedules where applicable.
            </p>
            {writeOffMessage && (
              <p
                className={`text-sm mb-3 ${writeOffMessage.type === "success" ? "text-green-700" : "text-red-600"}`}
              >
                {writeOffMessage.text}
              </p>
            )}
            {billingLoading ? (
              <p className="text-gray-600 py-6">Loading billing…</p>
            ) : upcomingWriteOffRows.length === 0 ? (
              <p className="text-sm text-gray-600 py-4">
                No write-offable upcoming lines for this learner (or nothing pending). If you only see Paystack “Pay
                now” / failed rows, dismiss those separately. Pure Paystack API next debits are cleared by cancelling the
                subscription in Paystack.
              </p>
            ) : (
              <>
                <div className="flex justify-end gap-2 mb-2">
                  <button
                    type="button"
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={() =>
                      setWriteOffSelected(
                        new Set(upcomingWriteOffRows.map((r) => JSON.stringify(r.up.writeOff)))
                      )
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-xs text-gray-600 hover:underline"
                    onClick={() => setWriteOffSelected(() => new Set())}
                  >
                    Clear selection
                  </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-2 py-2 w-10" />
                        <th className="px-3 py-2 font-semibold text-gray-700">Plan</th>
                        <th className="px-3 py-2 font-semibold text-gray-700">Line</th>
                        <th className="px-3 py-2 font-semibold text-gray-700">Due</th>
                        <th className="px-3 py-2 font-semibold text-gray-700">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {upcomingWriteOffRows.map((row) => {
                        const k = JSON.stringify(row.up.writeOff);
                        const checked = writeOffSelected.has(k);
                        return (
                          <tr key={row.rowKey}>
                            <td className="px-2 py-2 align-top">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleWriteOffRow(row.up.writeOff)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-800">
                              <span className="font-medium">{row.plan.planCode}</span>
                              {row.plan.planName ? (
                                <span className="block text-xs text-gray-500">{row.plan.planName}</span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {row.up.installmentLabel || "—"}
                              <span className="block text-xs text-gray-500 capitalize">{row.up.paymentType || ""}</span>
                            </td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                              {row.up.dueDate ? formatDate(row.up.dueDate) : "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-800">{formatAmount(row.up.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                disabled={writeOffSubmitting}
                onClick={() => setWriteOffModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                disabled={writeOffSubmitting || upcomingWriteOffRows.length === 0}
                onClick={handleSubmitWriteOff}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {writeOffSubmitting ? "Applying…" : "Write off selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Paystack subscriptions (deregistration) */}
      {cancelSubModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !cancelSubLoading && !cancelSubActionCode && setCancelSubModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">Paystack subscriptions</h3>
            <p className="text-sm text-gray-600 mb-4">
              Subscriptions linked to this student&apos;s email or linked payer email in Paystack. Cancelling stops future
              recurring debits (same as Paystack &quot;disable subscription&quot;).
            </p>
            {cancelSubLoading ? (
              <p className="text-gray-600 py-8 text-center">Loading subscriptions from Paystack…</p>
            ) : (
              <>
                {cancelSubError && (
                  <p className="text-sm text-red-600 mb-3">{cancelSubError}</p>
                )}
                {cancelSubSuccess && (
                  <p className="text-sm text-green-700 mb-3">{cancelSubSuccess}</p>
                )}
                {!cancelSubList.length && !cancelSubError ? (
                  <p className="text-sm text-gray-600 py-4">
                    No active Paystack subscriptions found for this learner&apos;s email(s). If they pay under a different
                    Paystack customer, cancel from the Paystack dashboard or link the correct payer email on this profile
                    first.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 font-semibold text-gray-700">Subscription</th>
                          <th className="px-3 py-2 font-semibold text-gray-700">Plan</th>
                          <th className="px-3 py-2 font-semibold text-gray-700">Status</th>
                          <th className="px-3 py-2 font-semibold text-gray-700">Next debit</th>
                          <th className="px-3 py-2 font-semibold text-gray-700">Amount</th>
                          <th className="px-3 py-2 font-semibold text-gray-700 w-28" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cancelSubList.map((s) => {
                          const st = (s.status || "").toLowerCase();
                          const cancellable = st !== "cancelled" && st !== "complete" && st !== "completed";
                          return (
                            <tr key={s.subscription_code}>
                              <td className="px-3 py-2 font-mono text-xs text-gray-800">{s.subscription_code}</td>
                              <td className="px-3 py-2 text-gray-700">
                                {s.plan?.plan_code || "—"}
                                {s.plan?.name ? (
                                  <span className="block text-xs text-gray-500">{s.plan.name}</span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 capitalize text-gray-700">{s.status || "—"}</td>
                              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                {s.next_payment_date ? formatDate(s.next_payment_date) : "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {s.plan?.amount != null ? formatAmount(s.plan.amount) : "—"}
                              </td>
                              <td className="px-3 py-2">
                                {cancellable ? (
                                  <button
                                    type="button"
                                    disabled={!!cancelSubActionCode}
                                    onClick={() => handleCancelOnePaystackSubscription(s.subscription_code)}
                                    className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {cancelSubActionCode === s.subscription_code ? "Cancelling…" : "Cancel"}
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                disabled={!!cancelSubActionCode || cancelSubLoading}
                onClick={() => setCancelSubModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add upfront plan modal */}
      {addUpfrontModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !addUpfrontSubmitting && setAddUpfrontModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Add upfront plan</h3>
            <p className="text-sm text-gray-600 mb-4">Enter the amount (Rands) and upload proof of payment. This will be added to the student&apos;s billing tab as a single paid installment.</p>
            <form onSubmit={handleAddUpfrontSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (R)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={addUpfrontForm.amount}
                  onChange={(e) => setAddUpfrontForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment date</label>
                <input
                  type="date"
                  value={addUpfrontForm.paymentDate}
                  onChange={(e) => setAddUpfrontForm((f) => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof of payment (file)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setAddUpfrontForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              {addUpfrontError && <p className="text-sm text-red-600">{addUpfrontError}</p>}
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={addUpfrontSubmitting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {addUpfrontSubmitting ? "Creating…" : "Add upfront plan"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddUpfrontModal(false)}
                  disabled={addUpfrontSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom payment plans */}
      <div className="flex items-center justify-between mb-4 mt-10">
        <h2 className="text-2xl font-bold text-white">Custom payment plans</h2>
        <button
          type="button"
          onClick={() => {
            setAddCustomModal(true);
            setAddCustomModalOffset({ x: 0, y: 0 });
            setAddCustomError(null);
            setCopiedArchivedPaymentIds([]);
          }}
          className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
        >
          Add custom plan
        </button>
      </div>
      {customPlansLoading ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">Loading custom plans…</p>
        </div>
      ) : !activeCustomPlans.length ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No custom payment plans. Add one to define cash + Paystack or multiple cash installments with dates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeCustomPlans.map((plan) => (
            <div key={plan._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{plan.planName || "Custom plan"}</span>
                  {!plan.archivedAt && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditPlanClick(plan)}
                        className="px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200"
                      >
                        Edit plan
                      </button>
                      <button
                        type="button"
                        disabled={removeWholePlanLoading === `custom-${plan._id}`}
                        onClick={() => handleRemoveCustomPlan(plan)}
                        className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        {removeWholePlanLoading === `custom-${plan._id}` ? "Removing…" : "Remove plan"}
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Total: {formatAmount(plan.totalAmount, plan.currency)} · Plan: {plan.planCode}</span>
                  {(plan.installments || []).some((i) => i.type === "paystack" && (i.paystackPlanCode || "").trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        const firstPaystack = (plan.installments || []).find((i) => i.type === "paystack" && (i.paystackPlanCode || "").trim());
                        if (firstPaystack?.paystackPlanCode) {
                          setBackfillCustomPlan({ planId: plan._id, planCode: firstPaystack.paystackPlanCode.trim(), planName: plan.planName || plan.planCode });
                          setLinkPaystackForm((f) => ({ ...f, planCode: firstPaystack.paystackPlanCode.trim(), payerEmail: "" }));
                          setPaystackPreview(null);
                          setLinkPaystackMessage(null);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 rounded-lg hover:bg-amber-200"
                    >
                      Backfill Paystack
                    </button>
                  )}
                </div>
              </div>
              {(plan.planChangeHistory || []).length > 0 && (
                <div className="px-6 py-2 bg-sky-50 border-b border-sky-100 text-xs text-sky-900">
                  <span className="font-semibold">Plan history: </span>
                  {plan.planChangeHistory[plan.planChangeHistory.length - 1].summary}
                </div>
              )}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Installment</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Due date</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    const billingPlan = billing?.plans?.find((p) => p.planCode === plan.planCode);
                    const rows = buildCustomPlanTableRows(plan, billingPlan);
                    return rows.map((row, idx) => {
                      const inst = row._inst ?? resolveCustomPlanRowInst(plan, row);
                      const slotFromLabel = parsePaymentSlotFromRow(row);
                      const instalmentTitle =
                        row.installmentLabel ||
                        (inst?.number != null ? `Instalment ${inst.number}` : null) ||
                        (row.installmentNumber != null ? `Instalment ${row.installmentNumber}` : null) ||
                        (row.installmentSlot != null ? `Instalment ${row.installmentSlot}` : null) ||
                        (slotFromLabel != null ? `Instalment ${slotFromLabel}` : null) ||
                        `Instalment ${idx + 1}`;
                      const paystackCode =
                        inst?.paystackPlanCode ||
                        plan.installments?.find((i) => i.type === "paystack" || i.paystackPlanCode)?.paystackPlanCode;
                      const typeKind = customPlanRowTypeKind(row, inst);
                      const typeLabel =
                        typeKind === "paystack"
                          ? paystackCode
                            ? `Paystack (${paystackCode})`
                            : "Paystack"
                          : typeKind === "cash"
                            ? "Cash (EFT)"
                            : row.paymentType || "—";
                      const methodIsEft = typeKind === "cash";
                      const paidBillingRecordId = row.billingRecordId || inst?.billingRecordId;
                      const showPayNow =
                        !methodIsEft && row.paymentUrl && (row.status === "pending" || row.isOutstanding);
                      const rowKey = row._orphan
                        ? `orphan-${plan._id}-${row.reference || row.outstandingPaymentId || idx}`
                        : `inst-${plan._id}-${row.installmentNumber ?? inst?.number ?? idx}`;
                      const isOverdue = isCustomInstallmentOverdue(row);
                      const rowBg =
                        row.status === "failed" || row.status === "rejected" || isOverdue
                          ? "bg-red-50"
                          : row.status === "payment_arranged"
                            ? "bg-sky-50"
                          : row.status === "pending"
                            ? "bg-amber-50"
                            : "";
                      return (
                        <tr key={rowKey} className={rowBg}>
                          <td className="px-6 py-3 text-sm text-gray-800">{instalmentTitle}</td>
                          <td className="px-6 py-3 text-sm text-gray-800">{formatAmount(row.amount, row.currency || plan.currency)}</td>
                          <td className="px-6 py-3 text-sm text-gray-600 align-middle">
                            {inst ? (
                              <div className="flex flex-wrap items-center gap-1">
                                <input
                                  type="date"
                                  disabled={inlineCustomDueSaving === `${plan._id}-${inst.number}`}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 max-w-[11rem]"
                                  key={`due-${plan._id}-${inst.number}-${inst.dueDate ? new Date(inst.dueDate).getTime() : "none"}-${row.failedAttemptAt ? new Date(row.failedAttemptAt).getTime() : ""}-${row.status || ""}`}
                                  defaultValue={
                                    (row.status === "failed" || row.status === "rejected") && row.failedAttemptAt
                                      ? new Date(row.failedAttemptAt).toISOString().slice(0, 10)
                                      : inst.dueDate
                                        ? new Date(inst.dueDate).toISOString().slice(0, 10)
                                        : ""
                                  }
                                  onBlur={(e) => handleInlineDueDateBlur(plan, inst, "custom", e.target.value)}
                                  title={
                                    row.status === "failed" || row.status === "rejected"
                                      ? row.failedAttemptAt
                                        ? "Date the debit failed (from Paystack / billing). You can still change the scheduled instalment date below after updating the plan."
                                        : "Scheduled due date for this instalment"
                                      : inst.type === "paystack"
                                        ? "Due date shown for this Paystack instalment (updating does not change Paystack’s subscription schedule)"
                                        : "Scheduled due date for this instalment"
                                  }
                                />
                                {inlineCustomDueSaving === `${plan._id}-${inst.number}` && (
                                  <span className="text-xs text-gray-500">Saving…</span>
                                )}
                              </div>
                            ) : row.dueDate || row.paidAt ? (
                              formatDate(row.dueDate || row.paidAt)
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">{typeLabel}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${row.status === "accepted" || row.status === "paid" ? "bg-green-100 text-green-800" : row.status === "payment_arranged" ? "bg-sky-100 text-sky-800" : row.status === "failed" || row.status === "rejected" || isOverdue ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                              {row.expired
                                ? "Expired"
                                : row.status === "payment_arranged"
                                  ? "Payment arranged"
                                  : isOverdue
                                    ? "overdue"
                                    : row.status || "pending"}
                            </span>
                            {row.status === "payment_arranged" && row.arrangementNote ? (
                              <p className="mt-1 text-[11px] text-sky-700">{row.arrangementNote}</p>
                            ) : null}
                          </td>
                          <td className="px-6 py-3 align-middle">
                            {inst ? (
                              <CustomInstallmentActions
                                menuKey={rowKey}
                                openMenuKey={instActionsMenuKey}
                                setOpenMenuKey={setInstActionsMenuKey}
                                primaryLink={
                                  showPayNow
                                    ? { href: row.paymentUrl, label: "Pay now" }
                                    : null
                                }
                                sections={[
                                  {
                                    title: "Schedule",
                                    items: [
                                      {
                                        key: "edit",
                                        label: "Edit instalment",
                                        onClick: () => handleEditInstallmentClick(plan, inst, "custom"),
                                      },
                                      {
                                        key: "mark-arranged",
                                        label:
                                          markArrangedSaving === `${plan._id}-${inst.number}`
                                            ? "Marking arranged…"
                                            : "Mark payment arranged",
                                        show:
                                          (inst.status === "pending" || row.status === "pending") &&
                                          inst.status !== "paid" &&
                                          row.status !== "accepted" &&
                                          row.status !== "failed" &&
                                          row.status !== "rejected",
                                        disabled: markArrangedSaving === `${plan._id}-${inst.number}`,
                                        onClick: () => handleMarkPaymentArranged(plan, inst, "custom"),
                                      },
                                      {
                                        key: "clear-arranged",
                                        label:
                                          clearArrangementSaving === `${plan._id}-${inst.number}`
                                            ? "Clearing…"
                                            : "Clear arrangement",
                                        show:
                                          inst.status === "payment_arranged" || row.status === "payment_arranged",
                                        disabled: clearArrangementSaving === `${plan._id}-${inst.number}`,
                                        onClick: () => handleClearPaymentArrangement(plan, inst, "custom"),
                                      },
                                      {
                                        key: "history",
                                        label: "View history",
                                        badge: (inst.changeHistory || []).length || null,
                                        onClick: () =>
                                          setInstallmentHistoryModal({ plan, inst, planType: "custom" }),
                                      },
                                      {
                                        key: "split",
                                        label: "Split instalment",
                                        show: canSplitInstallmentRow(inst),
                                        onClick: () => handleSplitInstallmentClick(plan, inst, "custom"),
                                      },
                                    ],
                                  },
                                  {
                                    title: "Payment",
                                    items: [
                                      {
                                        key: "add-pop",
                                        label: "Add proof of payment",
                                        show: inst.type === "cash" && inst.status === "pending",
                                        onClick: () => {
                                          setAddEftForm({
                                            planCode: plan.planCode,
                                            planName: plan.planName || "",
                                            installmentPlanId: "",
                                            customPlanId: plan._id,
                                            installmentNumber: String(inst.number),
                                            paymentDate: new Date().toISOString().slice(0, 10),
                                            amount: inst.amount ? String(Number(inst.amount) / 100) : "",
                                            file: null,
                                            replaceBillingRecordId: "",
                                          });
                                          setAddEftPaystackInitialDisclaimer(false);
                                          setAddEftModal(true);
                                          setAddEftError(null);
                                        },
                                      },
                                      {
                                        key: "record-eft",
                                        label: "Record EFT payment",
                                        show:
                                          inst.type === "paystack" &&
                                          inst.status !== "paid" &&
                                          (row.status === "failed" ||
                                            row.status === "rejected" ||
                                            row.status === "pending" ||
                                            row.status === "payment_arranged"),
                                        onClick: () => {
                                          const firstPs = getFirstPaystackInstallment(plan);
                                          const isInitialPaystack = !!(firstPs && inst.number === firstPs.number);
                                          setAddEftForm({
                                            planCode: plan.planCode,
                                            planName: plan.planName || "",
                                            installmentPlanId: "",
                                            customPlanId: plan._id,
                                            installmentNumber: String(inst.number),
                                            paymentDate: new Date().toISOString().slice(0, 10),
                                            amount: inst.amount ? String(Number(inst.amount) / 100) : "",
                                            file: null,
                                            replaceBillingRecordId:
                                              row.billingRecordId &&
                                              (row.status === "failed" || row.status === "rejected")
                                                ? String(row.billingRecordId)
                                                : "",
                                          });
                                          setAddEftPaystackInitialDisclaimer(isInitialPaystack);
                                          setAddEftModal(true);
                                          setAddEftError(null);
                                        },
                                      },
                                      {
                                        key: "view-pop",
                                        label: "View proof of payment",
                                        show:
                                          methodIsEft &&
                                          (inst.status === "paid" || row.status === "accepted") &&
                                          !!paidBillingRecordId,
                                        onClick: () => handleViewInstallmentPop(paidBillingRecordId),
                                      },
                                      {
                                        key: "attach-proof",
                                        label: "Attach proof",
                                        show:
                                          methodIsEft &&
                                          (inst.status === "paid" || row.status === "accepted") &&
                                          !!paidBillingRecordId,
                                        onClick: () => handleAttachProofClick(plan, inst, "custom"),
                                      },
                                    ],
                                  },
                                  {
                                    items: [
                                      {
                                        key: "delete-paid",
                                        label: "Delete payment record",
                                        danger: true,
                                        show:
                                          methodIsEft &&
                                          (inst.status === "paid" || row.status === "accepted") &&
                                          !!paidBillingRecordId,
                                        onClick: () => handleDeleteBillingRecordClick(plan, inst, "custom"),
                                      },
                                      {
                                        key: "delete-pending",
                                        label: "Remove instalment",
                                        danger: true,
                                        show:
                                          inst.status === "pending" ||
                                          (row.status === "pending" && row.customPlanId && row.installmentNumber),
                                        onClick: () => handleDeleteBillingRecordClick(plan, inst, "custom"),
                                      },
                                    ],
                                  },
                                ]}
                              />
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              {(plan.manatiAgreementCode || "").trim() && (
                <div className="px-6 py-3 bg-purple-50 border-t border-purple-100 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-purple-800">Manati (agreement: {plan.manatiAgreementCode})</span>
                  <button
                    type="button"
                    onClick={() => handleManatiRowClick({ agreementCode: plan.manatiAgreementCode, planName: plan.planName || plan.planCode })}
                    className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200"
                  >
                    View statement
                  </button>
                  <span className="text-xs text-purple-600">Statement is loaded by scraping Manati TaskFlow.</span>
                </div>
              )}
              <p className="px-6 py-2 text-xs text-gray-500">Use &quot;Add POP&quot; above for cash instalments or &quot;Add EFT payment&quot; below and select plan <strong>{plan.planCode}</strong>.</p>
            </div>
          ))}
        </div>
      )}

      {hasArchivedHistory && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-white mb-1">Archived history</h2>
          <p className="text-sm text-gray-400 mb-4">Read-only. Archived plans keep payment history and cannot be edited or removed here.</p>
          <div className="space-y-4">
            {archivedCustomPlans.map((plan) => {
              const billingPlan = billing?.plans?.find((p) => p.planCode === plan.planCode);
              const rows = buildCustomPlanTableRows(plan, billingPlan);
              return (
                <div key={`archived-custom-${plan._id}`} className="bg-white rounded-lg shadow-lg overflow-hidden opacity-95">
                  <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{plan.planName || "Custom plan"}</span>
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-200 text-slate-700">Archived</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      Total: {formatAmount(plan.totalAmount, plan.currency)} · Plan: {plan.planCode}
                      {plan.archivedAt ? ` · ${formatDate(plan.archivedAt)}` : ""}
                    </span>
                  </div>
                  {plan.archiveNote ? (
                    <p className="px-6 py-2 text-xs text-slate-600 bg-slate-50 border-b border-slate-100">{plan.archiveNote}</p>
                  ) : null}
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Installment</th>
                        <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Due date</th>
                        <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rows.map((row, idx) => {
                        const inst = row._inst ?? resolveCustomPlanRowInst(plan, row);
                        const typeKind = customPlanRowTypeKind(row, inst);
                        return (
                          <tr key={`archived-custom-${plan._id}-${idx}`}>
                            <td className="px-6 py-3 text-sm text-gray-800">
                              {row.installmentLabel || (inst?.number != null ? `Instalment ${inst.number}` : `Instalment ${idx + 1}`)}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-800">{formatAmount(row.amount, row.currency || plan.currency)}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{formatDate(row.dueDate || inst?.dueDate || row.paidAt)}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">
                              {typeKind === "paystack" ? "Paystack" : typeKind === "cash" ? "Cash (EFT)" : row.paymentType || "—"}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${row.status === "accepted" || row.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                {row.status === "accepted" || row.status === "paid" ? "accepted" : row.status || "pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
            {archivedInstallmentPlans.map((plan) => (
              <div key={`archived-2inst-${plan._id}`} className="bg-white rounded-lg shadow-lg overflow-hidden opacity-95">
                <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{plan.planName || "2-installment EFT"}</span>
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-200 text-slate-700">Archived</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    Total: {formatAmount(plan.totalAmount, plan.currency)} · Plan: {plan.planCode}
                    {plan.archivedAt ? ` · ${formatDate(plan.archivedAt)}` : ""}
                  </span>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Installment</th>
                      <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Due date</th>
                      <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(plan.installments || []).map((inst) => (
                      <tr key={`archived-2inst-${plan._id}-${inst.number}`}>
                        <td className="px-6 py-3 text-sm text-gray-800">Instalment {inst.number}</td>
                        <td className="px-6 py-3 text-sm text-gray-800">{formatAmount(inst.amount, plan.currency)}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{formatDate(inst.dueDate || inst.paidAt)}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${inst.status === "paid" || inst.status === "accepted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                            {inst.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {archivedStandaloneBillingPlans.map((plan) => (
              <div key={`archived-billing-${plan.planCode}`} className="bg-white rounded-lg shadow-lg overflow-hidden opacity-95">
                <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{plan.planName || plan.planCode || "Plan"}</span>
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-200 text-slate-700">Archived</span>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-blue-100 text-blue-800">
                      {plan.partner === "Manati" ? "Financing (Manati)" : "Paystack"}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {plan.planCode}
                    {plan.archivedAt ? ` · ${formatDate(plan.archivedAt)}` : ""}
                  </span>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Paid</th>
                      <th className="px-6 py-2 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(plan.payments || []).filter((payment) => payment.status === "accepted" || payment.status === "paid").length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-sm text-gray-500">No accepted payments on this archived plan.</td>
                      </tr>
                    ) : (
                      (plan.payments || [])
                        .filter((payment) => payment.status === "accepted" || payment.status === "paid")
                        .map((payment, idx) => (
                          <tr key={payment.billingRecordId || `${plan.planCode}-pay-${idx}`}>
                            <td className="px-6 py-3 text-sm text-gray-800">{formatAmount(payment.amount, payment.currency || plan.currency)}</td>
                            <td className="px-6 py-3 text-sm text-gray-600">{formatDate(payment.paidAt)}</td>
                            <td className="px-6 py-3">
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">accepted</span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom plan modal */}
      {addCustomModal && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-6 pointer-events-auto"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(calc(-50% + ${addCustomModalOffset.x}px), calc(-50% + ${addCustomModalOffset.y}px))`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-start justify-between gap-3 mb-2 cursor-grab active:cursor-grabbing select-none"
              onPointerDown={handleAddCustomModalDragStart}
            >
              <div>
                <h3 className="text-lg font-bold text-gray-800">Add custom payment plan</h3>
                <p className="text-xs text-gray-500 mt-0.5">Drag this header to move the modal and see the page behind it.</p>
              </div>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  if (addCustomSubmitting) return;
                  setAddCustomModal(false);
                  setAddCustomModalOffset({ x: 0, y: 0 });
                }}
                disabled={addCustomSubmitting}
                className="shrink-0 px-2 py-1 text-sm text-gray-500 hover:text-gray-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Optionally copy accepted payments from archived plans, then add remaining Cash (EFT) or Paystack instalments. Copied payments stay on the original billing records.</p>
            <form onSubmit={handleAddCustomPlanSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan name (optional)</label>
                <input
                  type="text"
                  value={addCustomForm.planName}
                  onChange={(e) => setAddCustomForm((f) => ({ ...f, planName: e.target.value }))}
                  placeholder="e.g. Bootcamp 2025 – custom"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount they have to pay</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addCustomForm.totalDue || ""}
                  onChange={(e) => setAddCustomForm((f) => ({ ...f, totalDue: e.target.value }))}
                  placeholder="e.g. 7700"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-0.5">Total plan amount. Collected payments and new instalments are subtracted from this as you add them.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manati agreement code (optional – for cash + Manati)</label>
                <input
                  type="text"
                  value={addCustomForm.manatiAgreementCode || ""}
                  onChange={(e) => setAddCustomForm((f) => ({ ...f, manatiAgreementCode: e.target.value }))}
                  placeholder="e.g. CS1697227222"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-0.5">Student will see Manati statement (scraped) for this agreement code under this plan.</p>
              </div>
              {archivedAcceptedPayments.length > 0 ? (
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">Accepted payments from archived plans</label>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = archivedAcceptedPayments.map((payment) => payment.billingRecordId);
                        const allSelected = allIds.every((id) => copiedArchivedPaymentIds.includes(id));
                        setCopiedArchivedPaymentIds(allSelected ? [] : allIds);
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {archivedAcceptedPayments.every((payment) => copiedArchivedPaymentIds.includes(payment.billingRecordId))
                        ? "Clear"
                        : "Select all"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Tick the payments to carry onto this plan as paid instalments. They are linked, not copied.</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {archivedAcceptedPayments.map((payment) => (
                      <label key={payment.billingRecordId} className="flex items-start gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={copiedArchivedPaymentIds.includes(payment.billingRecordId)}
                          onChange={() => {
                            setCopiedArchivedPaymentIds((prev) => (
                              prev.includes(payment.billingRecordId)
                                ? prev.filter((id) => id !== payment.billingRecordId)
                                : [...prev, payment.billingRecordId]
                            ));
                          }}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium">{formatAmount(payment.amountCents)}</span>
                          {payment.label ? ` · ${payment.label}` : ""}
                          {payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ""}
                          <span className="block text-xs text-gray-500">{payment.planName}</span>
                          {addCustomPlanTotals.hasTotalDue && copiedArchivedPaymentIds.includes(payment.billingRecordId) && addCustomPlanTotals.leftoverAfterCollected[payment.billingRecordId] != null ? (
                            <span className="block text-xs text-slate-600">
                              Left after this: {formatAmount(addCustomPlanTotals.leftoverAfterCollected[payment.billingRecordId])}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Archive a plan first to copy its accepted payments onto this new plan.</p>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {copiedArchivedPaymentIds.length > 0 ? "Remaining installments" : "Installments"}
                  </label>
                  <button
                    type="button"
                            onClick={() => setAddCustomForm((f) => ({ ...f, installments: [...f.installments, createEmptyCustomInstallment()] }))}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    + Add row
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {addCustomForm.installments.map((row, idx) => {
                    const isPaystack = (row.type || "cash").toLowerCase() === "paystack";
                    return (
                      <div key={row._key || idx} className="border border-gray-200 rounded p-2 bg-gray-50 space-y-1">
                        <div className="flex gap-2 items-center flex-wrap">
                          <span className="text-xs font-medium text-gray-500 w-8">#{copiedArchivedPaymentIds.length + idx + 1}</span>
                          <select
                            value={row.type || "cash"}
                            onChange={(e) => setAddCustomForm((f) => ({
                              ...f,
                              installments: f.installments.map((r, i) => i === idx ? { ...r, type: e.target.value, paystack_plan_code: "", paystack_expected_first_date: "", paystack_payment_url: "", paystackLookup: null } : r),
                            }))}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                          >
                            <option value="cash">Cash (EFT)</option>
                            <option value="paystack">Paystack (plan code)</option>
                          </select>
                          {isPaystack ? (
                            <>
                              <input
                                type="text"
                                placeholder="Paystack plan code (e.g. PLN_xxx)"
                                value={row.paystack_plan_code || ""}
                                onChange={(e) => setAddCustomForm((f) => ({
                                  ...f,
                                  installments: f.installments.map((r, i) => i === idx ? { ...r, paystack_plan_code: e.target.value, paystackLookup: null } : r),
                                }))}
                                className="flex-1 min-w-[140px] border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => handlePaystackLookup(idx)}
                                disabled={paystackLookupLoading === idx || !(row.paystack_plan_code || "").trim()}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200 disabled:opacity-50 shrink-0"
                              >
                                {paystackLookupLoading === idx ? "Looking up…" : "Look up"}
                              </button>
                              <span className="text-xs text-gray-500 shrink-0">Expected first payment:</span>
                              <input
                                type="date"
                                value={row.paystack_expected_first_date || ""}
                                onChange={(e) => setAddCustomForm((f) => ({
                                  ...f,
                                  installments: f.installments.map((r, i) => i === idx ? { ...r, paystack_expected_first_date: e.target.value } : r),
                                }))}
                                className="w-[140px] border border-gray-300 rounded px-2 py-1 text-sm shrink-0"
                                title="When you expect the first Paystack payment for this plan"
                              />
                              <div className="w-full mt-1">
                                <label className="text-xs text-gray-600 block mb-0.5">
                                  Payment link {addCustomForm.installments.findIndex((r) => (r.type || "cash").toLowerCase() === "paystack") === idx ? "(required for first Paystack)" : "(optional)"}
                                </label>
                                <input
                                  type="url"
                                  value={row.paystack_payment_url || ""}
                                  onChange={(e) => setAddCustomForm((f) => ({
                                    ...f,
                                    installments: f.installments.map((r, i) => i === idx ? { ...r, paystack_payment_url: e.target.value } : r),
                                  }))}
                                  placeholder="https://… Paystack payment page URL"
                                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                />
                              </div>
                              {row.paystackLookup && (
                                <span className="text-xs text-green-700 shrink-0">
                                  {row.paystackLookup.invoice_limit != null
                                    ? `${row.paystackLookup.invoice_limit} payment(s) required`
                                    : "Plan found"}
                                  {row.paystackLookup.name ? ` · ${row.paystackLookup.name}` : ""}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <input
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="Amount (R)"
                                value={row.amount}
                                onChange={(e) => setAddCustomForm((f) => ({
                                  ...f,
                                  installments: f.installments.map((r, i) => i === idx ? { ...r, amount: e.target.value } : r),
                                }))}
                                className="w-24 min-w-[100px] border border-gray-300 rounded px-2 py-1 text-sm shrink-0"
                              />
                              <input
                                type="date"
                                placeholder="Due"
                                value={row.due_date || ""}
                                onChange={(e) => setAddCustomForm((f) => ({
                                  ...f,
                                  installments: f.installments.map((r, i) => i === idx ? { ...r, due_date: e.target.value } : r),
                                }))}
                                className="w-[140px] border border-gray-300 rounded px-2 py-1 text-sm shrink-0"
                              />
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setAddCustomForm((f) => {
                              const next = [...f.installments];
                              next.splice(idx + 1, 0, duplicateCustomInstallment(row));
                              return { ...f, installments: next };
                            })}
                            className="text-indigo-600 hover:underline text-xs shrink-0"
                          >
                            Duplicate
                          </button>
                          {addCustomForm.installments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setAddCustomForm((f) => ({ ...f, installments: f.installments.filter((_, i) => i !== idx) }))}
                              className="text-red-600 hover:underline text-xs shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {addCustomPlanTotals.hasTotalDue && addCustomPlanTotals.leftoverAfterRows[idx] != null && installmentRowAmountRands(row) > 0 ? (
                          <p className="text-xs text-slate-600 pl-10">
                            Left after this: {formatAmount(addCustomPlanTotals.leftoverAfterRows[idx])}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-gray-600">Amount to pay</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {addCustomPlanTotals.hasTotalDue ? formatAmount(addCustomPlanTotals.totalDueCents) : "Enter amount above"}
                  </span>
                  <span className="text-gray-600">Collected</span>
                  <span className="font-semibold text-green-800 text-right">{formatAmount(addCustomPlanTotals.collectedCents)}</span>
                  <span className="text-gray-600">Added instalments</span>
                  <span className="font-semibold text-gray-900 text-right">{formatAmount(addCustomPlanTotals.scheduledCents)}</span>
                  <span className="text-gray-600">Left</span>
                  <span className={`font-semibold text-right ${addCustomPlanTotals.remainingCents === 0 ? "text-green-800" : addCustomPlanTotals.remainingCents < 0 ? "text-red-700" : "text-amber-800"}`}>
                    {formatAmount(addCustomPlanTotals.remainingCents)}
                  </span>
                </div>
                {!addCustomPlanTotals.hasTotalDue ? (
                  <p className="text-xs text-gray-500 mt-2">Enter the amount they have to pay to see collected and remaining after each item.</p>
                ) : addCustomPlanTotals.remainingCents !== 0 ? (
                  <p className="text-xs text-amber-800 mt-2">
                    {addCustomPlanTotals.remainingCents > 0
                      ? "Add more instalments or collected payments until this is R0.00."
                      : "Items add up to more than the amount to pay."}
                  </p>
                ) : (
                  <p className="text-xs text-green-800 mt-2">Collected plus instalments match the amount to pay.</p>
                )}
              </div>
              {addCustomError && <p className="text-sm text-red-600">{addCustomError}</p>}
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={addCustomSubmitting}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {addCustomSubmitting ? "Creating…" : "Create plan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddCustomModal(false);
                    setAddCustomModalOffset({ x: 0, y: 0 });
                    setCopiedArchivedPaymentIds([]);
                  }}
                  disabled={addCustomSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EFT proof-of-payment submissions */}
      <div className="flex items-center justify-between mb-4 mt-10">
        <h2 className="text-2xl font-bold text-white">EFT / Cash proof of payment</h2>
        <button
          type="button"
          onClick={() => {
            setAddEftPaystackInitialDisclaimer(false);
            setAddEftModal(true);
            setAddEftError(null);
          }}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
        >
          Add EFT payment
        </button>
      </div>
      {eftLoading ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">Loading EFT submissions…</p>
        </div>
      ) : !eftSubmissions.length ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No EFT submissions</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {eftSubmissions.map((s) => (
                <tr key={s._id}>
                  <td className="px-6 py-4 text-sm text-gray-800">{formatDate(s.paymentDate)}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{s.planName || s.planCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{formatAmount(s.amount, s.currency)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      s.status === "approved" ? "bg-green-100 text-green-800" :
                      s.status === "rejected" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {s.status}
                    </span>
                    {s.rejectionReason && <span className="ml-1 text-xs text-gray-500">– {s.rejectionReason}</span>}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewEftProof(s._id)}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      View proof
                    </button>
                    {s.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApproveEft(s._id)}
                          disabled={eftActionId === s._id}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {eftActionId === s._id ? "…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectModal(s)}
                          disabled={eftActionId === s._id}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add EFT payment modal (admin) */}
      {addEftModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            if (!addEftSubmitting) {
              setAddEftModal(false);
              setAddEftPaystackInitialDisclaimer(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Add EFT payment (proof of payment)</h3>
            <p className="text-sm text-gray-600 mb-4">This will be added to the student&apos;s billing. Upload proof, date and amount.</p>
            {addEftPaystackInitialDisclaimer && (
              <div
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                role="status"
              >
                <p className="font-semibold text-amber-900 mb-1">Paystack initial instalment — paid by EFT</p>
                <p>
                  This instalment was the <strong>Paystack initial</strong> payment. You are recording that the learner paid via EFT instead of the Paystack link.
                  After you save, the Paystack checkout link moves to the <strong>next</strong> Paystack instalment — please ask the learner to make their{" "}
                  <strong>next</strong> payment through Paystack (card or bank on the link).
                </p>
              </div>
            )}
            <form onSubmit={handleAddEftSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                {(billing.plans || []).length > 0 ? (
                  <select
                    value={addEftForm.planCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      const plan = billing.plans?.find((p) => p.planCode === code);
                      const instPlan = installmentPlans.find((p) => p.planCode === code);
                      const customPlan = customPlans.find((p) => p.planCode === code);
                      setAddEftPaystackInitialDisclaimer(false);
                      setAddEftForm((f) => ({
                        ...f,
                        planCode: code,
                        planName: plan?.planName || "",
                        installmentPlanId: instPlan ? instPlan._id : "",
                        customPlanId: customPlan ? customPlan._id : "",
                        installmentNumber: "",
                        replaceBillingRecordId: "",
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select plan</option>
                    {billing.plans.map((p) => (
                      <option key={p.planCode} value={p.planCode}>{p.planName || p.planCode}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={addEftForm.planCode}
                    onChange={(e) => setAddEftForm((f) => ({ ...f, planCode: e.target.value }))}
                    placeholder="e.g. PLN_xxx or plan name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  />
                )}
              </div>
              {selectedPlanIsInstallment && selectedInstallmentPlan && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apply to instalment</label>
                  <select
                    value={addEftForm.installmentNumber}
                    onChange={(e) => setAddEftForm((f) => ({ ...f, installmentNumber: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select 1 or 2</option>
                    <option value="1">Instalment 1</option>
                    <option value="2">Instalment 2</option>
                  </select>
                </div>
              )}
              {selectedPlanIsCustom && selectedCustomPlan && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apply to instalment</label>
                  <select
                    value={addEftForm.installmentNumber}
                    onChange={(e) => {
                      const num = e.target.value;
                      const firstPs = getFirstPaystackInstallment(selectedCustomPlan);
                      setAddEftPaystackInitialDisclaimer(
                        !!(num && firstPs && Number(num) === Number(firstPs.number))
                      );
                      setAddEftForm((f) => ({ ...f, installmentNumber: num }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select instalment</option>
                    {(selectedCustomPlan.installments || []).map((inst) => (
                      <option key={inst.number} value={inst.number}>
                        Instalment {inst.number} ({inst.type}) {inst.status === "paid" ? "– paid" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment date</label>
                <input
                  type="date"
                  value={addEftForm.paymentDate}
                  onChange={(e) => setAddEftForm((f) => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (R)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={addEftForm.amount}
                  onChange={(e) => setAddEftForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 5000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof of payment (PDF/image)</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setAddEftForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              {addEftError && <p className="text-sm text-red-600">{addEftError}</p>}
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={addEftSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {addEftSubmitting ? "Adding…" : "Add to billing"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddEftModal(false);
                    setAddEftPaystackInitialDisclaimer(false);
                  }}
                  disabled={addEftSubmitting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject EFT modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Reject EFT submission</h3>
            <p className="text-sm text-gray-600 mb-4">
              Optional: add a reason to show the student (e.g. &quot;Proof unclear, please resubmit&quot;).
            </p>
            <textarea
              id="eft-reject-reason"
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="Reason (optional)"
              defaultValue=""
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  const reason = document.getElementById("eft-reject-reason")?.value?.trim() || "";
                  handleRejectEft(rejectModal._id, reason);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm reject
              </button>
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manati full statement modal */}
      {statementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeStatementModal}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                Manati statement – {statementModal.planName} ({statementModal.agreementCode})
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRefreshManatiStatement}
                  disabled={statementRefreshing}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {statementRefreshing ? "Refreshing…" : "Refresh from Manati"}
                </button>
                <button
                  type="button"
                  onClick={closeStatementModal}
                  className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {statementLoading && (
                <p className="text-gray-500">Loading statement…</p>
              )}
              {!statementLoading && !statementData && (
                <p className="text-gray-500 mb-4">No statement data yet. Click &quot;Refresh from Manati&quot; to fetch the latest (updates for both student and admin).</p>
              )}
              {!statementLoading && statementData && (
                <>
                  {statementData.scrapedAt && (
                    <p className="text-sm text-gray-500 mb-4">Last scraped: {formatDate(statementData.scrapedAt)}</p>
                  )}
                  {(statementData.loans?.length || 0) === 0 && (
                    <p className="text-gray-500">No loan data in this statement.</p>
                  )}
                  {statementData.loans?.map((loan, idx) => (
                    <div key={loan.loanId || idx} className="mb-8">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">{loan.loanId || `Loan ${idx + 1}`}</h4>
                      {loan.overview && Object.keys(loan.overview).length > 0 && (
                        <div className="mb-4 overflow-x-auto">
                          <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                            <tbody>
                              {Object.entries(loan.overview).map(([k, v]) => (
                                <tr key={k} className="border-b border-gray-100 last:border-0">
                                  <td className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50">{k}</td>
                                  <td className="px-4 py-2 text-sm text-gray-800">{v}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {loan.transactions?.length > 0 && (() => {
                        const totalDebit = loan.transactions.reduce((sum, tr) => sum + parseAmountString(tr.Debit), 0);
                        const totalCredit = loan.transactions.reduce((sum, tr) => sum + parseAmountString(tr.Credit), 0);
                        return (
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-600 mb-2">Transactions</h5>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Reference</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Debit</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Credit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {loan.transactions.map((tr, i) => {
                                    const ref = (tr.Reference || "").toLowerCase();
                                    const type = (tr.Type || "").toLowerCase();
                                    const isUnsuccessful = ref.includes("unsuccessful") || type.includes("unsuccessful");
                                    return (
                                      <tr key={i} className={isUnsuccessful ? "bg-red-50 text-red-800" : ""}>
                                        <td className="px-4 py-2 text-sm">{tr.Date || "—"}</td>
                                        <td className="px-4 py-2 text-sm">{tr.Reference || "—"}</td>
                                        <td className="px-4 py-2 text-sm">{tr.Type || "—"}</td>
                                        <td className="px-4 py-2 text-sm">{tr.Debit ?? "—"}</td>
                                        <td className="px-4 py-2 text-sm">{tr.Credit ?? "—"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                  <tr>
                                    <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-gray-800">Total</td>
                                    <td className="px-4 py-2 text-sm font-semibold text-gray-800">{formatTotal(totalDebit)}</td>
                                    <td className="px-4 py-2 text-sm font-semibold text-gray-800">{formatTotal(totalCredit)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                      {loan.disbursements?.length > 0 && (() => {
                        const keys = Object.keys(loan.disbursements[0] || {});
                        const amountKey = keys.find((k) => /amount/i.test(k));
                        const totalDisbursed = amountKey
                          ? loan.disbursements.reduce((sum, row) => sum + parseAmountString(row[amountKey]), 0)
                          : 0;
                        return (
                          <div>
                            <h5 className="text-sm font-semibold text-gray-600 mb-2">Disbursements</h5>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    {keys.map((h) => (
                                      <th key={h} className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {loan.disbursements.map((row, i) => (
                                    <tr key={i}>
                                      {keys.map((key, j) => (
                                        <td key={j} className="px-4 py-2 text-sm">{row[key] ?? "—"}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                  <tr>
                                    {keys.map((key, colIndex) => (
                                      <td key={key} className="px-4 py-2 text-sm font-semibold text-gray-800">
                                        {colIndex === 0 ? "Total" : key === amountKey ? formatTotal(totalDisbursed) : ""}
                                      </td>
                                    ))}
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Paystack (and other) payments modal */}
      {paymentsModalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPaymentsModalPlan(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                Payments – {paymentsModalPlan.planName || paymentsModalPlan.planCode} ({paymentsModalPlan.agreementCode || paymentsModalPlan.planCode || "—"})
              </h3>
              <div className="flex items-center gap-2">
                {!paymentsModalPlan.partner && !(paymentsModalPlan.planCode || "").startsWith("CUSTOM-") && !(paymentsModalPlan.planCode || "").startsWith("2INST-") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubscriptionCodeModal(paymentsModalPlan);
                      setSubscriptionCodeForm({ subscriptionCode: paymentsModalPlan.subscriptionCode || "" });
                      setSubscriptionCodeError(null);
                      setPaymentsModalPlan(null);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    {paymentsModalPlan.subscriptionCode ? "Update subscription code" : "Add subscription code"}
                  </button>
                )}
                {paymentsModalPlan.subscriptionCode && (
                  <button
                    type="button"
                    onClick={() => {
                      const plan = paymentsModalPlan;
                      let specificDate = "";
                      const next = plan?.nextPaymentDate;
                      if (next) {
                        try {
                          const d = typeof next === "string" ? new Date(next) : new Date(next);
                          if (!Number.isNaN(d.getTime())) specificDate = d.toISOString().slice(0, 10);
                        } catch (_) {
                          /* ignore */
                        }
                      }
                      setChangeDateModal(plan);
                      setChangeDateForm({ mode: "day", dayOfMonth: "1", specificDate });
                      setChangeDateError(null);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200"
                  >
                    Change payment date
                  </button>
                )}
                {!paymentsModalPlan.partner &&
                  !(paymentsModalPlan.planCode || "").startsWith("CUSTOM-") &&
                  !(paymentsModalPlan.planCode || "").startsWith("2INST-") && (
                    <button
                      type="button"
                      disabled={paymentsModalRemoving}
                      onClick={handleRemoveStandalonePlanFromPaymentsModal}
                      className="px-3 py-1.5 text-sm font-medium text-red-800 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
                      title="Remove this Paystack plan from Zaio. Does not cancel the Paystack subscription."
                    >
                      {paymentsModalRemoving ? "Removing…" : "Remove plan"}
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setPaymentsModalPlan(null)}
                  className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {!paymentsModalPlan.payments?.length ? (
                <p className="text-gray-500">No payment records for this plan.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Due date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Paid on</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Reference</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {groupPaystackPaymentRows(paymentsModalPlan.payments).map((group, i) => {
                        const p = group.primary;
                        const tryKey = group.slot != null ? `slot-${group.slot}` : `row-${i}`;
                        const triesOpen = Boolean(openPaymentTries[tryKey]);
                        const isAccepted = p.status === "accepted" || p.status === "paid";
                        const hasFailedTries = group.attempts.some(
                          (row) => row.status === "failed" || row.status === "rejected"
                        );
                        const slotRecovered = isAccepted && hasFailedTries;
                        const isFailed = p.status === "failed" || p.status === "rejected";
                        const statusLabel = p.expired ? "Expired" : slotRecovered ? "recovered" : paystackRowStatusLabel(p);
                        const isOverdue = statusLabel === "overdue";
                        const isPending = p.status === "pending" || p.status === "overdue";
                        /** Compare calendar days: a debit taken hours after its due timestamp is still on time. */
                        const settledLate =
                          isAccepted && p.dueDate && p.paidAt && utcDay(p.paidAt) > utcDay(p.dueDate);
                        const showGenerateLink =
                          (isFailed && !p.isOutstanding) || (p.isOutstanding && p.expired);
                        const showPayNow = p.isOutstanding && p.paymentUrl && !p.expired;
                        const showEditStatus = p.billingRecordId && (isFailed || isAccepted);
                        const showDeleteBillingRecord = p.billingRecordId;
                        const showDismiss = p.outstandingPaymentId;
                        const showMarkAsPaid = isPending && (p.customPlanId || p.installmentPlanId);
                        const isStandalonePaystackPlan =
                          (paymentsModalPlan.subscriptionCode ||
                            (paymentsModalPlan.planCode || "").startsWith("PLN_")) &&
                          !(paymentsModalPlan.planCode || "").startsWith("CUSTOM-") &&
                          !(paymentsModalPlan.planCode || "").startsWith("2INST-") &&
                          !paymentsModalPlan.partner;
                        const showMarkPaystackEft =
                          isPending && isStandalonePaystackPlan && !p.customPlanId && !p.installmentPlanId;
                        const standaloneSlot = parsePaymentSlotFromRow(p);
                        const showStandaloneDueDateEdit =
                          isPending && isStandalonePaystackPlan && standaloneSlot != null && !p.customPlanId && !p.installmentPlanId;
                        const standaloneDueKey = `standalone-${paymentsModalPlan.planCode}-${standaloneSlot}`;
                        const showDeletePending = isPending && p.customPlanId && p.installmentNumber;
                        const actionKey = p.billingRecordId || p.outstandingPaymentId || (p.customPlanId && p.installmentNumber ? `pending-${p.customPlanId}-${p.installmentNumber}` : null) || (p.installmentPlanId && p.installmentNumber ? `pending-${p.installmentPlanId}-${p.installmentNumber}` : null) || p.reference || p.paymentUrl || i;
                        const isLoading = updatePaymentStatusLoading === actionKey;
                        return (
                          <Fragment key={tryKey}>
                          <tr className={isOverdue ? "bg-orange-50" : isFailed ? "bg-red-50" : slotRecovered ? "bg-emerald-50" : p.status === "pending" ? "bg-amber-50" : ""}>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {showStandaloneDueDateEdit ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  <input
                                    type="date"
                                    disabled={inlineCustomDueSaving === standaloneDueKey}
                                    className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 max-w-[11rem]"
                                    key={`${standaloneDueKey}-${p.dueDate || "none"}`}
                                    defaultValue={p.dueDate ? new Date(p.dueDate).toISOString().slice(0, 10) : ""}
                                    onBlur={(e) => handleStandaloneDueDateBlur(paymentsModalPlan, p, e.target.value)}
                                    title="Change this instalment’s due date. This does not change the Paystack subscription."
                                  />
                                  {inlineCustomDueSaving === standaloneDueKey && (
                                    <span className="text-xs text-gray-500">Saving…</span>
                                  )}
                                </div>
                              ) : p.dueDate ? (
                                formatDate(p.dueDate)
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                              {p.paidAt ? formatDate(p.paidAt) : "—"}
                              {settledLate && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-800">late</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-800">{formatAmount(p.amount, p.currency)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${slotRecovered ? "bg-emerald-100 text-emerald-800" : p.status === "accepted" ? "bg-green-100 text-green-800" : isOverdue ? "bg-orange-100 text-orange-800" : isFailed ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div>{p.installmentLabel || p.paymentType || "—"}</div>
                              {group.attempts.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenPaymentTries((prev) => ({ ...prev, [tryKey]: !prev[tryKey] }))
                                  }
                                  className="mt-1 text-xs text-indigo-600 hover:underline"
                                >
                                  {triesOpen ? "Hide" : "Show"} {group.attempts.length}{" "}
                                  {group.attempts.length === 1 ? "try" : "tries"}
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{p.reference || "—"}</td>
                            <td className="px-4 py-3 flex flex-wrap items-center gap-2">
                              {showPayNow && (
                                <a href={p.paymentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                  Pay now
                                </a>
                              )}
                              {p.xeroInvoiceUrl && (
                                <a
                                  href={p.xeroInvoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  Invoice
                                </a>
                              )}
                              {showGenerateLink && (
                                <button
                                  type="button"
                                  disabled={generateLinkLoading}
                                  onClick={async () => {
                                    setGenerateLinkLoading(true);
                                    const paymentSlot = parsePaymentSlotFromRow(p);
                                    const res = await generatePaymentLink(userId, {
                                      planCode: paymentsModalPlan.planCode,
                                      amount: p.amount ?? paymentsModalPlan.amount,
                                      currency: p.currency || paymentsModalPlan.currency,
                                      subscriptionCode: paymentsModalPlan.subscriptionCode || undefined,
                                      ...(paymentSlot != null ? { paymentSlot } : {}),
                                      ...((isFailed && !p.isOutstanding && p.reference) ||
                                      (p.isOutstanding && p.expired && p.failedChargeReference)
                                        ? {
                                            failedChargeReference:
                                              (isFailed && !p.isOutstanding && p.reference) || p.failedChargeReference,
                                          }
                                        : {}),
                                    });
                                    setGenerateLinkLoading(false);
                                    if (res.success && res.data?.paymentUrl) {
                                      window.open(res.data.paymentUrl, "_blank");
                                      getStudentBilling(userId).then((billingRes) => {
                                        if (billingRes?.success && billingRes.plans) {
                                          setBilling({ plans: billingRes.plans, outstandingLinks: billingRes.outstandingLinks || [] });
                                          const updatedPlan = billingRes.plans.find((pl) => pl.planCode === paymentsModalPlan.planCode);
                                          if (updatedPlan) setPaymentsModalPlan(updatedPlan);
                                        }
                                      });
                                    } else {
                                      alert(res.message || "Failed to generate link");
                                    }
                                  }}
                                  className="text-indigo-600 hover:underline text-sm font-medium disabled:opacity-50"
                                >
                                  {generateLinkLoading ? "Generating…" : p.expired ? "Generate new link" : "Generate payment link"}
                                </button>
                              )}
                              {showEditStatus && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={async () => {
                                    const newStatus = isFailed ? "accepted" : "rejected";
                                    setUpdatePaymentStatusLoading(actionKey);
                                    const res = await updateBillingRecordStatus(userId, p.billingRecordId, newStatus);
                                    setUpdatePaymentStatusLoading(null);
                                    if (res.success) {
                                      getStudentBilling(userId).then((billingRes) => {
                                        if (billingRes?.success && billingRes.plans) {
                                          setBilling({ plans: billingRes.plans, outstandingLinks: billingRes.outstandingLinks || [] });
                                          const updatedPlan = billingRes.plans.find((pl) => pl.planCode === paymentsModalPlan.planCode);
                                          if (updatedPlan) setPaymentsModalPlan(updatedPlan);
                                        }
                                      });
                                    } else {
                                      alert(res.message || "Failed to update status");
                                    }
                                  }}
                                  className="text-indigo-700 hover:underline text-sm font-medium disabled:opacity-50"
                                >
                                  {isLoading ? "Updating…" : isFailed ? "Mark as accepted" : "Mark as rejected"}
                                </button>
                              )}
                              {showDeleteBillingRecord && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={async () => {
                                    if (!window.confirm("Delete this payment record? It will be permanently removed and any linked installment will be marked pending.")) return;
                                    setUpdatePaymentStatusLoading(actionKey);
                                    const res = await deleteBillingRecord(userId, p.billingRecordId);
                                    setUpdatePaymentStatusLoading(null);
                                    if (res.success) {
                                      getStudentBilling(userId).then((billingRes) => {
                                        if (billingRes?.success && billingRes.plans) {
                                          setBilling({ plans: billingRes.plans, outstandingLinks: billingRes.outstandingLinks || [] });
                                          const updatedPlan = billingRes.plans.find((pl) => pl.planCode === paymentsModalPlan.planCode);
                                          if (updatedPlan) setPaymentsModalPlan(updatedPlan);
                                        }
                                      });
                                      getCustomPlans(userId).then((r) => { if (r?.success && Array.isArray(r.data)) setCustomPlans(r.data); });
                                    } else {
                                      alert(res.message || "Failed to delete");
                                    }
                                  }}
                                  className="text-red-700 hover:underline text-sm font-medium disabled:opacity-50"
                                >
                                  {isLoading ? "Deleting…" : "Delete"}
                                </button>
                              )}
                              {showDismiss && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={async () => {
                                    setUpdatePaymentStatusLoading(actionKey);
                                    const res = await dismissOutstandingPayment(userId, p.outstandingPaymentId);
                                    setUpdatePaymentStatusLoading(null);
                                    if (res.success) {
                                      getStudentBilling(userId).then((billingRes) => {
                                        if (billingRes?.success && billingRes.plans) {
                                          setBilling({ plans: billingRes.plans, outstandingLinks: billingRes.outstandingLinks || [] });
                                          const updatedPlan = billingRes.plans.find((pl) => pl.planCode === paymentsModalPlan.planCode);
                                          if (updatedPlan) setPaymentsModalPlan(updatedPlan);
                                        }
                                      });
                                    } else {
                                      alert(res.message || "Failed to dismiss");
                                    }
                                  }}
                                  className="text-red-700 hover:underline text-sm font-medium disabled:opacity-50"
                                >
                                  {isLoading ? "Deleting…" : "Delete"}
                                </button>
                              )}
                              {showMarkAsPaid && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => {
                                    setAddEftForm({
                                      planCode: paymentsModalPlan.planCode,
                                      planName: paymentsModalPlan.planName || "",
                                      installmentPlanId: p.installmentPlanId || "",
                                      customPlanId: p.customPlanId || paymentsModalPlan.customPlanId || "",
                                      installmentNumber: String(p.installmentNumber || ""),
                                      paymentDate: new Date().toISOString().slice(0, 10),
                                      amount: p.amount ? String(Number(p.amount) / 100) : "",
                                      file: null,
                                      replaceBillingRecordId: "",
                                    });
                                    setAddEftPaystackInitialDisclaimer(false);
                                    setPaymentsModalPlan(null);
                                    setAddEftModal(true);
                                    setAddEftError(null);
                                  }}
                                  className="text-green-700 hover:underline text-sm font-medium disabled:opacity-50"
                                >
                                  Mark as paid
                                </button>
                              )}
                              {showMarkPaystackEft && (
                                <button
                                  type="button"
                                  disabled={isLoading || paystackEftSubmitting}
                                  onClick={() => {
                                    openPaystackEftModal(paymentsModalPlan, p);
                                  }}
                                  className="text-emerald-700 hover:underline text-sm font-medium disabled:opacity-50"
                                >
                                  Mark paid (EFT)
                                </button>
                              )}
                              {showDeletePending && (
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={async () => {
                                    if (!window.confirm("Remove this installment from the plan? It cannot be undone.")) return;
                                    setUpdatePaymentStatusLoading(actionKey);
                                    const res = await deleteCustomInstallment(userId, p.customPlanId, p.installmentNumber);
                                    setUpdatePaymentStatusLoading(null);
                                    if (res.success) {
                                      getStudentBilling(userId).then((billingRes) => {
                                        if (billingRes?.success && billingRes.plans) {
                                          setBilling({ plans: billingRes.plans, outstandingLinks: billingRes.outstandingLinks || [] });
                                          const updatedPlan = billingRes.plans.find((pl) => pl.planCode === paymentsModalPlan.planCode);
                                          if (updatedPlan) setPaymentsModalPlan(updatedPlan);
                                        }
                                      });
                                      getCustomPlans(userId).then((r) => { if (r?.success && Array.isArray(r.data)) setCustomPlans(r.data); });
                                    } else {
                                      alert(res.message || "Failed to delete");
                                    }
                                  }}
                                  className="text-red-700 hover:underline text-sm font-medium disabled:opacity-50"
                                >
                                  {isLoading ? "Deleting…" : "Delete"}
                                </button>
                              )}
                              {!showPayNow && !showGenerateLink && !showEditStatus && !showDeleteBillingRecord && !showDismiss && !showMarkAsPaid && !showMarkPaystackEft && !showDeletePending && !p.xeroInvoiceUrl && "—"}
                            </td>
                          </tr>
                          {triesOpen &&
                            group.attempts.map((attempt, ai) => {
                              const attemptFailed = attempt.status === "failed" || attempt.status === "rejected";
                              return (
                                <tr
                                  key={`${tryKey}-try-${attempt.billingRecordId || attempt.reference || ai}`}
                                  className="bg-slate-50"
                                >
                                  <td className="px-4 py-2 pl-8 text-xs text-gray-500 whitespace-nowrap">try</td>
                                  <td className="px-4 py-2 text-xs text-gray-700 whitespace-nowrap">
                                    {attempt.paidAt || attempt.failedAttemptAt
                                      ? formatDate(attempt.paidAt || attempt.failedAttemptAt)
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-gray-600">
                                    {formatAmount(attempt.amount, attempt.currency)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`px-2 py-0.5 text-xs rounded-full ${
                                        attemptFailed
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {attemptFailed ? "attempt failed" : attempt.status || "—"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-xs text-gray-500">Card attempt</td>
                                  <td className="px-4 py-2 text-xs text-gray-500 font-mono">{attempt.reference || "—"}</td>
                                  <td className="px-4 py-2 text-xs text-gray-400">—</td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standalone Paystack subscription: record EFT (admin when student paid by bank transfer) */}
      {paystackEftModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => !paystackEftSubmitting && setPaystackEftModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Mark Paystack payment paid (EFT)</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Creates an accepted EFT billing record for this standalone subscription (same as a successful debit). Clears
                  pending &quot;Pay now&quot; links for this plan when applicable.
                </p>
              </div>
              <button
                type="button"
                disabled={paystackEftSubmitting}
                onClick={() => setPaystackEftModal(null)}
                className="text-gray-500 hover:text-gray-800 text-2xl leading-none disabled:opacity-40"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={submitPaystackEft} className="px-6 py-4 space-y-4">
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <span className="text-gray-500">Plan:</span>{" "}
                  {paystackEftModal.plan?.planName || paystackEftModal.plan?.planCode || "—"}
                </p>
                <p className="text-xs text-gray-500 font-mono">{paystackEftModal.plan?.planCode}</p>
              </div>
              {(() => {
                const choices = buildPaystackEftPaymentChoices(paystackEftModal.plan);
                const tr =
                  paystackEftModal.plan?.totalPaymentsRequired != null
                    ? Number(paystackEftModal.plan.totalPaymentsRequired)
                    : null;
                if (choices.length === 0) {
                  if (tr != null && Number.isFinite(tr) && tr >= 1) {
                    return (
                      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        No pending payment lines were found for this plan. Sync billing or check the plan setup, then try again.
                      </p>
                    );
                  }
                  return null;
                }
                return (
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">Which payment is this for?</span>
                    <select
                      required
                      value={paystackEftPaymentChoice}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPaystackEftPaymentChoice(v);
                        try {
                          const parsed = JSON.parse(v);
                          const match = choices.find((c) => {
                            if (parsed.outstandingPaymentId && c.outstandingPaymentId) {
                              return String(c.outstandingPaymentId) === String(parsed.outstandingPaymentId);
                            }
                            if (parsed.billingRecordId && c.billingRecordId) {
                              return String(c.billingRecordId) === String(parsed.billingRecordId);
                            }
                            return (
                              c.installmentSlot === parsed.installmentSlot &&
                              !parsed.outstandingPaymentId &&
                              !parsed.billingRecordId
                            );
                          });
                          if (match?.amountCents != null && Number.isFinite(match.amountCents)) {
                            setPaystackEftAmountRands((match.amountCents / 100).toFixed(2));
                          }
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 bg-white"
                    >
                      {choices.map((c, idx) => (
                        <option key={idx} value={encodePaystackEftChoice(c)}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Includes pending instalments, Pay now links, and <strong className="text-gray-700">rejected</strong> Paystack
                      debits (failed card charges) so you can record the bank payment against the right month.
                    </p>
                  </label>
                );
              })()}
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Payment date</span>
                <input
                  type="date"
                  required
                  value={paystackEftPaidAt}
                  onChange={(e) => setPaystackEftPaidAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Amount (ZAR)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={paystackEftAmountRands}
                  onChange={(e) => setPaystackEftAmountRands(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Proof URL (optional)</span>
                <input
                  type="url"
                  value={paystackEftProofUrl}
                  onChange={(e) => setPaystackEftProofUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="https://…"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">Proof file (optional)</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setPaystackEftProofFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-100 file:text-gray-800"
                />
              </label>
              {paystackEftError && <p className="text-sm text-red-600">{paystackEftError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={paystackEftSubmitting}
                  onClick={() => setPaystackEftModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paystackEftSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {paystackEftSubmitting ? "Saving…" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Update subscription code modal */}
      {subscriptionCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !subscriptionCodeLoading && setSubscriptionCodeModal(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {subscriptionCodeModal.subscriptionCode ? "Update" : "Add"} subscription code – {subscriptionCodeModal.planName || subscriptionCodeModal.planCode}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the Paystack subscription code (e.g. SUB_xxx). You can find this in the Paystack dashboard under Subscriptions.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const code = (subscriptionCodeForm.subscriptionCode || "").trim();
                if (!code) {
                  setSubscriptionCodeError("Subscription code is required.");
                  return;
                }
                setSubscriptionCodeError(null);
                setSubscriptionCodeLoading(true);
                const res = await updateSubscriptionCode(userId, {
                  planCode: subscriptionCodeModal.planCode,
                  subscriptionCode: code,
                });
                setSubscriptionCodeLoading(false);
                if (res.success) {
                  setSubscriptionCodeModal(null);
                  setSubscriptionCodeForm({ subscriptionCode: "" });
                  fetchBilling();
                } else {
                  setSubscriptionCodeError(res.message || "Failed to update.");
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription code</label>
                <input
                  type="text"
                  value={subscriptionCodeForm.subscriptionCode}
                  onChange={(e) => setSubscriptionCodeForm({ subscriptionCode: e.target.value })}
                  placeholder="e.g. SUB_xxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={subscriptionCodeLoading}
                />
              </div>
              {subscriptionCodeError && (
                <p className="text-sm text-red-600">{subscriptionCodeError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !subscriptionCodeLoading && setSubscriptionCodeModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  disabled={subscriptionCodeLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subscriptionCodeLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {subscriptionCodeLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change payment date modal */}
      {changeDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !changeDateLoading && setChangeDateModal(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Change payment date – {changeDateModal.planName || changeDateModal.planCode}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose how the next subscription run should be scheduled. The old Paystack subscription is disabled and a new one is created with your chosen <strong>start</strong>. Use <strong>day of month</strong> for a recurring calendar day (1–28), or a <strong>specific date</strong> for an exact first charge (same as Create subscription). Days 29–31 map to 28 on Paystack.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setChangeDateError(null);
                setChangeDateLoading(true);
                let newPaymentDate;
                if (changeDateForm.mode === "date") {
                  const s = (changeDateForm.specificDate || "").trim();
                  if (!s) {
                    setChangeDateError("Please choose a first charge date.");
                    setChangeDateLoading(false);
                    return;
                  }
                  newPaymentDate = s;
                } else {
                  const day = Number(changeDateForm.dayOfMonth);
                  if (day < 1 || day > 28) {
                    setChangeDateError("Please select a day between 1 and 28.");
                    setChangeDateLoading(false);
                    return;
                  }
                  newPaymentDate = day;
                }
                const res = await changePaystackPaymentDate(userId, {
                  subscriptionCode: changeDateModal.subscriptionCode,
                  newPaymentDate,
                });
                setChangeDateLoading(false);
                if (res.success) {
                  setChangeDateModal(null);
                  fetchBilling();
                  getCustomPlans(userId).then((r) => { if (r?.success && Array.isArray(r.data)) setCustomPlans(r.data); });
                  if (paymentsModalPlan && paymentsModalPlan.planCode === changeDateModal.planCode) {
                    getStudentBilling(userId).then((billingRes) => {
                      if (billingRes?.success && billingRes.plans) {
                        const updatedPlan = billingRes.plans.find((pl) => pl.planCode === changeDateModal.planCode);
                        if (updatedPlan) setPaymentsModalPlan(updatedPlan);
                      }
                    });
                  }
                } else {
                  setChangeDateError(res.message || "Failed to change payment date");
                }
              }}
              className="space-y-4"
            >
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-gray-700 mb-2">Schedule type</legend>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="changeDateMode"
                    className="mt-1"
                    checked={changeDateForm.mode === "day"}
                    onChange={() => setChangeDateForm((f) => ({ ...f, mode: "day" }))}
                    disabled={changeDateLoading}
                  />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Day of month (1–28)</span>
                    <span className="block text-gray-500">Same day each month (next occurrence is computed automatically).</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="changeDateMode"
                    className="mt-1"
                    checked={changeDateForm.mode === "date"}
                    onChange={() => setChangeDateForm((f) => ({ ...f, mode: "date" }))}
                    disabled={changeDateLoading}
                  />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Specific first charge date</span>
                    <span className="block text-gray-500">Exact calendar date for the new subscription&apos;s first debit (YYYY-MM-DD).</span>
                  </span>
                </label>
              </fieldset>
              {changeDateForm.mode === "day" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of month</label>
                  <select
                    value={changeDateForm.dayOfMonth}
                    onChange={(e) => setChangeDateForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={changeDateLoading}
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>{d}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First charge date</label>
                  <input
                    type="date"
                    value={changeDateForm.specificDate}
                    onChange={(e) => setChangeDateForm((f) => ({ ...f, specificDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={changeDateLoading}
                  />
                </div>
              )}
              {changeDateError && (
                <p className="text-sm text-red-600">{changeDateError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !changeDateLoading && setChangeDateModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  disabled={changeDateLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeDateLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {changeDateLoading ? "Changing…" : "Change date"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {splitInstallmentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !splitSubmitting && setSplitInstallmentModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              Split instalment {splitInstallmentModal.inst.number}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Divide{" "}
              <strong>{formatAmount(splitInstallmentModal.inst.amount, splitInstallmentModal.plan.currency)}</strong>{" "}
              into 2 or more payments. Finance sets each amount and due date — they must add up exactly.
            </p>

            {splitInstallmentModal.planType === "2_installment" && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <strong>Warning:</strong> This 2-installment EFT plan will be converted to a{" "}
                <strong>custom payment plan</strong>. The conversion is recorded in plan history and cannot be undone
                automatically.
              </div>
            )}

            <form onSubmit={handleSplitInstallmentSubmit} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Number of payments</label>
                  <input
                    type="number"
                    min={2}
                    max={splitInstallmentModal.maxSplitCount || 24}
                    value={splitForm.paymentCount ?? splitForm.splits.length}
                    onChange={(e) => {
                      const nextCount = Math.min(
                        splitInstallmentModal.maxSplitCount || 24,
                        Math.max(2, Number(e.target.value) || 2)
                      );
                      setSplitForm((f) => ({
                        ...f,
                        paymentCount: nextCount,
                        splits: resizeSplitRows(f.splits, nextCount, splitInstallmentModal.inst),
                      }));
                    }}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 pb-2">
                  Up to {splitInstallmentModal.maxSplitCount || 24} payments for this plan
                </p>
              </div>

              {(splitForm.splits || []).map((row, idx) => (
                <div key={`split-row-${idx}`} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment {idx + 1} amount (R)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) =>
                        setSplitForm((f) => ({
                          ...f,
                          splits: f.splits.map((s, i) => (i === idx ? { ...s, amount: e.target.value } : s)),
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Due date</label>
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={(e) =>
                        setSplitForm((f) => ({
                          ...f,
                          splits: f.splits.map((s, i) => (i === idx ? { ...s, dueDate: e.target.value } : s)),
                        }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  {(splitForm.splits || []).length > 2 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSplitForm((f) => {
                          const splits = f.splits.filter((_, i) => i !== idx);
                          return { ...f, splits, paymentCount: splits.length };
                        })
                      }
                      className="px-2 py-2 text-xs text-red-700 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </div>
              ))}

              <button
                type="button"
                disabled={(splitForm.splits || []).length >= (splitInstallmentModal.maxSplitCount || 24)}
                onClick={() => {
                  const nextCount = Math.min(
                    (splitInstallmentModal.maxSplitCount || 24),
                    (splitForm.splits || []).length + 1
                  );
                  setSplitForm((f) => ({
                    ...f,
                    paymentCount: nextCount,
                    splits: resizeSplitRows(f.splits, nextCount, splitInstallmentModal.inst),
                  }));
                }}
                className="self-start px-3 py-1.5 text-xs font-medium text-indigo-800 bg-indigo-50 rounded hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add payment
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Arrangement note (optional)</label>
                <input
                  type="text"
                  value={splitForm.arrangementNote}
                  onChange={(e) => setSplitForm((f) => ({ ...f, arrangementNote: e.target.value }))}
                  placeholder="e.g. Student agreed to pay over 3 months"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {(() => {
                const sourceAmount = Number(splitInstallmentModal.inst.amount || 0);
                const allocated = Math.round(
                  (splitForm.splits || []).reduce((sum, row) => sum + parseAmountString(row.amount) * 100, 0)
                );
                const remaining = sourceAmount - allocated;
                const matched = remaining === 0;
                return (
                  <p className={`text-sm ${matched ? "text-green-700" : remaining > 0 ? "text-amber-700" : "text-red-700"}`}>
                    Allocated: {formatAmount(allocated, splitInstallmentModal.plan.currency)} /{" "}
                    {formatAmount(sourceAmount, splitInstallmentModal.plan.currency)}
                    {!matched && (
                      <>
                        {" "}
                        · Remaining: {formatAmount(Math.abs(remaining), splitInstallmentModal.plan.currency)}
                        {remaining < 0 ? " over" : ""}
                      </>
                    )}
                  </p>
                );
              })()}

              {splitError && <p className="text-sm text-red-600">{splitError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSplitInstallmentModal(null)}
                  disabled={splitSubmitting}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={splitSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {splitSubmitting ? "Splitting…" : "Split instalment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {installmentHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !revertHistorySaving && setInstallmentHistoryModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              Instalment {installmentHistoryModal.inst.number} — edit history
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Reverting restores the instalment to how it was before that change (status, due date, amount).
            </p>
            {!(installmentHistoryModal.inst.changeHistory || []).length ? (
              <p className="text-sm text-gray-500 py-4">
                No recorded changes yet. History is saved from now when you edit due dates, amounts, or payment arrangement.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {[...(installmentHistoryModal.inst.changeHistory || [])]
                  .slice()
                  .reverse()
                  .map((entry) => {
                    const historyId = entry._id?.toString?.() ?? entry._id;
                    const savingKey = `${installmentHistoryModal.plan._id}-${installmentHistoryModal.inst.number}-${historyId}`;
                    const before = entry.before || {};
                    return (
                      <li key={historyId} className="px-4 py-3 bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">{entry.summary || "Updated"}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {entry.changedByName || "Finance admin"}
                              {" · "}
                              {entry.changedAt
                                ? new Date(entry.changedAt).toLocaleString("en-ZA", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </p>
                            {before.status || before.dueDate ? (
                              <p className="text-xs text-gray-600 mt-1">
                                Before: {before.status || "pending"}
                                {before.dueDate
                                  ? ` · due ${new Date(before.dueDate).toISOString().slice(0, 10)}`
                                  : ""}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            disabled={!!revertHistorySaving}
                            onClick={() =>
                              handleRevertInstallmentHistory(
                                installmentHistoryModal.plan,
                                installmentHistoryModal.inst,
                                historyId,
                                installmentHistoryModal.planType || "custom"
                              )
                            }
                            className="shrink-0 px-3 py-1.5 text-xs font-medium text-indigo-800 bg-indigo-100 rounded hover:bg-indigo-200 disabled:opacity-50"
                          >
                            {revertHistorySaving === savingKey ? "Reverting…" : "Revert"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setInstallmentHistoryModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <RemovePlanCyclesModal
        open={Boolean(removePlanModal)}
        title={`Remove ${removePlanModal?.plan?.planName || removePlanModal?.plan?.planCode || "plan"}`}
        warning={removePlanModal?.warning}
        thisPlan={removePlanModal?.thisPlan || []}
        otherCycles={removePlanModal?.otherCycles || []}
        selectedIds={removePlanModal?.selectedIds || []}
        loading={Boolean(removePlanModal?.loading)}
        confirming={Boolean(removePlanModal?.confirming)}
        error={removePlanModal?.error || null}
        onToggle={(id) =>
          setRemovePlanModal((prev) => {
            if (!prev) return prev;
            const selectedIds = prev.selectedIds.includes(id)
              ? prev.selectedIds.filter((row) => row !== id)
              : [...prev.selectedIds, id];
            return { ...prev, selectedIds };
          })
        }
        onCancel={() => {
          if (removePlanModal?.confirming) return;
          setRemovePlanModal(null);
        }}
        onConfirm={confirmRemovePlanModal}
      />
    </div>
  );
};

export default StudentProfile;
