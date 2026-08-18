import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/bootcamp";
const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export const registerCompany = (payload) =>
  axios
    .post(`${API_URL}/register`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const registerTutor = async (payload) => {
  const headers = {
    "Content-Type": "multipart/form-data", // Optional, axios will set this for you when sending FormData
  };

  return axios
    .post(`${BASE_URL}/company/registerTutor`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => console.log(err));
};

export const loginCompany = (payload) =>
  axios
    .post(`${BASE_URL}/company/login`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllBootcamps = ({ company_id }) =>
  axios
    .get(API_URL + `/all?company_id=${company_id}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllcompanies = () =>
  axios
    .get(BASE_URL + "/company/all-company")
    .then((res) => res.data)
    .catch((err) => console.log(err));

/** Company admin accounts (Bootcamp.companyid refs CompanyAdmin) — for Manage Bootcamps link dropdown */
export const getAllCompanyAdmins = () =>
  axios
    .get(BASE_URL + "/company/all-company-admins")
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllLPs = (qctoOnly = false, qctospOnly = false) => {
  const params = {};
  if (qctoOnly) params.qctoOnly = "true";
  if (qctospOnly) params.qctospOnly = "true";
  return axios
    .get(API_URL + `/all/learningpaths`, Object.keys(params).length ? { params } : {})
    .then((res) => res.data)
    .catch((err) => console.log(err));
};

export const getQctoSpLearningPaths = () => getAllLPs(false, true);

export const getAllTutors = () =>
  axios
    .get(BASE_URL + `/company/all-tutors`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

/** Replace bootcamp.tutors (allocated list). Requires company auth-token. */
export const updateBootcampAllocatedTutors = ({ bootcampId, tutorIds }) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  return axios
    .post(
      `${BASE_URL}/bootcamp/update-allocated-tutors`,
      { bootcampId, tutorIds },
      { headers }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to update tutors",
    }));
};

/** Sync one enrolled student to the bootcamp's Athena cohort. */
export const syncStudentToAthena = ({ bootcampId, userId }) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  return axios
    .post(`${API_URL}/${bootcampId}/athena/sync-student`, { userId }, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to sync to Athena",
    }));
};

export const getAllAssessors = () =>
  axios
    .get(BASE_URL + `/company/all-assessors`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllModerators = () =>
  axios
    .get(BASE_URL + `/company/all-moderators`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

const companyAuthHeaders = () => {
  const token = localStorage.getItem("TOKEN");
  return token
    ? { "auth-token": token, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

export const getTeamMembers = () =>
  axios
    .get(`${BASE_URL}/company/team-members`, { headers: companyAuthHeaders() })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load team",
    }));

export const updateTeamMemberRatePerCredit = (memberId, ratePerCredit) =>
  axios
    .patch(
      `${BASE_URL}/company/team-members/${memberId}/rate-per-credit`,
      { ratePerCredit },
      { headers: companyAuthHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to update rate",
    }));

export const updateTeamMemberLinkedFinanceStaff = (memberId, linkedStaffId) =>
  axios
    .patch(
      `${BASE_URL}/company/team-members/${memberId}/linked-finance-staff`,
      { linkedStaffId },
      { headers: companyAuthHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to update finance link",
    }));

export const updateTeamMemberPassword = (memberId, password) =>
  axios
    .patch(
      `${BASE_URL}/company/team-members/${memberId}/password`,
      { password },
      { headers: companyAuthHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to update password",
    }));

export const getAssessorEarnings = (params = {}) => {
  const q = new URLSearchParams();
  if (params.mode) q.set("mode", params.mode);
  if (params.month) q.set("month", params.month);
  if (params.rangeStart) q.set("rangeStart", params.rangeStart);
  if (params.rangeEnd) q.set("rangeEnd", params.rangeEnd);
  if (params.cohortId) q.set("cohortId", params.cohortId);
  if (params.allTime) q.set("allTime", "true");
  const qs = q.toString();
  return axios
    .get(`${BASE_URL}/company/assessor-earnings${qs ? `?${qs}` : ""}`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load earnings",
    }));
};

export const getAssessorNotificationSettings = () =>
  axios
    .get(`${BASE_URL}/company/assessor-notification-settings`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load notification settings",
    }));

export const updateAssessorNotificationSettings = (notificationEmail) =>
  axios
    .patch(
      `${BASE_URL}/company/assessor-notification-settings`,
      { notificationEmail: notificationEmail.trim() || null },
      { headers: companyAuthHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to save notification settings",
    }));

export const getModeratorNotificationSettings = () =>
  axios
    .get(`${BASE_URL}/company/moderator-notification-settings`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load notification settings",
    }));

export const updateModeratorNotificationSettings = (notificationEmail) =>
  axios
    .patch(
      `${BASE_URL}/company/moderator-notification-settings`,
      { notificationEmail: notificationEmail.trim() || null },
      { headers: companyAuthHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to save notification settings",
    }));

export const getModeratorEarnings = (params = {}) => {
  const q = new URLSearchParams();
  if (params.mode) q.set("mode", params.mode);
  if (params.month) q.set("month", params.month);
  if (params.rangeStart) q.set("rangeStart", params.rangeStart);
  if (params.rangeEnd) q.set("rangeEnd", params.rangeEnd);
  if (params.cohortId) q.set("cohortId", params.cohortId);
  if (params.allTime) q.set("allTime", "true");
  const qs = q.toString();
  return axios
    .get(`${BASE_URL}/company/moderator-earnings${qs ? `?${qs}` : ""}`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load earnings",
    }));
};

export const getAssessorEarningsFinanceSummary = (params = {}) => {
  const q = new URLSearchParams();
  if (params.mode) q.set("mode", params.mode);
  if (params.month) q.set("month", params.month);
  if (params.rangeStart) q.set("rangeStart", params.rangeStart);
  if (params.rangeEnd) q.set("rangeEnd", params.rangeEnd);
  const qs = q.toString();
  return axios
    .get(`${BASE_URL}/company/assessor-earnings/finance-summary${qs ? `?${qs}` : ""}`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load assessor earnings",
    }));
};

export const recordAssessorEarningPayment = (staffId, { amountZar, comments, paidAt, file, role }) => {
  const formData = new FormData();
  formData.append("amountZar", String(amountZar));
  if (comments) formData.append("comments", comments);
  if (paidAt) formData.append("paidAt", paidAt);
  if (file) formData.append("file", file);
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const path =
    role === "MODERATOR"
      ? `${BASE_URL}/company/moderator-earnings/${staffId}/payments`
      : `${BASE_URL}/company/assessor-earnings/${staffId}/payments`;
  return axios
    .post(path, formData, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to record payment",
    }));
};

export const getAssessorEarningPaymentProofUrl = (paymentId) =>
  axios
    .get(`${BASE_URL}/company/assessor-earnings/payments/${paymentId}/proof-url`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load proof",
    }));

export const getAssessorPaymentsStatement = (params = {}) => {
  const q = new URLSearchParams();
  if (params.mode) q.set("mode", params.mode);
  if (params.month) q.set("month", params.month);
  if (params.rangeStart) q.set("rangeStart", params.rangeStart);
  if (params.rangeEnd) q.set("rangeEnd", params.rangeEnd);
  if (params.assessorId) q.set("assessorId", params.assessorId);
  if (params.allTime) q.set("allTime", "true");
  const qs = q.toString();
  return axios
    .get(`${BASE_URL}/company/assessor-earnings/payments-statement${qs ? `?${qs}` : ""}`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load statement",
    }));
};

export const getBootcampDetails = (bootcamp_id) =>
  axios
    .get(API_URL + `/details?bootcamp_id=${bootcamp_id}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const addCompany = (payload) =>
  axios
    .post(`${BASE_URL}/company/register`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const addProgram = (payload) =>
  axios
    .post(`${API_URL}/add`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const addIntoExiting = (payload) =>
  axios
    .post(`${API_URL}/exitsing/enroll`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const fetchCalPreviewData = (payload) =>
  axios
    // .post("https://asif-dev.herokuapp.com/bootcamp/preview-calendar", payload)
    .post(`${API_URL}/preview-calendar`, payload)

    .then((res) => res.data)
    .catch((err) => console.log(err));

/** Get short-lived token so student app allows this admin to edit calendar tile colours for the given student. */
export const getEditTilesToken = (studentEmail) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .post(`${API_URL}/edit-tiles-token`, { studentEmail: studentEmail || "" }, { headers })
    .then((res) => res.data)
    .catch((err) => ({ success: false, token: null }));
};

export const syncUserProgress = ({ learningpath, userid, date }) =>
  axios
    .get(
      `${API_URL}/sync-user-bootcamp-progress?learningpath=${learningpath}&userid=${userid}`
    )
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getUserStats = ({ learningpath, userid, date }) =>
  axios
    .get(`${API_URL}/user-stats?learningpath=${learningpath}&userid=${userid}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const checkEnrollmentEligibility = (payload) =>
  axios
    .post(`${API_URL}/check-enroll-eligiblity`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const createAccountsForEmails = (payload) =>
  axios
    .post(`${API_URL}/create-accounts-for-emails`, payload)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });

/** Create or link account with student number. Creates new account (password = student_number) or links student_number to existing. */
export const createOrLinkAccountWithStudentNumber = (payload) =>
  axios
    .post(`${API_URL}/create-or-link-account-with-student-number`, payload)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });

export const enrollStudentsIntoLP = (payload) =>
  axios
    .post(`${BASE_URL}/dashboard/enrollmany`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const checkAuthToken = (payload) =>
  axios
    .post(`${BASE_URL}/company/checkAuthToken`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllWarnings = ({ bootcampid, userid }) =>
  axios
    .get(
      `${BASE_URL}/bootcamp/bootcamp-warnings?bootcampid=${bootcampid}&userid=${userid}`
    )
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const sendWarningEmail = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/send-warnings-email`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));


export const pingStudent = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/ping-student`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const sendDiscordDM = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/send-discord-dm`, payload)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: 'Failed to send Discord message' };
    });

