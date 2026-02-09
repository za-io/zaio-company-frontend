import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/student-analytics";
const BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Get detailed items (lectures, MCQs, challenges) for a course
export const getCourseItemDetails = (courseId, userId, type) =>
  axios
    .get(API_URL + `/course-items/${courseId}/${userId}?type=${type}`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, items: [] };
    });

// Search for students by email
export const searchStudents = (email) =>
  axios
    .get(API_URL + `/search-student?email=${encodeURIComponent(email)}`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, users: [] };
    });

// Get full student profile with bootcamp enrollments
export const getStudentProfile = (userId) =>
  axios
    .get(API_URL + `/student-profile/${userId}`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false };
    });

// Get billing for a student (Paystack + Financing/Manati)
export const getStudentBilling = (userId) =>
  axios
    .get(API_URL + `/student-profile/${userId}/billing`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, plans: [], outstandingLinks: [] };
    });

// Generate one-time Paystack payment link for failed or expired payment
export const generatePaymentLink = (userId, { planCode, amount, currency, subscriptionCode }) =>
  axios
    .post(API_URL + `/student-profile/${userId}/generate-payment-link`, {
      plan_code: planCode,
      ...(amount != null ? { amount } : {}),
      ...(currency ? { currency } : {}),
      ...(subscriptionCode ? { subscription_code: subscriptionCode } : {}),
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Failed to generate link" };
    });

// Get full Manati statement for a student (for company app – when clicking a Manati plan)
export const getStudentManatiStatement = (userId, agreementCode) =>
  axios
    .get(API_URL + `/student-profile/${userId}/manati-statement`, {
      params: { agreement_code: agreementCode },
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: null };
    });

// Refresh Manati statement for a student (scrapes Manati, saves to DB; updates for both student and admin)
export const refreshStudentManatiStatement = (userId, agreementCode) =>
  axios
    .post(API_URL + `/student-profile/${userId}/manati-refresh`, { agreement_code: agreementCode })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Refresh failed" };
    });

// Attach Manati agreement code to a student (add/update StudentPlan – for old students)
// doneBy = name of person performing (for history)
export const addStudentManatiPlan = (userId, agreementCode, doneBy) =>
  axios
    .post(API_URL + `/student-profile/${userId}/add-manati-plan`, {
      agreement_code: agreementCode,
      ...(doneBy ? { done_by: doneBy } : {}),
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Failed to attach plan" };
    });

// EFT proof-of-payment: list submissions for a student
export const getStudentEftSubmissions = (userId) =>
  axios
    .get(API_URL + `/student-profile/${userId}/eft-submissions`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: [] };
    });

// Get signed URL to view EFT proof document
export const getEftSubmissionProofUrl = (userId, submissionId) =>
  axios
    .get(API_URL + `/student-profile/${userId}/eft-submissions/${submissionId}/proof-url`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: null };
    });

// Approve EFT submission (creates BillingRecord)
export const approveEftSubmission = (userId, submissionId) =>
  axios
    .post(API_URL + `/student-profile/${userId}/eft-submissions/${submissionId}/approve`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Approve failed" };
    });

// Reject EFT submission
export const rejectEftSubmission = (userId, submissionId, rejectionReason) =>
  axios
    .post(API_URL + `/student-profile/${userId}/eft-submissions/${submissionId}/reject`, {
      rejection_reason: rejectionReason || undefined,
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Reject failed" };
    });

// Admin: add EFT payment for a student (multipart: file + plan_code, payment_date, amount in Rands). Added to student billing.
export const addEftPaymentAdmin = (userId, formData) =>
  axios
    .post(API_URL + `/student-profile/${userId}/add-eft-payment`, formData)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Add EFT failed" };
    });

// 2-installment EFT plan: list plans for a student
export const getStudentInstallmentPlans = (userId) =>
  axios
    .get(API_URL + `/student-profile/${userId}/installment-plans`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: [] };
    });

// 2-installment EFT plan: create plan (amount1, amount2 in Rands; due_date1 optional, due_date2 required)
export const createStudentInstallmentPlan = (userId, payload) =>
  axios
    .post(API_URL + `/student-profile/${userId}/installment-plans`, payload)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Create plan failed" };
    });

