import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/student-analytics";
const BASE_URL = process.env.REACT_APP_BACKEND_URL;

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

export const getTutorKPIUserModuleStats = async (
  tutorid,
  bootcamp_id
) => {
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
  courseid
) => {
  try {
    const response = await axios.get(
      API_URL + `/${tutorid}/${bootcamp_id}/tutor-kpi-students-bootcamp-course-summary/${learningpathid}/${courseid}`
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
    return []
  }
};

export const setBootcampFinalProjectMark = async (
  bootcamp_id,
  userid,
  finalprojectmark
) => {
  try {
    const response = await axios.post(
      API_URL + `/${bootcamp_id}/tutor-bootcamp-final-project-mark/${userid}`, {finalprojectmark}
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return []
  }
};

export const markCourseCompleted = async (
  bootcampid,
  userid,
  courseid
) => {
  try {
    const response = await axios.get(
      API_URL + `/${bootcampid}/${courseid}/tutor-bootcamp-mark-course-completed/${userid}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return []
  }
};

export const getBootcampAssignment = async (
  userid,
  courseid
) => {
  try {
    const response = await axios.get(
      API_URL + `/${courseid}/fetch-bootcamp-classroom-assignment/${userid}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return []
  }
};

export const addClassroomAssignmentBootcamp = async (
  newAssignment,
  userid,
  courseid
) => {
  try {
    console.log({newAssignment,userid, courseid})
    const response = await axios.post(
      API_URL + `/${courseid}/tutor-bootcamp-classroom-assignment/${userid}`,
      newAssignment
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return []
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
