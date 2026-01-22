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
  const [selectedPaper, setSelectedPaper] = useState("");
  const [paperOptions, setPaperOptions] = useState([]);

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
            setPaperOptions(exams);
            if (exams.length === 1) {
              setSelectedPaper(exams[0]);
            }
          } else {
            setCandidateMeta(null);
            setPaperOptions([]);
            setSelectedPaper("");
          }
        } catch (err) {
          if (err.name !== "CanceledError") {
            setCandidateMeta(null);
            setPaperOptions([]);
            setSelectedPaper("");
          }
        }
      };
      fetchMeta();
      return () => controller.abort();
    } else {
      setCandidateMeta(null);
      setPaperOptions([]);
      setSelectedPaper("");
    }
  }, [form.armyNo]);

  const disableLogin = useMemo(() => {
    if (loading) return true;
    if (!form.armyNo || !form.dob) return true;
    if (paperOptions.length > 0 && !selectedPaper) return true;
    return false;
  }, [form.armyNo, form.dob, loading, paperOptions.length, selectedPaper]);

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/candidate/login", {
        ...form,
        paperType: selectedPaper || null
      });

      // ✅ Store token & candidate info
      localStorage.setItem("candidateToken", res.data.token);
      localStorage.setItem("candidate", JSON.stringify(res.data.candidate));

      // Redirect to candidate dashboard
      navigate("/candidate/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Invalid army number or date of birth"
      );
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
                placeholder="Date of Birth (dd-mm-yyyy)"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {paperOptions.length > 0 && (
              <div className="form-group">
                <select
                  name="paperType"
                  value={selectedPaper}
                  onChange={(e) => setSelectedPaper(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Paper</option>
                  {paperOptions.map((paper) => (
                    <option key={paper} value={paper}>
                      {paper}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {candidateMeta && (
              <div className="candidate-peek">
                <p><strong>Name:</strong> {candidateMeta.name}</p>
                <p><strong>Trade:</strong> {candidateMeta.trade?.name}</p>
                <p><strong>Command:</strong> {candidateMeta.command?.name}</p>
                {candidateMeta.center?.name && (
                  <p><strong>Centre:</strong> {candidateMeta.center.name}</p>
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
