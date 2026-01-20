import { useState } from "react";
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/candidate/login", form);

      // ✅ Store token & candidate info
      localStorage.setItem("candidateToken", res.data.token);
      localStorage.setItem("candidate", JSON.stringify(res.data.candidate));

      // Redirect to candidate dashboard or instructions
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

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
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