export const trackWhatsAppMessage = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/track-whatsapp`, payload)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: 'Failed to track WhatsApp message' };
    });

export const mapCompanyBootcamp = (payload) =>
  axios
    .post(`${BASE_URL}/company/map-bootcamp-company`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const enrollIntoBootcamp = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/enroll`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getTutorDetails = (tutorId) =>
  axios
    .get(`${BASE_URL}/company/tutor-details/${tutorId}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

// OC Cohort APIs
export const createOCCohort = (payload) =>
  axios
    .post(`${BASE_URL}/oc-cohort/create`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllOCCohorts = (company_id) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const url = company_id 
    ? `${BASE_URL}/oc-cohort/all?company_id=${company_id}`
    : `${BASE_URL}/oc-cohort/all`;
  
  return axios
    .get(url, { headers })
    .then((res) => res.data)
    .catch((err) => console.log(err));
};

export const getOCCohortDetails = (cohortId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}`, { headers })
    .then((res) => res.data)
    .catch((err) => console.log(err));
};

export const getCohortStudents = (cohortId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}/students`, { headers })
    .then((res) => res.data)
    .catch((err) => console.log(err));
};

/** view: 'km' | 'pm' — per-learner workbook/PMT + SA flags for each QCTO module on the cohort path */
export const getCohortQctoTracker = (cohortId, view = "km") => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}/qcto-tracker`, {
      headers,
      params: { view },
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

/** Assessor queue: KM/PM submissions made after cohort deadline */
export const getAssessorLateSubmissions = (params = {}) => {
  const q = new URLSearchParams();
  if (params.cohortId) q.set("cohortId", params.cohortId);
  if (params.view) q.set("view", params.view);
  if (params.pendingOnly === false) q.set("pendingOnly", "false");
  if (params.countOnly) q.set("countOnly", "true");
  const qs = q.toString();
  return axios
    .get(`${BASE_URL}/oc-cohort/assessor/late-submissions${qs ? `?${qs}` : ""}`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load late submissions",
    }));
};

