import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import armyBg from "../../img/army.jpg";
import profileImg from "../../img/profile.png";
import "./CandidateDashboard.css";

export default function CandidateDashboard() {
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [now, setNow] = useState(new Date());

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

  const upcomingSlot = useMemo(() => briefing?.examSlots?.[0] || null, [briefing?.examSlots]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setConfirmChecked(false);
  }, [upcomingSlot]);

  const handleLogout = () => {
    localStorage.removeItem("candidateToken");
    localStorage.removeItem("candidate");
    navigate("/candidate/login", { replace: true });
  };

  const startExam = (slotId) => {
    if (!candidate) return;
    const params = new URLSearchParams({
      candidateId: String(candidate.id),
      paperType: slotId ? String(slotId.paperType || "") : "",
    });
    if (slotId?.id) {
      params.set("slotId", String(slotId.id));
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

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const shiftStartDate = parseDate(upcomingSlot?.startTime || shift?.startTime || briefing.shift?.startTime);
  const shift = upcomingSlot?.shift || briefing.shift || null;
  const withinWindow = upcomingSlot?.canStart ?? briefing.canStartExam ?? false;
  const shiftEndDate = shiftStartDate ? new Date(shiftStartDate.getTime() + 3 * 60 * 60 * 1000) : null;

  const profileDetails = {
    name: briefing.candidate?.name || candidate.name,
    armyNo: briefing.candidate?.armyNo || candidate.armyNo,
    trade: briefing.candidate?.trade || candidate.trade,
    center: briefing.candidate?.center || candidate.center,
    shift: shift?.name || shift?.slot || briefing.shift || "None"
  };

  const instructions = [
    "There are total 05 parts in the Question paper – Part A, Part B, Part C, Part D and Part E.",
    "Part A/B MCQ",
    "Part C Short Answer Questions",
    "Part D – Fill in the blanks/Short answer",
    "Part E – Long Answer",
    "Part F – True/False",
    "All questions are compulsory. You have to attempt all questions.",
    "Max marks for each question is shown.",
    "Do not Press any function keys (F1 to F12) or esc during the exam.",
    "Do not Press Refresh/Reload button during the exam.",
    "Do not Press Back button during the exam.",
    "The total time for the exam is displayed on top. Stick to the timeline for the exam.",
    "You can mark the question to revisit at the end.",
    "Finish your exam on time."
  ];

  return (
    <div
      className="candidate-dashboard-page"
      style={{ backgroundImage: `url(${armyBg})` }}
    >
      <div className="dashboard-overlay">
        <header className="dashboard-hero">
          <div className="welcome-block">
            <h1>CANDIDATE DASHBOARD</h1>
            <span>Welcome, {profileDetails.name}</span>
          </div>
          <div className="profile-block">
            <div className="profile">
              <img src={profileImg} alt="Profile" />
              <div className="profile-details">
                <p><strong>Name:</strong> <span>{profileDetails.name}</span></p>
                <p><strong>Army No:</strong> <span>{profileDetails.armyNo}</span></p>
                <p><strong>Trade:</strong> <span>{profileDetails.trade}</span></p>
                <p><strong>Exam Center:</strong> <span>{profileDetails.center || "-"}</span></p>
                <button onClick={handleLogout}>Logout</button>
              </div>
            </div>
          </div>
        </header>

        <section className="motivation-card">
          <h3>All the Best !!</h3>
          <p>
            "Success is the sum of small efforts, repeated day in and day out. Give your best and make yourself proud!"
          </p>
        </section>

        <section className="dashboard-panels">
          <div className="panel">
            <h2>Scheduled Exams</h2>
            <div className="panel-body">
              <div className="detail-row">
                <span className="label">Army Number:</span>
                <span className="value">{profileDetails.armyNo}</span>
              </div>
              <div className="detail-row">
                <span className="label">Name:</span>
                <span className="value">{profileDetails.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Trade:</span>
                <span className="value">{profileDetails.trade}</span>
              </div>
              <div className="detail-row">
                <span className="label">Center:</span>
                <span className="value">{profileDetails.center || "-"}</span>
              </div>
              <div className="detail-row">
                <span className="label">Shift:</span>
                <span className="value">{profileDetails.shift || "None"}</span>
              </div>

              <div className="exam-action">
                <label className="confirm-checkbox">
                  <input
                    type="checkbox"
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                  />
                  <span>I confirm the details are correct.</span>
                </label>

                {withinWindow ? (
                  <button
                    className={confirmChecked ? "start-btn" : "start-btn disabled"}
                    onClick={() => confirmChecked && startExam(upcomingSlot)}
                    disabled={!confirmChecked}
                  >
                    Start Exam
                  </button>
                ) : (
                  <button className="start-btn locked" disabled>
                    Exam Locked (Outside Shift Window)
                  </button>
                )}
              </div>

              <div className="shift-info">
                {shiftStartDate ? (
                  <>
                    <p><strong>Shift Start:</strong> {shiftStartDate.toLocaleString()}</p>
                    {shiftEndDate && (
                      <p><strong>Shift End (3hr window):</strong> {shiftEndDate.toLocaleString()}</p>
                    )}
                    <p><strong>Current Time:</strong> {now.toLocaleString()}</p>
                    {withinWindow ? (
                      <p className="shift-status success">✓ You can start the exam now (within 3-hour window).</p>
                    ) : (
                      <p className="shift-status warning">⚠ You are outside the 3-hour window. Exam access is locked.</p>
                    )}
                  </>
                ) : (
                  <p className="shift-status warning">No shift assigned. You cannot start the exam until a shift is assigned.</p>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Instructions</h2>
            <div className="panel-body">
              <ol className="instructions-list">
                {instructions.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>

      <footer className="dashboard-footer">
        <div className="footer-note developed">Developed by SLOG Solutions Pvt Ltd and 2STC</div>
        <div className="footer-note reserved">All Rights Reserved @ SLOG Solutions Pvt Ltd</div>
      </footer>
    </div>
  );
}
