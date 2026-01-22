import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import "./Exam.css";

export default function Exam() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const candidateId = searchParams.get("candidateId");
  const paperType = searchParams.get("paperType");
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [examFinished, setExamFinished] = useState(false);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [startPayload, setStartPayload] = useState(null);
  const [preparingExam, setPreparingExam] = useState(false);
  const [startError, setStartError] = useState(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Load exam paper
  useEffect(() => {
    const loadPaper = async () => {
      try {
        // First, get candidate to get tradeId
        const candidateRes = await api.get(`/candidate/${candidateId}`);
        const candidate = candidateRes.data;
        
        // Get paper for this trade and paper type
        const paperRes = await api.get(`/exam/paper/${candidate.tradeId}/${paperType}`);
        
        if (paperRes.data.status === "NA") {
          alert("Paper not available yet");
          navigate("/");
          return;
        }

        setPaper(paperRes.data);
        setTimeRemaining(3 * 60 * 60); // 3 hours default

        const payload = {
          candidateId: Number(candidateId),
          paperType,
          examPaperId: paperRes.data.id
        };

        const slotId = searchParams.get("slotId");
        if (slotId) {
          payload.examSlotId = Number(slotId);
        }

        setStartPayload(payload);
        setStartError(null);
      } catch (error) {
        console.error("Error loading paper:", error);
        const message = error.response?.data?.error || "Failed to load exam paper";
        alert(message);
        navigate("/candidate/dashboard", { replace: true });
      }
    };

    if (candidateId && paperType) {
      loadPaper();
    }
  }, [candidateId, paperType, navigate]);

  // Timer countdown
  useEffect(() => {
    if (examStarted && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [examStarted, timeRemaining]);

  // Security: Block keyboard shortcuts
  useEffect(() => {
    if (!examStarted) {
      return () => {};
    }

    const handleKeyDown = (e) => {
      // Block F1-F12
      if (e.key.startsWith("F") && e.key.length <= 3) {
        e.preventDefault();
        return false;
      }

      // Block Alt+Tab, Ctrl+Tab, Cmd+Tab
      if ((e.altKey || e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault();
        if (!examFinished) {
          handleTerminateExam();
        }
        return false;
      }

      // Block Ctrl+Shift+I (Dev Tools)
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === "J") {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+C (Inspect)
      if (e.ctrlKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        return false;
      }

      // Block F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your progress will be lost.";
      return e.returnValue;
    };

    const handleFocusWarning = () => {
      if (examFinished) return;

      const isFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      setFullscreenActive(isFullscreen);

      if (document.hidden) {
        handleTerminateExam();
        return;
      }

      if (!isFullscreen) {
        if (!examFinished && !showFocusModal) {
          setShowFocusModal(true);
        }
        return;
      }

      if (!document.hasFocus()) {
        if (!showFocusModal) {
          setShowFocusModal(true);
        }
      }
    };

    const registerListeners = () => {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("contextmenu", handleContextMenu);
      window.addEventListener("beforeunload", handleBeforeUnload);
      document.addEventListener("visibilitychange", handleFocusWarning);
      window.addEventListener("blur", handleFocusWarning);
      document.addEventListener("fullscreenchange", handleFocusWarning);
      document.addEventListener("webkitfullscreenchange", handleFocusWarning);
      document.addEventListener("mozfullscreenchange", handleFocusWarning);
      document.addEventListener("MSFullscreenChange", handleFocusWarning);
    };

    const unregisterListeners = () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleFocusWarning);
      window.removeEventListener("blur", handleFocusWarning);
      document.removeEventListener("fullscreenchange", handleFocusWarning);
      document.removeEventListener("webkitfullscreenchange", handleFocusWarning);
      document.removeEventListener("mozfullscreenchange", handleFocusWarning);
      document.removeEventListener("MSFullscreenChange", handleFocusWarning);
    };

    registerListeners();

    // Check fullscreen
    return () => {
      unregisterListeners();
    };
  }, [examStarted, examFinished, showFocusModal]);

  // Format time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Handle answer selection
  const handleAnswerChange = (questionId, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const submitExam = async ({ skipConfirm = false } = {}) => {
    if (examFinished) return false;

    if (!skipConfirm) {
      const confirmed = window.confirm(
        "Are you sure you want to submit the exam? You cannot change your answers after submission."
      );
      if (!confirmed) {
        return false;
      }
    }

    if (!attemptId) {
      alert("Exam not started");
      return false;
    }

    const answerArray = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
      questionId: Number(questionId),
      selectedAnswer
    }));

    try {
      await api.post("/exam/submit", {
        attemptId,
        answers: answerArray
      });

      setExamFinished(true);
      setShowFocusModal(false);
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen?.();
        } catch (err) {
          console.warn("Unable to exit fullscreen", err);
        }
      }
      navigate(`/candidate/result?candidateId=${candidateId}`);
      return true;
    } catch (error) {
      console.error("Submit error:", error);
      alert("Error submitting exam");
      return false;
    }
  };

  // Handle auto-submit
  const handleAutoSubmit = async () => {
    if (!attemptId) return;
    await submitExam({ skipConfirm: true });
  };

  // Handle manual submit
  const handleSubmit = async () => {
    await submitExam();
  };

  const handleResumeExam = async () => {
    setShowFocusModal(false);
    if (!fullscreenActive) {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch (err) {
        console.warn("Unable to re-enter fullscreen", err);
      }
    }
  };

  const handleTerminateExam = async () => {
    await submitExam({ skipConfirm: true });
  };

  const handleBeginExam = async () => {
    if (!startPayload || preparingExam) return;
    setPreparingExam(true);
    setStartError(null);
    try {
      const attemptRes = await api.post("/exam/start", startPayload);
      setAttemptId(attemptRes.data.id);
      startTimeRef.current = new Date();

      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen?.();
        } catch (err) {
          console.warn("Unable to enter fullscreen on start", err);
        }
      }

      setExamStarted(true);
      setFullscreenActive(Boolean(document.fullscreenElement));
    } catch (error) {
      console.error("Start exam error:", error);
      const message = error.response?.data?.error || "Unable to start exam";
      setStartError(message);
    } finally {
      setPreparingExam(false);
    }
  };

  if (!paper) {
    return (
      <div className="exam-loading">
        <div className="loading-spinner"></div>
        <p>Loading exam paper...</p>
      </div>
    );
  }

  if (paper && !examStarted) {
    return (
      <div className="exam-prep-screen">
        <div className="exam-prep-card">
          <h2>{paper.paperType} - {paper.trade?.name}</h2>
          <p>Click below to enter fullscreen and begin your assessment. Please ensure you are ready before proceeding.</p>
          {startError && <p className="prep-error">{startError}</p>}
          <button
            className="prep-start-btn"
            onClick={handleBeginExam}
            disabled={preparingExam || !startPayload}
          >
            {preparingExam ? "Preparing..." : "Enter Fullscreen & Begin Exam"}
          </button>
        </div>
      </div>
    );
  }

  const currentQ = paper.questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = paper.questions.length;

  const focusTitle = fullscreenActive ? "Warning: Window focus lost!" : "Fullscreen required";
  const focusMessage = fullscreenActive
    ? "Please return to the exam window. Leaving the exam may lead to termination."
    : "This assessment must stay in fullscreen. Return now or the attempt will be submitted.";

  return (
    <>
      {showFocusModal && !examFinished && (
        <div className="focus-overlay">
          <div className="focus-modal">
            <h3>{focusTitle}</h3>
            <p>{focusMessage}</p>
            <div className="focus-actions">
              <button className="resume-btn" onClick={handleResumeExam}>
                Return to Exam
              </button>
              <button className="terminate-btn" onClick={handleTerminateExam}>
                Terminate &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="exam-container">
      {/* Header with timer */}
      <div className="exam-header">
        <div className="exam-info">
          <h2>{paper.paperType} - {paper.trade.name}</h2>
          <div className={`timer ${timeRemaining <= 300 ? "timer-warning" : ""}`}>
            <span className="timer-label">Time Remaining:</span>
            <span className="timer-value">{formatTime(timeRemaining)}</span>
          </div>
        </div>
        <div className="exam-stats">
          <span>Answered: {answeredCount} / {totalQuestions}</span>
        </div>
      </div>

      <div className="exam-body">
        {/* Question Panel */}
        <div className="question-panel">
          <h3>Questions</h3>
          <div className="question-grid">
            {paper.questions.map((q, index) => {
              const isAnswered = answers[q.id];
              const isCurrent = index === currentQuestion;
              return (
                <button
                  key={q.id}
                  className={`question-btn ${isCurrent ? "current" : ""} ${isAnswered ? "answered" : ""}`}
                  onClick={() => setCurrentQuestion(index)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Area */}
        <div className="question-area">
          <div className="question-card">
            <div className="question-header">
              <h3>Question {currentQuestion + 1} of {totalQuestions}</h3>
              <span className="question-marks">Marks: {currentQ.marks}</span>
            </div>

            <div className="question-text">
              {currentQ.questionText}
            </div>

            <div className="options">
              {["A", "B", "C", "D"].map(opt => {
                const optionValue = currentQ[`option${opt}`];
                if (!optionValue) return null;

                return (
                  <label 
                    key={opt} 
                    className={`option-label ${answers[currentQ.id] === opt ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={opt}
                      checked={answers[currentQ.id] === opt}
                      onChange={() => handleAnswerChange(currentQ.id, opt)}
                    />
                    <span className="option-letter">{opt}.</span>
                    <span className="option-text">{optionValue}</span>
                  </label>
                );
              })}
            </div>

            <div className="question-navigation">
              <button
                className="nav-btn"
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
              >
                ← Previous
              </button>
              <button
                className="nav-btn"
                onClick={() => setCurrentQuestion(prev => Math.min(totalQuestions - 1, prev + 1))}
                disabled={currentQuestion === totalQuestions - 1}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="submit-section">
            <button className="submit-btn" onClick={handleSubmit}>
              SUBMIT EXAM
            </button>
            <p className="submit-warning">
              Once submitted, you cannot change your answers. Make sure you have reviewed all questions.
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