/** Tutor queue: late KM/PM submissions needing tutor sign-off */
export const getTutorLateVerifications = (params = {}) => {
  const q = new URLSearchParams();
  if (params.cohortId) q.set("cohortId", params.cohortId);
  if (params.view) q.set("view", params.view);
  if (params.pendingOnly === false) q.set("pendingOnly", "false");
  if (params.countOnly) q.set("countOnly", "true");
  const qs = q.toString();
  return axios
    .get(`${BASE_URL}/oc-cohort/tutor/late-verifications${qs ? `?${qs}` : ""}`, {
      headers: companyAuthHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load late verifications",
    }));
};

/** --- Moderation sample batches (v1) --- */
const moderationSampleHeaders = () => {
  const token = localStorage.getItem("TOKEN");
  return {
    "Content-Type": "application/json",
    ...(token ? { "auth-token": token } : {}),
  };
};

function moderationApiError(err, fallback) {
  if (err?.response?.status === 404) {
    return {
      success: false,
      message:
        "Moderation samples API not found. Restart zaio-backend (npm start) so new routes load.",
    };
  }
  return {
    success: false,
    message: err?.response?.data?.message || err?.message || fallback,
  };
}

export const getModerationSampleEligibility = (cohortId, params) =>
  axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}/moderation-samples/eligibility`, {
      headers: moderationSampleHeaders(),
      params,
    })
    .then((res) => res.data)
    .catch((err) => moderationApiError(err, "Request failed"));

export const listModerationSamplesForCohort = (cohortId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}/moderation-samples`, {
      headers: moderationSampleHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({ ...moderationApiError(err, "Request failed"), data: [] }));

