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

export const getAllLPs = (qctoOnly = false) =>
  axios
    .get(API_URL + `/all/learningpaths`, qctoOnly ? { params: { qctoOnly: "true" } } : {})
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getAllTutors = () =>
  axios
    .get(BASE_URL + `/company/all-tutors`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

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

export const deferStudent = (payload) =>
  axios
    .post(`${BASE_URL}/bootcamp/defer-student`, payload)
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

export const getOCCohortDetails = (cohortId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getCohortStudents = (cohortId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/${cohortId}/students`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

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

export const getOCStudentDetails = (studentId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/student/${studentId}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const getOCModuleDetails = (studentId, moduleId) =>
  axios
    .get(`${BASE_URL}/oc-cohort/student/${studentId}/module/${moduleId}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

export const assignTutorToStudent = (enrollmentId, tutorId) =>
  axios
    .post(`${BASE_URL}/oc-cohort/enrollment/${enrollmentId}/assign-tutor`, {
      tutorId,
    })
    .then((res) => res.data)
    .catch((err) => console.log(err));

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

// Student enrolled bootcamps (paginated, default 4 per page)
export const getEnrolledBootcamps = ({ page = 1, limit = 4 } = {}) => {
  const token = localStorage.getItem("TOKEN");
  const headers = token ? { "auth-token": token } : {};
  const params = { page, limit };

  return axios
    .get(`${BASE_URL}/bootcamp/enrolled`, { headers, params })
    .then((res) => res.data)
    .catch((err) => {
      console.log(err);
      return { enrolledBootcamps: [], total: 0, page: 1, limit: 4, totalPages: 0 };
    });
};

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