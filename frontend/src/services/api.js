import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

// Attach token to every request automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("safetrail_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const registerUser = (data) => API.post("/api/auth/register", data);
export const loginUser    = (data) => API.post("/api/auth/login", data);
export const adminLoginUser = (data) => API.post("/api/auth/admin-login", data);
export const forgotPassword = (data) => API.post("/api/auth/forgot-password", data);
export const getProfile   = ()     => API.get("/api/auth/profile");
export const saveLocation = (data) => API.post("/api/user/location", data);
export const updatePrimaryContact = (data) => API.put("/api/user/emergency-contact/primary", data);
export default API;