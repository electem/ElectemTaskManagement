import axios from "axios";

// Create axios instance
const api = axios.create({
  baseURL: "http://localhost:5000", // backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // get token
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
