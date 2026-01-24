import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import armyBg from "../../img/army.jpg";
import shieldImg from "../../img/shield.jpg";
import "./CandidateLogin.css";

export default function CandidateLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    armyNo: "",
    dob: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidateMeta, setCandidateMeta] = useState(null);
  const [candidatePapers, setCandidatePapers] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  useEffect(() => {
    if (form.armyNo.length >= 4) {
      const controller = new AbortController();
      const fetchMeta = async () => {
        try {
          const res = await api.post("/candidate/peek", { armyNo: form.armyNo }, { signal: controller.signal });
          if (res.data?.candidate) {
            setCandidateMeta(res.data.candidate);
            const exams = Array.isArray(res.data.candidate.selectedExamTypes)
              ? res.data.candidate.selectedExamTypes
              : [];
            setCandidatePapers(exams);
          } else {
            setCandidateMeta(null);
            setCandidatePapers([]);
          }
        } catch (err) {
          if (err.name !== "CanceledError") {
            setCandidateMeta(null);
            setCandidatePapers([]);
          }
        }
      };
      fetchMeta();
      return () => controller.abort();
    } else {
      setCandidateMeta(null);
      setCandidatePapers([]);
    }
  }, [form.armyNo]);

  const disableLogin = useMemo(() => {
    if (loading) return true;
    if (!form.armyNo || !form.dob) return true;
    return false;
  }, [form.armyNo, form.dob, loading]);

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/candidate/login", {
        ...form,
        paperType: null
      });

      const candidatePayload = res.data.candidate || {};
      const activePaper = candidatePayload.activePaperType;
      const slotId = candidatePayload.slotAssignment?.id;

      const selectedTypes = Array.isArray(candidatePayload.selectedExamTypes)
        ? candidatePayload.selectedExamTypes
        : [];
      const completedPapers = Array.isArray(candidatePayload.completedPapers)
        ? candidatePayload.completedPapers
        : [];

      const pendingPapers = selectedTypes.filter((paper) => !completedPapers.includes(paper));

      if (!activePaper || pendingPapers.length === 0) {
        setError("All allotted papers are already completed. Please contact the exam cell for assistance.");
        return;
      }

      // Store token & candidate info
      localStorage.setItem("candidateToken", res.data.token);
      localStorage.setItem("candidate", JSON.stringify(candidatePayload));

      navigate("/candidate/dashboard", { replace: true });
    } catch (err) {
      const apiError = err.response?.data?.error;
      if (apiError) {
        if (/no active exam slot/i.test(apiError)) {
          setError("Exam slot not available for your trade/paper. Please contact the exam cell.");
        } else {
          setError(apiError);
        }
      } else {
        setError("Invalid army number or date of birth");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="candidate-login-page"
      style={{ backgroundImage: `url(${armyBg})` }}
    >
      <div className="background-overlay" />

      <div className="navbar">
        <div className="navbar-left">2 SIGNAL TRAINING CENTER EXAM PORTAL</div>
        <div className="navbar-right">
          <a href="/admin" className="btn-warning">OIC Exam Center</a>
          <a href="/candidate/register" className="btn-success">Registration</a>
        </div>
      </div>

      <div className="login-content">
        <div className="login-container">
          <div className="logo-badge">
            <img src={shieldImg} alt="Army Shield" />
          </div>
          <h2>Candidate Login</h2>
          <p>Serve with courage. Access your exam portal account.</p>

          <form onSubmit={login}>
            <div className="form-group">
              <input
                type="text"
                name="armyNo"
                value={form.armyNo}
                onChange={handleChange}
                required
                placeholder="Army Number"
                autoComplete="username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                required
                placeholder="Date of Birth (yyyy-mm-dd)"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {candidateMeta && (
              <div className="candidate-peek">
                <p><strong>Name:</strong> {candidateMeta.name}</p>
                <p><strong>Trade:</strong> {candidateMeta.trade?.name}</p>
                <p><strong>Command:</strong> {candidateMeta.command?.name}</p>
                {candidateMeta.center?.name && (
                  <p><strong>Centre:</strong> {candidateMeta.center.name}</p>
                )}
                {candidatePapers.length > 0 && (
                  <p><strong>Allotted Papers:</strong> {candidatePapers.join(", ")}</p>
                )}
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={disableLogin}>
              {loading ? "Logging in..." : "Login to Exam Portal"}
            </button>

            <div className="login-links">
              <span>Need an account?</span>
              <a href="/candidate/register">Register here</a>
            </div>
          </form>
        </div>
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
