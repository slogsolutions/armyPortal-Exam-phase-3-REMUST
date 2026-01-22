import { useEffect, useState } from "react";
import api from "../api/api";
import "./Dashboard.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalTrades: 0,
    totalCenters: 0,
    activeExams: 0,
    completedExams: 0,
    pendingPractical: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get candidates count
      const candidatesRes = await api.get("/admin/candidates");
      const candidates = candidatesRes.data || [];

      // Get trades count
      const mastersRes = await api.get("/admin/masters");
      const trades = mastersRes.data?.trades || [];

      // Get centers count
      const centers = mastersRes.data?.centers || [];

      // Get exam attempts
      const resultsRes = await api.get("/result/all?limit=10");
      const attempts = resultsRes.data?.attempts || [];

      // Get practical marks summary
      const practicalRes = await api.get("/practical/summary");
      const practicalSummary = practicalRes.data || [];

      setStats({
        totalCandidates: candidates.length,
        totalTrades: trades.length,
        totalCenters: centers.length,
        activeExams: attempts.filter(a => a.status === "IN_PROGRESS").length,
        completedExams: attempts.filter(a => a.status === "COMPLETED").length,
        pendingPractical: candidates.filter(c => !c.practicalMarks).length
      });

      setRecentActivity(attempts.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <h3>Loading Dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <h2>Army Exam Portal - 2 Signal Training Centre</h2>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon candidates">
            <i className="icon">👥</i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalCandidates}</h3>
            <p>Total Candidates</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon trades">
            <i className="icon">📚</i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalTrades}</h3>
            <p>Active Trades</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon centers">
            <i className="icon">🏢</i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalCenters}</h3>
            <p>Exam Centers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active-exams">
            <i className="icon">✏️</i>
          </div>
          <div className="stat-content">
            <h3>{stats.activeExams}</h3>
            <p>Active Exams</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed">
            <i className="icon">✅</i>
          </div>
          <div className="stat-content">
            <h3>{stats.completedExams}</h3>
            <p>Completed Exams</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">
            <i className="icon">⏳</i>
          </div>
          <div className="stat-content">
            <h3>{stats.pendingPractical}</h3>
            <p>Pending Practical</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <a href="/admin/register-candidate" className="action-card">
            <i className="icon">➕</i>
            <h3>Register Candidate</h3>
            <p>Add new candidate to system</p>
          </a>

          <a href="/admin/upload-paper" className="action-card">
            <i className="icon">📄</i>
            <h3>Upload Questions</h3>
            <p>Bulk upload exam questions</p>
          </a>

          <a href="/admin/exam-slots" className="action-card">
            <i className="icon">📅</i>
            <h3>Manage Exam Slots</h3>
            <p>Create and manage exam schedules</p>
          </a>

          <a href="/admin/practical-marks" className="action-card">
            <i className="icon">✍️</i>
            <h3>Practical Marks</h3>
            <p>Enter PR and ORAL marks</p>
          </a>

          <a href="/admin/results" className="action-card">
            <i className="icon">📊</i>
            <h3>View Results</h3>
            <p>Export and analyze results</p>
          </a>

          <a href="/admin/trade-config" className="action-card">
            <i className="icon">⚙️</i>
            <h3>Trade Configuration</h3>
            <p>Configure exam patterns</p>
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Recent Exam Activity</h2>
        <div className="activity-list">
          {recentActivity.length === 0 ? (
            <p className="no-activity">No recent activity found</p>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-info">
                  <span className="candidate-name">{activity.candidate?.name}</span>
                  <span className="exam-details">
                    {activity.examPaper?.paperType} - {activity.trade?.name}
                  </span>
                </div>
                <div className="activity-status">
                  <span className={`status-badge ${activity.status.toLowerCase()}`}>
                    {activity.status}
                  </span>
                  <span className="score">
                    {activity.percentage?.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