// Custom payment plan: list plans for a student
export const getCustomPlans = (userId) =>
  axios
    .get(API_URL + `/student-profile/${userId}/custom-plans`)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, data: [] };
    });

// Custom payment plan: create (plan_name, installments: [{ amount, due_date?, type, paystack_plan_code? }])
export const createCustomPlan = (userId, payload) =>
  axios
    .post(API_URL + `/student-profile/${userId}/custom-plans`, payload)
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Create custom plan failed" };
    });

// Paystack plan lookup by plan code (for custom plans – returns name, invoice_limit = payments required)
export const getPaystackPlanInfo = (planCode) =>
  axios
    .get(API_URL + "/paystack-plan-info", { params: { plan_code: planCode } })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Lookup failed" };
    });

// Preview Paystack transactions for setup (search by email only). Returns list so user can select which to keep.
export const setupPaystackPlanPreview = (userId, planCode, payerEmail) =>
  axios
    .post(API_URL + `/student-profile/${userId}/setup-paystack-plan/preview`, {
      plan_code: (planCode || "").trim() || undefined,
      payer_email: (payerEmail || "").trim() || undefined,
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Fetch failed" };
    });

// Set up Paystack plan: plan_code (required), payer_email (optional), transactions (optional), custom_plan_id (optional – link backfilled payments to this custom plan).
export const setupPaystackPlan = (userId, planCode, payerEmail, transactions, customPlanId) =>
  axios
    .post(API_URL + `/student-profile/${userId}/setup-paystack-plan`, {
      plan_code: (planCode || "").trim() || undefined,
      payer_email: (payerEmail || "").trim() || undefined,
      ...(Array.isArray(transactions) && transactions.length > 0 ? { transactions } : {}),
      ...(customPlanId ? { custom_plan_id: customPlanId } : {}),
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Setup failed" };
    });

// Preview Paystack transactions for this learner (plan_code + optional subscription_code). Returns list to select from.
export const previewPaystackTransactions = (userId, planCode, subscriptionCode) =>
  axios
    .post(API_URL + `/student-profile/${userId}/backfill-paystack/preview`, {
      plan_code: (planCode || "").trim() || undefined,
      subscription_code: (subscriptionCode || "").trim() || undefined,
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Preview failed" };
    });

// Link Paystack to learner and backfill. If transactions array is provided, saves only those; otherwise backfills all.
export const backfillPaystackBilling = (userId, email, planCode, subscriptionCode, customerId, doneBy, transactions) =>
  axios
    .post(API_URL + `/student-profile/${userId}/backfill-paystack`, {
      email,
      plan_code: planCode,
      ...(subscriptionCode ? { subscription_code: subscriptionCode } : {}),
      ...(customerId ? { customer_id: customerId } : {}),
      ...(doneBy ? { done_by: doneBy } : {}),
      ...(Array.isArray(transactions) && transactions.length > 0 ? { transactions } : {}),
    })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { success: false, message: err?.response?.data?.message || "Backfill failed" };
    });

