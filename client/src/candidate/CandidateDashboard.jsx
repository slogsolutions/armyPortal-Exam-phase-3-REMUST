import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./CandidateDashboard.css";

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedCandidate = localStorage.getItem("candidate");
    const token = localStorage.getItem("candidateToken");

    if (!storedCandidate || !token) {
      navigate("/candidate/login", { replace: true });
      return;
    }

    const parsedCandidate = JSON.parse(storedCandidate);
    setCandidate(parsedCandidate);

    const fetchBriefing = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/briefing/candidate/${parsedCandidate.id}`);
        setBriefing(res.data);
      } catch (err) {
        console.error("Failed to load candidate briefing", err);
        setError(
          err.response?.data?.error ||
            "Unable to load dashboard information. Please try again or contact support."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [navigate]);

  const selectedExamTypes = useMemo(() => {
    if (!briefing?.selectedExamTypes) return [];
    return Array.isArray(briefing.selectedExamTypes)
      ? briefing.selectedExamTypes
      : briefing.selectedExamTypes.split(",").map((item) => item.trim());
  }, [briefing?.selectedExamTypes]);

  const handleLogout = () => {
    localStorage.removeItem("candidateToken");
    localStorage.removeItem("candidate");
    navigate("/candidate/login", { replace: true });
  };

  const handleInstructions = (paperType, slotId = "") => {
    if (!candidate) return;
    const params = new URLSearchParams({
      candidateId: String(candidate.id),
      paperType,
    });
    if (slotId) {
      params.set("slotId", String(slotId));
    }
    navigate(`/candidate/instructions?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="candidate-dashboard loading">
        <div className="loader" />
        <p>Preparing your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-dashboard error">
        <div className="error-card">
          <h2>Unable to load dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
          <button className="secondary" onClick={handleLogout}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!briefing || !candidate) {
    return null;
  }

  const upcomingSlots = briefing.examSlots || [];
  const availablePapers = briefing.availablePapers || [];
  const examStatus = briefing.examStatus || [];

  return (
    <div className="candidate-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {briefing.candidate?.name || candidate.name}</h1>
          <p className="subtitle">Army No: {briefing.candidate?.armyNo}</p>
          <div className="candidate-meta">
            <span>{briefing.candidate?.rank}</span>
            <span>{briefing.candidate?.trade}</span>
            <span>{briefing.candidate?.command}</span>
            {briefing.candidate?.center && <span>{briefing.candidate.center}</span>}
          </div>
        </div>
        <button className="logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className="dashboard-grid">
        <article className="card highlight">
          <h2>Exam Summary</h2>
          <div className="summary-grid">
            <div className="summary-pill">
              <span className="label">Selected Papers</span>
              <span className="value">{selectedExamTypes.length}</span>
            </div>
            <div className="summary-pill">
              <span className="label">Upcoming Slots</span>
              <span className="value">{upcomingSlots.length}</span>
            </div>
            <div className="summary-pill">
              <span className="label">Attempts</span>
              <span className="value">{examStatus.length}</span>
            </div>
          </div>
          {selectedExamTypes.length > 0 && (
            <div className="selected-papers">
              <span>Registered Papers:</span>
              <div className="chips">
                {selectedExamTypes.map((type) => (
                  <span key={type} className="chip">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <h2>Upcoming Exam Slots</h2>
            <span className="count">{upcomingSlots.length}</span>
          </div>
          {upcomingSlots.length === 0 ? (
            <p className="empty-state">
              No upcoming slots assigned yet. Please contact the exam officer.
            </p>
          ) : (
            <div className="slot-list">
              {upcomingSlots.map((slot) => {
                const canStart = slot.canStart;
                const slotStart = new Date(slot.startTime);
                const slotEnd = new Date(slot.endTime);
                return (
                  <div key={slot.id} className={`slot-card ${canStart ? "active" : ""}`}>
                    <div className="slot-info">
                      <h3>{slot.paperType}</h3>
                      <p>{slot.location || "Exam Centre"}</p>
                      <p className="time-range">
                        {slotStart.toLocaleString()} &ndash; {slotEnd.toLocaleString()}
                      </p>
                      {slot.instructions && (
                        <p className="instructions">{slot.instructions}</p>
                      )}
                    </div>
                    <div className="slot-actions">
                      <button
                        disabled={!canStart}
                        onClick={() => handleInstructions(slot.paperType, slot.id)}
                      >
                        {canStart ? "Start / View Instructions" : "Awaiting Start Time"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <h2>Available Papers</h2>
            <span className="count">{availablePapers.length}</span>
          </div>
          {availablePapers.length === 0 ? (
            <p className="empty-state">No active papers found for your trade.</p>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Paper</th>
                  <th>Questions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {availablePapers.map((paper) => (
                  <tr key={paper.id}>
                    <td>{paper.paperType}</td>
                    <td>{paper.questionCount}</td>
                    <td>
                      <span className={`status ${paper.isActive ? "active" : "inactive"}`}>
                        {paper.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <article className="card">
          <div className="card-header">
            <h2>Exam Progress</h2>
          </div>
          {examStatus.length === 0 ? (
            <p className="empty-state">No exam attempts recorded yet.</p>
          ) : (
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Paper</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {examStatus.map((attempt, index) => (
                  <tr key={`${attempt.paperType}-${index}`}>
                    <td>{attempt.paperType}</td>
                    <td>
                      <span className={`status ${attempt.status.toLowerCase()}`}>
                        {attempt.status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{attempt.score ?? "-"}</td>
                    <td>
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>
    </div>
  );
}
