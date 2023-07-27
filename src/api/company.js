import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL + "/bootcamp";
const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export const registerCompany = (payload) =>
  axios
    .post(`${API_URL}/register`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));
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

export const getBootcampDetails = (bootcamp_id) =>
  axios
    .get(API_URL + `/details?bootcamp_id=${bootcamp_id}`)
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
