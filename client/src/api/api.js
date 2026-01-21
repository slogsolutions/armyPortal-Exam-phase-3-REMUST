import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("adminToken");
  const candidateToken = localStorage.getItem("candidateToken");

  const urlPath = config.url || "";
  let token = null;

  if (urlPath.startsWith("/admin")) {
    token = adminToken || candidateToken;
  } else if (
    urlPath.startsWith("/candidate") ||
    urlPath.startsWith("/briefing") ||
    urlPath.startsWith("/exam") ||
    urlPath.startsWith("/result")
  ) {
    token = candidateToken || adminToken;
  } else {
    token = adminToken || candidateToken;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    // Let browser set multipart boundary automatically
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

export default api;
