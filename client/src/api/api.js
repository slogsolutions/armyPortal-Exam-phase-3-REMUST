import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

const normalizePath = (path = "") => (path.startsWith("/") ? path : `/${path}`);

const isAdminRequest = (urlPath = "", currentPath = "") => {
  const normalizedUrl = normalizePath(urlPath);
  const inAdminShell = currentPath.startsWith("/admin");
  return (
    normalizedUrl.startsWith("/admin") ||
    normalizedUrl.startsWith("/exam-slot") ||
    (inAdminShell &&
      (normalizedUrl.startsWith("/candidate") ||
        normalizedUrl.startsWith("/practical") ||
        normalizedUrl.startsWith("/result") ||
        normalizedUrl.startsWith("/exam")))
  );
};

const isCandidateRequest = (urlPath = "") => {
  const normalizedUrl = normalizePath(urlPath);
  return (
    normalizedUrl.startsWith("/candidate") ||
    normalizedUrl.startsWith("/briefing") ||
    normalizedUrl.startsWith("/exam") ||
    normalizedUrl.startsWith("/result")
  );
};

let adminSessionNotified = false;

const handleAdminSessionExpiry = () => {
  if (adminSessionNotified) return;
  adminSessionNotified = true;
  alert("Admin session expired. Please login again.");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("admin");
  localStorage.removeItem("adminId");
  if (!window.location.pathname.startsWith("/admin/login")) {
    window.location.replace("/admin/login");
  }
};

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("adminToken");
  const candidateToken = localStorage.getItem("candidateToken");

  const urlPath = config.url || "";
  const currentPath = window?.location?.pathname || "";
  let token = null;

  if (isAdminRequest(urlPath, currentPath)) {
    token = adminToken;
  } else if (isCandidateRequest(urlPath)) {
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const urlPath = error.config?.url || "";
    const currentPath = window?.location?.pathname || "";

    if ((status === 401 || status === 403) && isAdminRequest(urlPath, currentPath)) {
      handleAdminSessionExpiry();
    }

    return Promise.reject(error);
  }
);

export default api;