export const createModerationSampleDraft = (cohortId, body) =>
  axios
    .post(`${BASE_URL}/oc-cohort/${cohortId}/moderation-samples`, body, {
      headers: moderationSampleHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => moderationApiError(err, "Request failed"));

export const getModerationSampleBatch = (batchId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/moderation-samples/${batchId}`, {
      headers: moderationSampleHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => moderationApiError(err, "Request failed"));

export const regenerateModerationSample = (batchId) =>
  axios
    .post(`${BASE_URL}/oc-cohort/moderation-samples/${batchId}/regenerate`, {}, {
      headers: moderationSampleHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => moderationApiError(err, "Request failed"));

export const remoderateModerationSample = (batchId) =>
  axios
    .post(`${BASE_URL}/oc-cohort/moderation-samples/${batchId}/remoderate`, {}, {
      headers: moderationSampleHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => moderationApiError(err, "Request failed"));

export const patchModerationSampleItems = (batchId, adjustments) =>
  axios
    .patch(
      `${BASE_URL}/oc-cohort/moderation-samples/${batchId}/items`,
      { adjustments },
      { headers: moderationSampleHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => moderationApiError(err, "Request failed"));

export const sendModerationSampleToModerator = (batchId, body = {}) =>
  axios
    .post(`${BASE_URL}/oc-cohort/moderation-samples/${batchId}/send`, body, {
      headers: moderationSampleHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => moderationApiError(err, "Request failed"));

export const listMyModerationSamples = () =>
  axios
    .get(`${BASE_URL}/oc-cohort/moderation-samples/mine`, {
      headers: moderationSampleHeaders(),
    })
    .then((res) => res.data)
    .catch((err) => ({ ...moderationApiError(err, "Request failed"), data: [] }));

export const updateModerationSampleItemStatus = (batchId, itemId, body) =>
  axios
    .patch(
      `${BASE_URL}/oc-cohort/moderation-samples/${batchId}/items/${itemId}/moderation-status`,
      body,
      { headers: moderationSampleHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => moderationApiError(err, "Request failed"));

export const downloadModerationSampleManifest = async (batchId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const res = await axios.get(
    `${BASE_URL}/oc-cohort/moderation-samples/${batchId}/manifest.csv`,
    { headers, responseType: "blob" }
  );
  const blob = new Blob([res.data], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `moderation-sample-${batchId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const createModerationReport = async (
  batchId,
  {
    moderatorFirstName,
    moderatorSurname,
    moderatorIdNumber,
    moderatorRegistrationId,
    moderatorSignature,
    moderatorComments,
    regenerate = false,
  } = {}
) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  try {
    const res = await axios.post(
      `${BASE_URL}/oc-cohort/moderation-samples/${batchId}/create-report`,
      {
        moderatorFirstName,
        moderatorSurname,
        moderatorIdNumber,
        moderatorRegistrationId,
        moderatorSignature,
        moderatorComments,
        regenerate,
      },
      { headers, responseType: "blob" }
    );
    const contentType = res.headers["content-type"] || "application/pdf";
    const ext = contentType.includes("html") ? "html" : "pdf";
    const blob = new Blob([res.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moderation-report-${batchId}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text);
        return { success: false, message: parsed.message || "Could not create report" };
      } catch {
        return { success: false, message: "Could not create report" };
      }
    }
    return { success: false, message: err?.message || "Could not create report" };
  }
};

export const viewModerationReport = async (batchId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  try {
    const res = await axios.get(
      `${BASE_URL}/oc-cohort/moderation-samples/${batchId}/report.pdf`,
      { headers, responseType: "blob" }
    );
    const contentType = res.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      const text = await res.data.text();
      const parsed = JSON.parse(text);
      return { success: false, message: parsed.message || "Could not open report" };
    }
    const blob = new Blob([res.data], {
      type: contentType || "application/pdf",
    });
    const url = window.URL.createObjectURL(blob);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    if (!opened) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
    return { success: true };
  } catch (err) {
    const status = err?.response?.status;
    if (err?.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        if (text.trim().startsWith("{")) {
          const parsed = JSON.parse(text);
          return { success: false, message: parsed.message || "Could not open report" };
        }
        if (status === 404) {
          return {
            success: false,
            message: "Report not found. Restart the backend if you recently deployed changes.",
          };
        }
      } catch {
        return { success: false, message: "Could not open report" };
      }
    }
    return { success: false, message: err?.message || "Could not open report" };
  }
};

