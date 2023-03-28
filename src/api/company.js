import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/company",
});

export const registerCompany = (payload) =>
  api
    .post(`/register`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));
export const loginCompany = (payload) =>
  api
    .post(`/login`, payload)
    .then((res) => res.data)
    .catch((err) => console.log(err));
