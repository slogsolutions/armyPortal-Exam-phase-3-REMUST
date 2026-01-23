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
  const [flaggedQuestions, setFlaggedQuestions] = useState(() => new Set());
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
        setAnswers({});
        setFlaggedQuestions(new Set());
        setCurrentQuestion(0);
        setTimeRemaining(3 * 60 * 60); // 3 hours default

        // Start exam attempt
        const startPayload = {
          candidateId: Number(candidateId),
          paperType,
          examPaperId: paperRes.data.id
        };

        const slotId = searchParams.get("slotId");
        if (slotId) {
          startPayload.examSlotId = Number(slotId);
        }

        const attemptRes = await api.post("/exam/start", startPayload);

        setAttemptId(attemptRes.data.id);
        startTimeRef.current = new Date();
        setExamStarted(true);

        if (!document.fullscreenElement) {
          try {
            await document.documentElement.requestFullscreen?.();
          } catch (err) {
            console.warn("Unable to enter fullscreen on start", err);
          }
        }

        setFullscreenActive(Boolean(document.fullscreenElement));
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

  const toggleFlagQuestion = (questionId) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
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

  if (!paper || !examStarted) {
    return (
      <div className="exam-loading">
        <div className="loading-spinner"></div>
        <p>Loading exam paper...</p>
      </div>
    );
  }

  const currentQ = paper.questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = paper.questions.length;
  const tradeName = paper.trade?.name || paper.tradeName || paper.trade?.title || "";
  const optionEntries = ["A", "B", "C", "D"]
    .map((key) => {
      const value = currentQ?.[`option${key}`];
      return value ? { key, value } : null;
    })
    .filter(Boolean);
  const hasObjectiveOptions = optionEntries.length > 0;
  const questionText = currentQ.questionText || currentQ.text || "";
  const marksValue = currentQ.marks !== undefined && currentQ.marks !== null
    ? Number(currentQ.marks).toFixed(2)
    : "";
  const isCurrentFlagged = flaggedQuestions.has(currentQ.id);
  const isTimeCritical = timeRemaining <= 5 * 60;

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
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Question Navigator</h2>
            <div className={`time-remaining${isTimeCritical ? " warning" : ""}`}>
              <span className="label">Time Left:</span>
              <span className="value">{formatTime(timeRemaining)}</span>
            </div>
          </div>

          <div className="question-nav-container">
            <div className="question-nav">
              {paper.questions.map((q, index) => {
                const isAnswered = Boolean(answers[q.id]);
                const isCurrent = index === currentQuestion;
                const isFlagged = flaggedQuestions.has(q.id);
                const classes = ["question-btn"];
                if (isCurrent) classes.push("current");
                if (isAnswered) classes.push("answered");
                if (isFlagged) classes.push("flagged");
                return (
                  <button
                    key={q.id}
                    type="button"
                    className={classes.join(" ")}
                    onClick={() => setCurrentQuestion(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="question-status">
            <div className="status-item">
              <span className="status-color status-current"></span>
              Current Question
            </div>
            <div className="status-item">
              <span className="status-color status-answered"></span>
              Answered
            </div>
            <div className="status-item">
              <span className="status-color status-flagged"></span>
              Flagged
            </div>
            <div className="status-item">
              <span className="status-color status-not-answered"></span>
              Not Answered
            </div>
          </div>
        </aside>

        <main className="main-content">
          <header className="exam-header">
            <div>
              <h1 className="exam-title">
                {paper.paperType}
                {tradeName ? ` — ${tradeName}` : ""}
              </h1>
              <p className="exam-subtitle">
                Question {currentQuestion + 1} of {totalQuestions}
              </p>
            </div>
            <div className="exam-metrics">
              <span>{answeredCount} / {totalQuestions} Answered</span>
            </div>
          </header>

          <section className="question-card">
            <div className="question-header">
              <h2 className="question-text">Q{currentQuestion + 1}. {questionText}</h2>
              {marksValue && <span className="marks-badge">{marksValue} Marks</span>}
            </div>

            <div className="options-container">
              {hasObjectiveOptions ? (
                optionEntries.map(({ key, value }) => {
                  const inputId = `q${currentQ.id}-${key}`;
                  return (
                    <label key={key} className={`form-check ${answers[currentQ.id] === key ? "selected" : ""}`} htmlFor={inputId}>
                      <input
                        id={inputId}
                        className="form-check-input"
                        type="radio"
                        name={`question-${currentQ.id}`}
                        value={key}
                        checked={answers[currentQ.id] === key}
                        onChange={() => handleAnswerChange(currentQ.id, key)}
                      />
                      <span className="form-check-label">
                        <span className="option-letter">{key}.</span>
                        <span className="option-text">{value}</span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <textarea
                  className="form-control long-answer"
                  value={answers[currentQ.id] || ""}
                  placeholder="Type your answer here"
                  onChange={(event) => handleAnswerChange(currentQ.id, event.target.value)}
                />
              )}
            </div>

            <div className="nav-controls">
              <div className="nav-controls-left">
                {currentQuestion > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                  >
                    ← Previous
                  </button>
                )}
              </div>
              <div className="nav-controls-center">
                <button
                  type="button"
                  className={`btn btn-flag${isCurrentFlagged ? " active" : ""}`}
                  onClick={() => toggleFlagQuestion(currentQ.id)}
                >
                  {isCurrentFlagged ? "Unflag" : "Flag"}
                </button>
              </div>
              <div className="nav-controls-right">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setCurrentQuestion(prev => Math.min(totalQuestions - 1, prev + 1))}
                  disabled={currentQuestion === totalQuestions - 1}
                >
                  Next →
                </button>
              </div>
            </div>
          </section>

          <section className="submit-footer">
            <button type="button" className="btn btn-success" onClick={handleSubmit}>
              Submit Exam
            </button>
            <p className="submit-hint">
              Once submitted, you cannot make changes. Please ensure you have reviewed all questions.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
