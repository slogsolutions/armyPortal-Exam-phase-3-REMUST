import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("adminToken");
  const candidateToken = localStorage.getItem("candidateToken");

  const urlPath = config.url || "";
  const currentPath = window?.location?.pathname || "";
  const inAdminShell = currentPath.startsWith("/admin");
  let token = null;

  const ensureAdmin =
    urlPath.startsWith("/admin") ||
    urlPath.startsWith("/exam-slot") ||
    (inAdminShell &&
      (urlPath.startsWith("/candidate") ||
        urlPath.startsWith("/practical") ||
        urlPath.startsWith("/result") ||
        urlPath.startsWith("/exam")));

  if (ensureAdmin) {
    token = adminToken;
  } else if (
    urlPath.startsWith("/candidate") ||
    urlPath.startsWith("/briefing") ||
    urlPath.startsWith("/exam") ||
    urlPath.startsWith("/result")
  ) {
    token = candidateToken;
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
