import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

function headers() {
  const token = localStorage.getItem("TOKEN");
  return token ? { "auth-token": token } : {};
}

function wrap(promise) {
  return promise
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Request failed",
    }));
}

export const getEnrollmentLifecycleTriageQueue = () =>
  wrap(axios.get(`${BASE_URL}/enrollment-lifecycle/triage-queue`, { headers: headers() }));

export const getEnrollmentLifecycleFinanceQueue = (kind) => {
  const q = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  return wrap(axios.get(`${BASE_URL}/enrollment-lifecycle/finance-queue${q}`, { headers: headers() }));
};

export const postEnrollmentLifecycleRetain = (id, body) =>
  wrap(axios.post(`${BASE_URL}/enrollment-lifecycle/requests/${id}/retain`, body, { headers: headers() }));

export const postEnrollmentLifecycleEscalate = (id, body) =>
  wrap(axios.post(`${BASE_URL}/enrollment-lifecycle/requests/${id}/escalate`, body, { headers: headers() }));

export const postEnrollmentLifecycleTransferHandoff = (id, body) =>
  wrap(
    axios.post(`${BASE_URL}/enrollment-lifecycle/requests/${id}/transfer-handoff`, body, {
      headers: headers(),
    })
  );

export const postEnrollmentLifecycleFinanceReturn = (id, body) =>
  wrap(
    axios.post(`${BASE_URL}/enrollment-lifecycle/requests/${id}/finance/return-to-triage`, body, {
      headers: headers(),
    })
  );

export const postEnrollmentLifecycleFinanceApprove = (id, body) =>
  wrap(
    axios.post(`${BASE_URL}/enrollment-lifecycle/requests/${id}/finance/approve-cancellation`, body, {
      headers: headers(),
    })
  );

export const postEnrollmentLifecycleFinanceReject = (id, body) =>
  wrap(
    axios.post(`${BASE_URL}/enrollment-lifecycle/requests/${id}/finance/reject`, body, {
      headers: headers(),
    })
  );

export const postEnrollmentLifecycleFinanceConfirmTransfer = (id, body) =>
  wrap(
    axios.post(`${BASE_URL}/enrollment-lifecycle/requests/${id}/finance/confirm-transfer-adjustment`, body, {
      headers: headers(),
    })
  );

export const postEnrollmentLifecycleCompleteTransfer = (id) =>
  wrap(
    axios.post(`${BASE_URL}/enrollment-lifecycle/requests/${id}/complete-transfer`, {}, { headers: headers() })
  );