/** Tutor + super student admin. `deadlines`: [{ courseId, courseDue? }] for OC bootcamp learning path */
export const updateOCCohortNonQctoModuleDeadlines = (cohortId, deadlines) => {
  const token = localStorage.getItem("TOKEN");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "auth-token": token } : {}),
  };
  return axios
    .patch(`${BASE_URL}/oc-cohort/${cohortId}/non-qcto-module-deadlines`, { deadlines }, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

/** Tutor + super student admin. `deadlines`: [{ courseId, learnerWorkbookDue?, summativeDue?, pmModuleDue? }] */
export const updateOCCohortModuleDeadlines = (cohortId, deadlines) => {
  const token = localStorage.getItem("TOKEN");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "auth-token": token } : {}),
  };
  return axios
    .patch(`${BASE_URL}/oc-cohort/${cohortId}/module-deadlines`, { deadlines }, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

/** Requires company auth-token. Returns axios response with responseType blob (application/zip). */
export const downloadPoeIdCopiesZip = (cohortId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios.get(`${BASE_URL}/oc-cohort/${cohortId}/download-poe-id-copies-zip`, {
    headers,
    responseType: "blob",
  });
};

/** POE documents per learner (signed URLs). Requires auth-token. */
export const getCohortLearnerPoeDocuments = (cohortId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}/learner-poe-documents`, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

/** Add students to an existing OC cohort (comma-separated emails). Call createAccountsForEmails first if you want to create accounts and email new users. */
export const addStudentsToOCCohort = (cohortId, payload) =>
  axios
    .post(`${BASE_URL}/oc-cohort/${cohortId}/add-students`, payload)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });

export const assignAssessor = (cohortId, assessorId) =>
  axios
    .post(`${BASE_URL}/oc-cohort/${cohortId}/assign-assessor`, {
      assessorId,
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const assignModerator = (cohortId, moderatorId) =>
  axios
    .post(`${BASE_URL}/oc-cohort/${cohortId}/assign-moderator`, {
      moderatorId,
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));

// Live Classes
export const getLiveClasses = (cohortId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}/live-classes`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const createLiveClass = (cohortId, payload) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .post(`${BASE_URL}/oc-cohort/${cohortId}/live-classes`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

export const updateLiveClass = (cohortId, liveClassId, payload) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .put(`${BASE_URL}/oc-cohort/${cohortId}/live-classes/${liveClassId}`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

export const deleteLiveClass = (cohortId, liveClassId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .delete(`${BASE_URL}/oc-cohort/${cohortId}/live-classes/${liveClassId}`, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

// Bootcamp Live Classes
export const getBootcampLiveClasses = (bootcampId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .get(`${BASE_URL}/bootcamp/${bootcampId}/live-classes`, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

export const createBootcampLiveClass = (bootcampId, payload) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .post(`${BASE_URL}/bootcamp/${bootcampId}/live-classes`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

export const updateBootcampLiveClass = (bootcampId, liveClassId, payload) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .put(`${BASE_URL}/bootcamp/${bootcampId}/live-classes/${liveClassId}`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

export const deleteBootcampLiveClass = (bootcampId, liveClassId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .delete(`${BASE_URL}/bootcamp/${bootcampId}/live-classes/${liveClassId}`, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

export const getOCStudentDetails = (studentId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .get(`${BASE_URL}/oc-cohort/student/${studentId}`, { headers })
    .then((res) => res.data)
    .catch((err) => console.log(err));
};

export const getOCModuleDetails = (studentId, moduleId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .get(`${BASE_URL}/oc-cohort/student/${studentId}/module/${moduleId}`, { headers })
    .then((res) => res.data)
    .catch((err) => console.log(err));
};

export const assignTutorToStudent = (enrollmentId, tutorId) =>
  axios
    .post(`${BASE_URL}/oc-cohort/enrollment/${enrollmentId}/assign-tutor`, {
      tutorId,
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));

/** Mark OC cohort enrollment hidden from tutors/assessors/moderators (super student admin / company admin). */
export const patchOcEnrollmentExcludeFromOcStaffViews = (enrollmentId, excludeFromOcStaffViews) => {
  const token = localStorage.getItem("TOKEN");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "auth-token": token } : {}),
  };
  return axios
    .patch(
      `${BASE_URL}/oc-cohort/enrollment/${enrollmentId}/exclude-from-oc-staff-views`,
      { excludeFromOcStaffViews },
      { headers }
    )
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

export const tutorSignOffQCTOAssessment = (assessmentId, submissionId, tutorSignature = "") =>
  axios
    .post(`${BASE_URL}/oc-cohort/qcto-assessment/${assessmentId}/submission/${submissionId}/tutor-sign-off`, {
      tutorSignature,
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const tutorSignOffQCTOPMT = (taskId, submissionId, tutorSignature = "") =>
  axios
    .post(`${BASE_URL}/oc-cohort/qcto-pmt/${taskId}/submission/${submissionId}/tutor-sign-off`, {
      tutorSignature,
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const tutorSignOffQCTOLW = (assessmentId, submissionId, tutorSignature = "") =>
  axios
    .post(`${BASE_URL}/oc-cohort/qctolw/${assessmentId}/submission/${submissionId}/tutor-sign-off`, {
      tutorSignature,
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));

const ocQctoSubmissionsHeaders = () => {
  const token = localStorage.getItem("TOKEN");
  return token ? { "auth-token": token } : {};
};

/** QCTO Summative (QCTOSA) submissions for one student — company assessor/moderator/tutor token */
export const getQCTOAssessmentSubmissionsForStudent = (assessmentId, studentId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/qcto-assessment/${assessmentId}/submissions`, {
      headers: ocQctoSubmissionsHeaders(),
      params: { studentId },
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      data: [],
      message: err.response?.data?.message || err.message || "Request failed",
    }));

/** QCTO PMT submissions for one student */
export const getQCTOPMTSubmissionsForStudent = (taskId, studentId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/qcto-pmt/${taskId}/submissions`, {
      headers: ocQctoSubmissionsHeaders(),
      params: { studentId },
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      data: [],
      message: err.response?.data?.message || err.message || "Request failed",
    }));

/** QCTO Learner Workbook submissions for one student */
export const getQCTOLearnerWorkbookSubmissionsForStudent = (assessmentId, studentId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/qctolw/${assessmentId}/submissions`, {
      headers: ocQctoSubmissionsHeaders(),
      params: { studentId },
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      data: [],
      message: err.response?.data?.message || err.message || "Request failed",
    }));

/** Get QCTO learner enrollments (optionally filter by cohortId) */
export const getQCTOLearnerEnrollments = (cohortId = null) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const url = cohortId
    ? `${BASE_URL}/oc-cohort/qcto-learner-enrollments?cohortId=${cohortId}`
    : `${BASE_URL}/oc-cohort/qcto-learner-enrollments`;
  return axios
    .get(url, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: [] };
    });
};

// Student enrolled bootcamps (paginated, default 4 per page for sync GET)
export const getEnrolledBootcamps = ({ page = 1, limit = 4 } = {}) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const params = { page, limit };

  return axios
    .get(`${BASE_URL}/bootcamp/enrolled`, { headers, params, timeout: 120000 })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { enrolledBootcamps: [], total: 0, page: 1, limit: 4, totalPages: 0 };
    });
};

const ENROLLED_POLL_INTERVAL_MS = 2000;
const ENROLLED_POLL_MAX_WAIT_MS = 3 * 60 * 1000;

function enrolledPollSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads enrolled bootcamps via POST /enrolled/start + polling GET …/job/:id (Heroku-safe).
 * Falls back to direct GET if async routes are unavailable.
 * @param {object} params - { page, limit, includeExcluded ignored }
 * @param {object} [opts] - { onPoll?: () => void }
 */
export async function getEnrolledBootcampsWithPolling({ page = 1, limit = 12 } = {}, opts = {}) {
  const { onPoll } = opts;
  const token = localStorage.getItem("TOKEN");
  const authHeaders = token ? { "auth-token": token } : {};
  const body = { page, limit };
  try {
    const startRes = await axios.post(`${BASE_URL}/bootcamp/enrolled/start`, body, {
      headers: { ...authHeaders, "Content-Type": "application/json" },
      timeout: 60000,
    });
    if (!startRes.data?.success || !startRes.data?.jobId) {
      return getEnrolledBootcamps({ page, limit });
    }
    const { jobId } = startRes.data;
    const deadline = Date.now() + ENROLLED_POLL_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      onPoll?.();
      const pollRes = await axios.get(`${BASE_URL}/bootcamp/enrolled/job/${jobId}`, {
        headers: authHeaders,
        timeout: 60000,
      });
      const d = pollRes.data;
      if (d?.success && d.pending) {
        await enrolledPollSleep(ENROLLED_POLL_INTERVAL_MS);
        continue;
      }
      return d;
    }
    return {
      success: false,
      message: "Loading bootcamps is taking too long. Try again or use a smaller page size.",
      enrolledBootcamps: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 405) {
      return getEnrolledBootcamps({ page, limit });
    }
    return {
      enrolledBootcamps: [],
      total: 0,
      page: 1,
      limit: 4,
      totalPages: 0,
    };
  }
}

// Archive a bootcamp
export const archiveBootcamp = (bootcampId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  
  return axios
    .post(`${BASE_URL}/bootcamp/archive/${bootcampId}`, {}, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: "Failed to archive bootcamp" };
    });
};

// Archive multiple bootcamps
export const archiveManyBootcamps = (bootcampIds) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  
  return axios
    .post(`${BASE_URL}/bootcamp/archive-many`, { bootcampIds }, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: "Failed to archive bootcamps" };
    });
};

// Get bootcamp config for editing
export const getBootcampConfig = (bootcampId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  
  return axios
    .get(`${BASE_URL}/bootcamp/config/${bootcampId}`, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: "Failed to get bootcamp config" };
    });
};

// Link/unlink Google Classroom course to bootcamp
export const linkBootcampGoogleClassroom = (bootcampId, googleClassroomCourseId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .put(`${BASE_URL}/bootcamp/config/${bootcampId}/link-google-classroom`, { googleClassroomCourseId }, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Failed to update" };
    });
};

/** SUPER_ADMIN or SUPER_STUDENT_ADMIN: create Discord cohort role + private channel (bot must be online). */
export const provisionBootcampDiscord = (bootcampId, body) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  return axios
    .post(`${BASE_URL}/bootcamp/config/${bootcampId}/provision-discord`, body || {}, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err.message || "Failed to provision Discord",
      ...(typeof err?.response?.data === "object" && err.response.data ? err.response.data : {}),
    }));
};

/** Save Discord role + channel snowflake IDs (manual setup) or { clear: true }. */
export const saveBootcampDiscordLinks = (bootcampId, body) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  return axios
    .put(`${BASE_URL}/bootcamp/config/${bootcampId}/discord-links`, body || {}, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err.message || "Failed to save Discord links",
      ...(typeof err?.response?.data === "object" && err.response.data ? err.response.data : {}),
    }));
};

// Edit bootcamp configuration
export const editBootcampConfig = (bootcampId, config) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  
  return axios
    .put(`${BASE_URL}/bootcamp/config/${bootcampId}`, config, { headers })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: "Failed to update bootcamp config" };
    });
};

export const closeBootcampSpRegistration = (bootcampId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .post(`${BASE_URL}/bootcamp/${bootcampId}/qcto-sp-registration/close`, {}, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err.message || "Failed to close registration",
    }));
};

export const reopenBootcampSpRegistration = (bootcampId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .post(`${BASE_URL}/bootcamp/${bootcampId}/qcto-sp-registration/reopen`, {}, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err.message || "Failed to reopen registration",
    }));
};

export const getBootcampSpRegistrationList = (bootcampId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .get(`${BASE_URL}/bootcamp/${bootcampId}/qcto-sp-registration/list`, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err.message || "Failed to load registration list",
    }));
};

export const exportBootcampQctoSpStage = (bootcampId, stage, exportSettings = {}) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .post(`${BASE_URL}/bootcamp/${bootcampId}/qcto-sp-registration/export/${stage}`, exportSettings, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err.message || "Failed to export QCTO workbook",
    }));
};

export const configureQctoSpBootcampAndEnroll = (bootcampId, payload) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .post(`${BASE_URL}/bootcamp/${bootcampId}/qcto-sp-registration/configure-and-enroll`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err.message || "Failed to configure Skills Programme",
    }));
};

export const updateCohortLifecycleStatus = (bootcampId, status) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};

  return axios
    .put(`${BASE_URL}/bootcamp/${bootcampId}/cohort-lifecycle-status`, { status }, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err.message || "Failed to update cohort status",
    }));
};

// ----- Tutor booking / availability (tutor dashboard) -----
const tutorBookingHeaders = () => {
  const token = localStorage.getItem("TOKEN");
  return token ? { "auth-token": token } : {};
};

export const getMyTutorAvailability = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/availability`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: null };
    });

export const setMyTutorAvailability = (payload) =>
  axios
    .put(`${BASE_URL}/tutor-booking/availability`, payload, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Failed to save" };
    });

export const getMyTutorBookings = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/tutor-bookings`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: [] };
    });

export const getMyTutorReviews = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/my-reviews`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, reviews: [] };
    });

export const getAdminTutorBookings = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/admin/all-bookings`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, bookings: [] };
    });

// Google Calendar: get OAuth URL to connect calendar (tutor)
export const getGoogleCalendarAuthUrl = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/google-calendar/auth-url`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, authUrl: null, message: err?.response?.data?.message };
    });

// Google Calendar: disconnect (tutor)
export const disconnectGoogleCalendar = () =>
  axios
    .post(`${BASE_URL}/tutor-booking/google-calendar/disconnect`, {}, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message };
    });

// Google Classroom: tutor connect + fetch ungraded submissions for bootcamp students
export const getTutorGoogleClassroomConfig = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/google-classroom/config`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch(() => ({ success: false, clientId: null }));

export const getTutorGoogleClassroomAuthUrl = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/google-classroom/auth-url`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Failed to get auth URL" };
    });

