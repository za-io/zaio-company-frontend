import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/bootcamp",
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

export const getAllBootcamps = () =>
  api
    .get("/all")
    .then((res) => res.data)
    .catch((err) => console.log(err));
