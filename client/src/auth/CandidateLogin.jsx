import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
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
    <div className="candidate-login-page">
      <div className="overlay"></div>

      <div className="login-card">
        <h1>CANDIDATE LOGIN</h1>
        <h3>2 Signal Training Centre</h3>

        <form onSubmit={login}>
          <div className="form-group">
            <label>Army Number</label>
            <input
              type="text"
              name="armyNo"
              value={form.armyNo}
              onChange={handleChange}
              required
              autoComplete="armyNo"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              required
              autoComplete="dob"
              disabled={loading}
            />
          </div>

          {paperOptions.length > 0 && (
            <div className="form-group">
              <label>Paper Type</label>
              <select
                name="paperType"
                value={selectedPaper}
                onChange={(e) => setSelectedPaper(e.target.value)}
                disabled={loading}
              >
                <option value="">Select paper</option>
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
              <p><strong>Trade:</strong> {candidateMeta.trade?.name || candidateMeta.trade?.name}</p>
              <p><strong>Command:</strong> {candidateMeta.command?.name}</p>
              {candidateMeta.center?.name && <p><strong>Centre:</strong> {candidateMeta.center.name}</p>}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={disableLogin}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="login-links">
            <p>
              Don't have an account? 
              <a href="/candidate/register">Register here</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