export const getUserBootcampAnalytics = (user_id, bootcamp_id) =>
  axios
    .get(API_URL + `/${user_id}/bootcamp/${bootcamp_id}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getUserBootcampAnalyticsForTutor = async (
  tutorid,
  bootcamp_id
) => {
  try {
    const response = await axios.get(
      API_URL + `/${tutorid}/tutor-bootcamp/${bootcamp_id}`
    );
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const getTutorKPIUserModuleStats = async (tutorid, bootcamp_id) => {
  try {
    const response = await axios.get(
      API_URL + `/${tutorid}/tutor-kpi-bootcamp-course-summary/${bootcamp_id}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const getTutorKPIUserModuleSummaryStats = async (
  tutorid,
  bootcamp_id,
  learningpathid,
  courseid,
  tutorRefreshId
) => {
  try {
    const response = await axios.get(
      API_URL +
        `/${tutorid}/${bootcamp_id}/tutor-kpi-students-bootcamp-course-summary/${learningpathid}/${courseid}/${tutorRefreshId}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
  }
};

export const getUserBootcampAnalyticsCourseWise = async (
  bootcamp_id,
  userid
) => {
  try {
    const response = await axios.get(
      API_URL + `/${bootcamp_id}/tutor-bootcamp-course-summary/${userid}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const setBootcampFinalProjectMark = async (
  bootcamp_id,
  userid,
  finalprojectmark
) => {
  try {
    const response = await axios.post(
      API_URL + `/${bootcamp_id}/tutor-bootcamp-final-project-mark/${userid}`,
      { finalprojectmark }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const markCourseCompleted = async (bootcampid, userid, courseid) => {
  try {
    const response = await axios.get(
      API_URL +
        `/${bootcampid}/${courseid}/tutor-bootcamp-mark-course-completed/${userid}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const markBootcampCompleted = async (bootcampid, userid) => {
  try {
    const response = await axios.get(
      API_URL + `/${bootcampid}/tutor-bootcamp-mark-completed/${userid}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getBootcampAssignment = async (userid, courseid) => {
  try {
    const response = await axios.get(
      API_URL + `/${courseid}/fetch-bootcamp-classroom-assignment/${userid}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const addClassroomAssignmentBootcamp = async (
  newAssignment,
  userid,
  courseid
) => {
  try {
    console.log({ newAssignment, userid, courseid });
    const response = await axios.post(
      API_URL + `/${courseid}/tutor-bootcamp-classroom-assignment/${userid}`,
      newAssignment
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const getLearningPathUserProfile = async (id, email) => {
  // console.log(id)
  return axios
    .get(BASE_URL + "/learningpath/UserProfile/" + id + "/" + email)
    .then((res) => {
      // console.log('then',res);
      return res.data;
    })
    .catch((rej) => {
      // console.log('catch',rej.response)
      return rej.response;
    });
};

export const getLearningpathEnrolledUser = (learningpath_id) =>
  axios
    .get(API_URL + `/learningpathsenrolledusers/${learningpath_id}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getCourseEnrolledUser = (courseid) =>
  axios
    .get(API_URL + `/courseenrolledusers/${courseid}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getUserLearningpathAnalytics = (user_id, learningpath_id) =>
  axios
    .get(API_URL + `/${user_id}/learningpath/${learningpath_id}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getUserCourseAnalytics = (user_id, course_id) =>
  axios
    .get(API_URL + `/${user_id}/course/${course_id}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllBootcamps = () =>
  axios
    .get(API_URL + `/bootcamps`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllLearningpaths = () =>
  axios
    .get(API_URL + `/learningpaths`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllCourses = () =>
  axios
    .get(API_URL + `/courses`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const blockUser = (data) =>
  axios
    .post(BASE_URL + `/company/block-user`, data)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const unblockUser = (data) =>
  axios
    .post(BASE_URL + `/company/unblock-user`, data)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const addProgram = (payload) =>
  axios
    .post(`${API_URL}/add`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const checkAuthToken = (payload) =>
  axios
    .post(`${BASE_URL}/company/checkAuthToken`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const updateTutor = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/update-tutor`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const unEnrollStudent = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/unenroll-student`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const revokeLPAndBootcampAccess = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/revoke-access`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const undoRevokeLPAndBootcampAccess = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/undo-revoke-access`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const fetchStudentGoals = (payload) =>
  axios
    .get(
      `${BASE_URL}/defer-student/all-goals/${payload?.userid}/${payload.bootcampid}`
    )
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const addStudentGoals = (payload) =>
  axios
    .post(`${BASE_URL}/defer-student/add-goal`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const deleteStudentGoal = (payload) =>
  axios
    .post(`${BASE_URL}/defer-student/delete-goal`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const saveTutorProgress = (payload) =>
  axios
    .post(`${API_URL}/save-tutor-progress/`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getTutorRefreshStats = (tutorId, bootcampId, courseId) =>
  axios
    .get(`${API_URL}/view-tutor-history/${tutorId}/${bootcampId}/${courseId}`)
    .then((res) => res.data)
    .catch((err) => {
      console.error("Error fetching tutor refresh stats:", err);
      return { success: false };
    });
