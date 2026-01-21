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
  const timerRef = useRef(null);
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
    const handleKeyDown = (e) => {
      // Block F1-F12
      if (e.key.startsWith("F") && e.key.length <= 3) {
        e.preventDefault();
        return false;
      }

      // Block Alt+Tab, Ctrl+Tab, Cmd+Tab
      if ((e.altKey || e.ctrlKey || e.metaKey) && e.key === "Tab") {
        e.preventDefault();
        alert("Tab switching is not allowed during the exam!");
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert("Warning: Tab switching detected! This will be reported.");
      }
    };

    const handleBlur = () => {
      if (document.hasFocus() === false) {
        alert("Warning: Window focus lost! Please return to the exam window.");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    // Check fullscreen
    const checkFullscreen = () => {
      const isFullscreen = 
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement || 
        document.msFullscreenElement;

      if (!isFullscreen && examStarted) {
        alert("You must remain in fullscreen mode. Returning to fullscreen...");
        document.documentElement.requestFullscreen().catch(() => {
          alert("Please enable fullscreen to continue the exam.");
        });
      }
    };

    const fullscreenInterval = setInterval(checkFullscreen, 1000);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      clearInterval(fullscreenInterval);
    };
  }, [examStarted]);

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

  // Handle auto-submit
  const handleAutoSubmit = async () => {
    if (!attemptId) return;

    const answerArray = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
      questionId: Number(questionId),
      selectedAnswer
    }));

    try {
      await api.post("/exam/submit", {
        attemptId,
        answers: answerArray
      });

      document.exitFullscreen();
      navigate(`/result?candidateId=${candidateId}`);
    } catch (error) {
      console.error("Auto-submit error:", error);
      alert("Error submitting exam");
    }
  };

  // Handle manual submit
  const handleSubmit = async () => {
    if (!window.confirm("Are you sure you want to submit the exam? You cannot change your answers after submission.")) {
      return;
    }

    if (!attemptId) {
      alert("Exam not started");
      return;
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

      document.exitFullscreen();
      navigate(`/result?candidateId=${candidateId}`);
    } catch (error) {
      console.error("Submit error:", error);
      alert("Error submitting exam");
    }
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

  return (
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
  );
}