export const exchangeTutorGoogleClassroomCode = (code) =>
  axios
    .post(`${BASE_URL}/tutor-booking/google-classroom/exchange-code`, { code }, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Failed to connect" };
    });

export const getTutorClassroomSubmissions = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/google-classroom/submissions`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: [], message: err?.response?.data?.message };
    });

export const getTutorClassroomConnectionStatus = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/google-classroom/connection-status`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch(() => ({ success: false, connected: false }));

export const getLinkableBootcamps = () =>
  axios
    .get(`${BASE_URL}/tutor-booking/google-classroom/linkable-bootcamps`, { headers: tutorBookingHeaders() })
    .then((res) => res.data)
    .catch(() => ({ success: false, bootcamps: [] }));

export const linkClassroomSubmissions = (bootcampIds) =>
  axios
    .post(
      `${BASE_URL}/tutor-booking/google-classroom/link-submissions`,
      { bootcampIds: Array.isArray(bootcampIds) ? bootcampIds : [] },
      { headers: tutorBookingHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to link submissions",
    }));

export const setAssignmentInTalks = (bootcampId, courseWorkId, submissionUserId, { studentEmail, assignmentTitle, submissionLink } = {}) =>
  axios
    .post(
      `${BASE_URL}/tutor-booking/google-classroom/assignment-in-talks`,
      { bootcampId, courseWorkId, submissionUserId, studentEmail, assignmentTitle, submissionLink },
      { headers: tutorBookingHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to set",
    }));

