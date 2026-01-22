import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "./Instructions.css";

export default function Instructions() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const [slotInfo, setSlotInfo] = useState(null);
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

  const slotTimeRange = useMemo(() => {
    if (!slotInfo) return null;
    const start = slotInfo.startTime ? new Date(slotInfo.startTime) : null;
    const end = slotInfo.endTime ? new Date(slotInfo.endTime) : null;
    if (!start || !end) return null;
    return `${start.toLocaleString()} - ${end.toLocaleString()}`;
  }, [slotInfo]);

  const start = async () => {
    if (!agreed) {
      alert("Please accept the instructions and terms to proceed");
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

  return (
    <div className="instructions-page">
      <div className="instructions-container">
        <div className="instructions-header">
          <h1>ARMY EXAM PORTAL</h1>
          <h2>2 Signal Training Centre Online Exam Portal</h2>
          <h3>IMPORTANT INSTRUCTIONS - PLEASE READ CAREFULLY</h3>
        </div>

        <div className="slot-summary">
          <div>
            <p className="slot-label">Candidate</p>
            <h4>{candidate?.name || "-"}</h4>
            <p className="slot-subtext">Army No: {candidate?.armyNo || "-"}</p>
          </div>
          <div>
            <p className="slot-label">Paper</p>
            <h4>{paperType}</h4>
            <p className="slot-subtext">Sequence enforced</p>
          </div>
          <div>
            <p className="slot-label">Assigned Slot</p>
            {slotInfo ? (
              <>
                <h4>{slotTimeRange || "Scheduled"}</h4>
                <p className="slot-subtext">
                  {slotInfo.center || slotInfo.command || "Exam Centre"}
                </p>
              </>
            ) : (
              <>
                <h4>Pending</h4>
                <p className="slot-subtext warning">Contact the exam cell if no slot appears.</p>
              </>
            )}
          </div>
        </div>

        <div className="instructions-content">
          <section className="instruction-section">
            <h4>⚠️ SECURITY WARNINGS</h4>
            <ul>
              <li><strong>Your screen will be LOCKED during the exam</strong></li>
              <li><strong>DO NOT close or refresh the browser window</strong></li>
              <li><strong>DO NOT switch tabs or applications</strong></li>
              <li><strong>DO NOT use Alt+Tab, Ctrl+Tab, or any keyboard shortcuts</strong></li>
              <li><strong>All keyboard function keys (F1-F12) will be disabled</strong></li>
              <li><strong>Right-click and developer tools are blocked</strong></li>
              <li><strong>Any attempt to exit fullscreen will be logged</strong></li>
            </ul>
          </section>

          <section className="instruction-section">
            <h4>📋 EXAM RULES</h4>
            <ul>
              <li>The exam will start in <strong>FULLSCREEN MODE</strong></li>
              <li>You must remain in fullscreen for the entire duration</li>
              <li>All questions are <strong>Multiple Choice (MCQ)</strong></li>
              <li>Select one option (A, B, C, or D) for each question</li>
              <li>You can navigate between questions using the question panel</li>
              <li>Review your answers before submitting</li>
              <li><strong>Negative marking applies</strong> - wrong answers will deduct marks</li>
            </ul>
          </section>

          <section className="instruction-section">
            <h4>⏱️ TIME MANAGEMENT</h4>
            <ul>
              <li>A timer will be displayed at the top of the screen</li>
              <li>The timer will turn <strong style={{color: 'red'}}>RED</strong> when 5 minutes remain</li>
              <li>The exam will <strong>auto-submit</strong> when time expires</li>
              <li>You cannot pause or extend the exam time</li>
            </ul>
          </section>

          <section className="instruction-section">
            <h4>✅ SUBMISSION</h4>
            <ul>
              <li>Click the <strong>"SUBMIT EXAM"</strong> button when you are finished</li>
              <li>Once submitted, you cannot change your answers</li>
              <li>Results will be displayed immediately after submission</li>
              <li>Make sure you have answered all questions before submitting</li>
            </ul>
          </section>

          <section className="instruction-section warning-box">
            <h4>🚫 VIOLATIONS WILL RESULT IN:</h4>
            <ul>
              <li>Immediate exam termination</li>
              <li>Disqualification from the examination</li>
              <li>Report to the examination authority</li>
            </ul>
          </section>

          <section className="agreement-section">
            <label className="agreement-checkbox">
              <input 
                type="checkbox" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have read and understood all the instructions above. I agree to abide by all the rules 
                and regulations. I understand that any violation will result in disqualification.
              </span>
            </label>
          </section>
        </div>

        <div className="instructions-footer">
          <button 
            className="ready-button" 
            onClick={start}
            disabled={!agreed}
          >
            I AM READY TO START THE EXAM
          </button>
        </div>
      </div>
    </div>
  );
}
