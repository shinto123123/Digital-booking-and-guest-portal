import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

api.interceptors.request.use((config) => {
  const path = window?.location?.pathname || "";
  const isStaffArea = path.startsWith("/admin") || path.startsWith("/staff");
  const token = isStaffArea
    ? localStorage.getItem("staff_access_token")
    : localStorage.getItem("customer_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