export const linkClassroomUserManually = (zaioUserId, googleClassroomUserId, bootcampId) =>
  axios
    .post(
      `${BASE_URL}/tutor-booking/google-classroom/link-manually`,
      { zaioUserId, googleClassroomUserId, bootcampId },
      { headers: tutorBookingHeaders() }
    )
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to link",
    }));

/** Students with 2+ rejected billing records (failed payments). Params: includeExcluded */
export const getFinanceAttentionRejected = (params = {}) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const search = new URLSearchParams();
  if (params.includeExcluded) {
    search.set("includeExcluded", "true");
  }
  const q = search.toString();
  return axios
    .get(`${BASE_URL}/bootcamp/finance-attention-rejected${q ? `?${q}` : ""}`, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to load attention list",
    }));
};

/** EFT proof uploads awaiting approval (same auth as Finance). Params: includeExcluded */
export const getFinancePendingEftSubmissions = (params = {}) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const search = new URLSearchParams();
  if (params.includeExcluded) {
    search.set("includeExcluded", "true");
  }
  const q = search.toString();
  return axios
    .get(`${BASE_URL}/bootcamp/finance-pending-eft-submissions${q ? `?${q}` : ""}`, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to load pending EFT list",
      submissions: [],
    }));
};

/** Finance dashboard: installments due in period (Paystack + EFT). Params: { year, month } or { start, end } ISO dates; includeExcluded to show test-marked accounts */
export const getFinanceSummary = (params = {}) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const search = new URLSearchParams();
  if (params.year != null && params.month != null) {
    search.set("year", String(params.year));
    search.set("month", String(params.month));
  } else if (params.start && params.end) {
    search.set("start", params.start);
    search.set("end", params.end);
  }
  if (params.includeExcluded) {
    search.set("includeExcluded", "true");
  }
  const q = search.toString();
  return axios
    .get(`${BASE_URL}/bootcamp/finance-summary${q ? `?${q}` : ""}`, {
      headers,
      timeout: 120000,
    })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load finance data",
    }));
};

