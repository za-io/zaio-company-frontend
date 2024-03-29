import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/student-analytics";
const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export const getUserBootcampAnalytics = (user_id, bootcamp_id) =>
  axios
    .get(API_URL + `/${user_id}/bootcamp/${bootcamp_id}`)
    .then((res) => res.data)
    .catch((err) => console.log(err));

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
