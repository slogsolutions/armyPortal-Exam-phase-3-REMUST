import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import armyBg from "../../img/army.jpg";
import "./Instructions.css";

export default function Instructions() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [slotInfo, setSlotInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [withinWindow, setWithinWindow] = useState(false);
  const candidateId = searchParams.get("candidateId");
  const paperType = searchParams.get("paperType");
  const slotId = searchParams.get("slotId");

  useEffect(() => {
    const storedCandidate = localStorage.getItem("candidate");
    const token = localStorage.getItem("candidateToken");

    if (!storedCandidate || !token) {
      navigate("/candidate/login", { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(storedCandidate);
      setCandidate(parsed);
      if (!paperType || paperType !== parsed.activePaperType) {
        const params = new URLSearchParams({
          candidateId: String(parsed.id),
          paperType: parsed.activePaperType || ""
        });
        if (parsed.slotAssignment?.id) {
          params.set("slotId", String(parsed.slotAssignment.id));
        }
        navigate(`/candidate/instructions?${params.toString()}`, { replace: true });
        return;
      }

      if (parsed.slotAssignment && (!slotId || slotId === String(parsed.slotAssignment.id))) {
        setSlotInfo(parsed.slotAssignment);
      } else {
        setSlotInfo(null);
      }
    } catch (error) {
      console.warn("Failed to parse candidate info", error);
      navigate("/candidate/login", { replace: true });
    }
  }, [navigate, paperType, slotId]);

  const slotStartMs = useMemo(() => (
    slotInfo?.startTime ? new Date(slotInfo.startTime).getTime() : null
  ), [slotInfo?.startTime]);

  const slotWindowEndMs = useMemo(() => (
    slotStartMs != null ? slotStartMs + 3 * 60 * 60 * 1000 : null
  ), [slotStartMs]);

  const slotStartDate = useMemo(() => (
    slotStartMs != null ? new Date(slotStartMs) : null
  ), [slotStartMs]);

  const slotWindowEndDate = useMemo(() => (
    slotWindowEndMs != null ? new Date(slotWindowEndMs) : null
  ), [slotWindowEndMs]);

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      setCurrentTime(now);

      if (slotStartMs != null && slotWindowEndMs != null) {
        const nowMs = now.getTime();
        setWithinWindow(nowMs >= slotStartMs && nowMs <= slotWindowEndMs);
      } else {
        setWithinWindow(false);
      }
    };

    updateTimes();
    const timer = setInterval(updateTimes, 1000);
    return () => clearInterval(timer);
  }, [slotStartMs, slotWindowEndMs]);

  const start = async () => {
    if (!agreed) {
      alert("Please confirm the details are correct before starting the exam.");
      return;
    }

    if (!withinWindow) {
      alert("Your scheduled exam window is not active right now. Please wait for your shift to begin.");
      return;
    }

    try {
      // Request fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }

      // Navigate to exam with parameters
      const params = new URLSearchParams({
        candidateId: String(candidateId),
        paperType: String(paperType)
      });
      if (slotId) {
        params.set("slotId", String(slotId));
      }

      navigate(`/candidate/exam?${params.toString()}`);
    } catch (error) {
      console.error("Fullscreen error:", error);
      alert("Please allow fullscreen to continue with the exam");
    }
  };

  const profileInitial = (candidate?.name || "C").charAt(0).toUpperCase();
  const tradeName = candidate?.trade?.name || candidate?.trade || "-";
  const commandName = candidate?.command?.name || candidate?.command || "-";
  const centerName = slotInfo?.center || candidate?.center?.name || commandName;
  const currentTimeLabel = useMemo(() => currentTime.toLocaleString(), [currentTime]);
  const shiftDateLabel = slotStartDate ? slotStartDate.toLocaleDateString() : "-";
  const shiftStartLabel = slotStartDate ? slotStartDate.toLocaleTimeString() : "-";
  const shiftEndLabel = slotWindowEndDate ? slotWindowEndDate.toLocaleTimeString() : "-";
  const startButtonDisabled = !agreed || !withinWindow || !candidate;
  const startButtonClasses = ["start-btn"];
  if (!withinWindow) {
    startButtonClasses.push("locked");
  } else if (!agreed) {
    startButtonClasses.push("disabled");
  }

  return (
    <div
      className="candidate-dashboard-page"
      style={{ backgroundImage: `url(${armyBg})` }}
    >
      <div className="dashboard-overlay">
        <header className="dashboard-header">
          <div className="welcome">
            <span className="welcome-title">Candidate Dashboard</span>
            <span>Welcome, {candidate?.name || "Candidate"}</span>
          </div>
          <div className="profile">
            <div className="profile-avatar">{profileInitial}</div>
            <div className="profile-details">
              <p><strong>Name:</strong> <span>{candidate?.name || "-"}</span></p>
              <p><strong>Army No:</strong> <span>{candidate?.armyNo || "-"}</span></p>
              <p><strong>Trade:</strong> <span>{tradeName}</span></p>
              <p><strong>Command:</strong> <span>{commandName}</span></p>
              <p><strong>Exam Centre:</strong> <span>{centerName || "-"}</span></p>
            </div>
          </div>
        </header>

        <section className="motivation-section">
          <h3>All the Best !!</h3>
          <p className="motivation-text">
            "Success is the sum of small efforts, repeated day in and day out. Give your best and make yourself proud!"
          </p>
        </section>

        <section className="dashboard-section">
          <div className="card">
            <h2>Scheduled Exams</h2>
            <div className="exam-card">
              <div className="exam-detail">
                <span className="label">Army Number:</span>
                <span className="value">{candidate?.armyNo || "-"}</span>
              </div>
              <div className="exam-detail">
                <span className="label">Name:</span>
                <span className="value">{candidate?.name || "-"}</span>
              </div>
              <div className="exam-detail">
                <span className="label">Trade:</span>
                <span className="value">{tradeName}</span>
              </div>
              <div className="exam-detail">
                <span className="label">Command:</span>
                <span className="value">{commandName}</span>
              </div>
              <div className="exam-detail">
                <span className="label">Center:</span>
                <span className="value">{centerName || "-"}</span>
              </div>
              <div className="exam-detail">
                <span className="label">Paper:</span>
                <span className="value">{paperType || candidate?.activePaperType || "-"}</span>
              </div>
              <div className="exam-detail">
                <span className="label">Shift:</span>
                <span className="value">
                  {slotStartDate ? `${shiftDateLabel} ${shiftStartLabel}` : "No shift assigned"}
                </span>
              </div>

              <div className="exam-action">
                <div className="confirm-wrapper">
                  <input
                    id="confirm-details"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <label htmlFor="confirm-details">I confirm the details are correct.</label>
                </div>
                <button
                  className={startButtonClasses.join(" ")}
                  disabled={startButtonDisabled}
                  onClick={start}
                >
                  {withinWindow ? "Start Exam" : "Exam Locked (Outside Shift Window)"}
                </button>
              </div>

              {slotInfo ? (
                <div className={`status-info ${withinWindow ? "success" : "warning"}`}>
                  <p><strong>Shift Details:</strong></p>
                  <p>Date: {shiftDateLabel}</p>
                  <p>Start Time: {shiftStartLabel}</p>
                  <p>End Time (3 hrs window): {shiftEndLabel}</p>
                  <p>Current time: {currentTimeLabel}</p>
                  {withinWindow ? (
                    <p className="status-note positive">✓ You can start the exam now (within 3-hour window).</p>
                  ) : (
                    <p className="status-note negative">⚠ You are outside the 3-hour window. Exam access is locked.</p>
                  )}
                </div>
              ) : (
                <div className="status-info warning">
                  <p>No shift assigned yet. Please contact the exam cell for scheduling.</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2>Instructions</h2>
            <div className="exam-card">
              <ol className="instructions-list">
                <li>There are total 05 parts in the Question paper – Part A, Part B, Part C, Part D and Part E.</li>
                <li>Part A/B MCQ</li>
                <li>Part C Short Answer Questions</li>
                <li>Part D – Fill in the blanks/Short answer</li>
                <li>Part E – Long Answer</li>
                <li>Part F – True/False</li>
                <li>All questions are compulsory. You have to attempt all questions.</li>
                <li>Max marks for each question is shown.</li>
                <li>Do not press any function keys (F1 to F12) or ESC during the exam.</li>
                <li>Do not press Refresh/Reload button during the exam.</li>
                <li>Do not press Back button during the exam.</li>
                <li>The total time for the exam is displayed on top. Stick to the timeline for the exam.</li>
                <li>You can mark the question to revisit at the end.</li>
                <li>Finish your exam on time.</li>
              </ol>
            </div>
          </div>
        </section>
      </div>

      <div className="footer-container">
        <div className="footer-note developed">
          Developed by SLOG Solutions Pvt Ltd and 2STC
        </div>
        <div className="footer-note reserved">
          All Rights Reserved @ SLOG Solutions Pvt Ltd
        </div>
      </div>
    </div>
  );
}