const FINANCE_POLL_INTERVAL_MS = 2000;
const FINANCE_POLL_MAX_WAIT_MS = 4 * 60 * 1000;

function financePollSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads finance summary via POST /finance-summary/start + polling GET …/job/:id so Heroku’s ~30s HTTP limit
 * does not kill long-running reports. Falls back to direct GET if the async routes are unavailable.
 * @param {object} opts - { onPoll?: () => void } called between poll attempts while still pending
 */
export async function getFinanceSummaryWithPolling(params = {}, opts = {}) {
  const { onPoll } = opts;
  const token = localStorage.getItem("TOKEN");
  const authHeaders = token ? { "auth-token": token } : {};
  try {
    const startRes = await axios.post(`${BASE_URL}/bootcamp/finance-summary/start`, params, {
      headers: { ...authHeaders, "Content-Type": "application/json" },
      timeout: 120000,
    });
    if (!startRes.data?.success || !startRes.data?.jobId) {
      return getFinanceSummary(params);
    }
    const { jobId } = startRes.data;
    const deadline = Date.now() + FINANCE_POLL_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      onPoll?.();
      const pollRes = await axios.get(`${BASE_URL}/bootcamp/finance-summary/job/${jobId}`, {
        headers: authHeaders,
        timeout: 120000,
      });
      const d = pollRes.data;
      if (d?.success && d.pending) {
        await financePollSleep(FINANCE_POLL_INTERVAL_MS);
        continue;
      }
      return d;
    }
    return {
      success: false,
      message:
        "Finance summary is still running or took too long. Try again, pick a narrower date range, or refresh shortly.",
    };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404 || status === 405) {
      return getFinanceSummary(params);
    }
    return {
      success: false,
      message: err?.response?.data?.message || err?.message || "Failed to load finance data",
    };
  }
}

/** Upload roster CSV/XLSX; returns rows with inSystem, hasPaymentPlan, userId for profile links */
export const postRosterPaymentCheck = (file) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const formData = new FormData();
  formData.append("file", file);
  return axios
    .post(`${BASE_URL}/bootcamp/roster-payment-check`, formData, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to process roster",
    }));
};

const rosterTaskHeaders = () => {
  const token = localStorage.getItem("TOKEN");
  return token
    ? { "auth-token": token, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
};

/** Save analyzed roster as a persisted reconciliation task */
export const createRosterTask = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/roster-tasks`, payload, { headers: rosterTaskHeaders() })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to save task",
    }));

export const getRosterTasks = () =>
  axios
    .get(`${BASE_URL}/bootcamp/roster-tasks`, { headers: rosterTaskHeaders() })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to load tasks",
    }));

export const getRosterTask = (taskId) =>
  axios
    .get(`${BASE_URL}/bootcamp/roster-tasks/${taskId}`, { headers: rosterTaskHeaders() })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to load task",
    }));

export const patchRosterTaskRow = (taskId, rowId, workflow) =>
  axios
    .patch(`${BASE_URL}/bootcamp/roster-tasks/${taskId}/rows/${rowId}`, { workflow }, { headers: rosterTaskHeaders() })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to update row",
    }));

export const refreshRosterTask = (taskId) =>
  axios
    .post(`${BASE_URL}/bootcamp/roster-tasks/${taskId}/refresh`, {}, { headers: rosterTaskHeaders() })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to refresh",
    }));

export const deleteRosterTask = (taskId) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .delete(`${BASE_URL}/bootcamp/roster-tasks/${taskId}`, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to delete task",
    }));
};

/** Re-provision Nbgrader / DS notebook files for a student in one course (company admin). */
export const postReEnrollDsCourse = (payload) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token
    ? { "auth-token": token, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
  return axios
    .post(`${BASE_URL}/bootcamp/re-enroll-ds-course`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || err?.message || "Re-enroll failed",
    }));
};

/** Issue learner JWT for a student (company admin auth + COMPANY_LOGIN_AS_STUDENT_PASSWORD). */
export const postStudentLoginAsToken = (payload) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  return axios
    .post(`${BASE_URL}/bootcamp/student-login-as-token`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to open student session",
    }));
};

/** Pull failed Paystack transactions for the period and add BillingRecords (rejected). Params align with Finance month/range; limit defaults to 20. */
export const postFinanceSyncFailedPaystack = (payload = {}) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
  return axios
    .post(`${BASE_URL}/bootcamp/finance-sync-failed-paystack`, payload, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to sync failed Paystack charges",
    }));
};

/**
 * Record EFT for a standalone Paystack subscription line (multipart FormData: userId, planCode, paidAt, amountCents optional, proofUrl optional, proof file optional).
 */
export const postFinanceRecordPaystackEft = (formData) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  return axios
    .post(`${BASE_URL}/bootcamp/finance-record-paystack-eft`, formData, { headers })
    .then((res) => res.data)
    .catch((err) => ({
      success: false,
      message: err?.response?.data?.message || "Failed to record EFT payment",
    }));
};