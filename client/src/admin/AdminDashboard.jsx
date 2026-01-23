import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from "react-router-dom";
import Masters from "./Masters";
import TradeConfig from "./TradeConfig";
import UploadPaper from "./UploadPaper";
import ExamSlots from "./ExamSlots";
import PracticalMarks from "./PracticalMarks";
import Results from "./Results";
import CandidateManager from "./CandidateManager";
import CandidateProfile from "./CandidateProfile";
import DeleteData from "./DeleteData";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("masters");
  const navigate = useNavigate();
  const location = useLocation();

  // Sync active tab with current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/admin/masters")) setActiveTab("masters");
    else if (path.includes("/admin/trade-config")) setActiveTab("trade-config");
    else if (path.includes("/admin/upload-paper")) setActiveTab("upload-paper");
    else if (path.includes("/admin/exam-slots")) setActiveTab("exam-slots");
    else if (path.includes("/admin/practical-marks")) setActiveTab("practical-marks");
    else if (path.includes("/admin/results")) setActiveTab("results");
    else if (path.includes("/admin/candidates") || path.includes("/admin/candidate-profile")) setActiveTab("candidates");
    else if (path === "/admin" || path === "/admin/") setActiveTab("masters");
  }, [location]);

  useEffect(() => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      navigate("/admin/masters", { replace: true });
    }
  }, [location.pathname, navigate]);

  const menuItems = [
    // {
    //   id: "masters",
    //   label: "Master Data",
    //   icon: "⚪",
    //   path: "/admin/masters"
    // },
    {
      id: "upload-paper",
      label: "Upload Papers",
      icon: "⚪",
      path: "/admin/upload-paper"
    },
    {
      id: "exam-slots",
      label: "Exam Slots",
      icon: "⚪",
      path: "/admin/exam-slots"
    },
    {
      id: "practical-marks",
      label: "Practical Marks",
      icon: "⚪",
      path: "/admin/practical-marks"
    },
    {
      id: "candidates",
      label: "Candidates",
      icon: "⚪",
      path: "/admin/candidates"
    },
    {
      id: "results",
      label: "Results",
      icon: "⚪",
      path: "/admin/results"
    },
    {
      id: "delete-data",
      label: "Delete Data",
      icon: "⚪",
      path: "/admin/delete-data"
    }
  ];

  const handleTabClick = (item) => {
    setActiveTab(item.id);
    if (item.path) {
      navigate(item.path, { replace: false });
    }
  };

  const handleSubItemClick = (subItem) => {
    navigate(subItem.path);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");
    localStorage.removeItem("adminId");
    navigate("/admin/login");
  };

  return (
    <div className="admin-dashboard">
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <h2>ADMIN PANEL</h2>
            <h3>2 Signal Training Centre</h3>
          </div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {sidebarOpen ? "" : ""}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.id} className="nav-item">
              <div
                className={`nav-header ${activeTab === item.id ? "active" : ""}`}
                onClick={() => handleTabClick(item)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.subItems && (
                  <span className="nav-arrow">
                    {activeTab === item.id ? "" : ""}
                  </span>
                )}
              </div>

              {/* Sub Items */}
              {item.subItems && activeTab === item.id && (
                <div className="sub-nav">
                  {item.subItems.map((subItem) => (
                    <div
                      key={subItem.id}
                      className="sub-nav-item"
                      onClick={() => handleSubItemClick(subItem)}
                    >
                      {subItem.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <div className={`main-content ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <header className="content-header">
          <div className="breadcrumbs">
            <span>Admin</span>
            <span>/</span>
            <span>{menuItems.find((item) => item.id === activeTab)?.label || "Dashboard"}</span>
          </div>
          <button className="mobile-sidebar-toggle" onClick={toggleSidebar}>
            {sidebarOpen ? "Close" : "Menu"}
          </button>
        </header>

        <div className="content-area">
          <Routes>
            <Route index element={<Navigate to="masters" replace />} />
            <Route path="masters" element={<Masters />} />
            <Route path="trade-config" element={<TradeConfig />} />
            <Route path="upload-paper" element={<UploadPaper />} />
            <Route path="exam-slots" element={<ExamSlots />} />
            <Route path="practical-marks" element={<PracticalMarks />} />
            <Route path="candidates" element={<CandidateManager />} />
            <Route path="candidate-profile/:candidateId" element={<CandidateProfile />} />
            <Route path="results" element={<Results />} />
            <Route path="delete-data" element={<DeleteData />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
