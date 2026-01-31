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

export const getAllLPs = () =>
  axios
    .get(API_URL + `/all/learningpaths`)
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