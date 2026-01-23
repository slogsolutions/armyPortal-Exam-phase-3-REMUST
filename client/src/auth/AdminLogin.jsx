import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import shieldImg from "../../img/shield.jpg";
import "./AdminLogin.css";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: ""
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
      const res = await api.post("/auth/login", form);
      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("admin", JSON.stringify(res.data.admin));
      localStorage.setItem("adminId", String(res.data.admin?.id || ""));

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.msg ||
        "Invalid username or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-screen">
      <div className="admin-logo">
        <img src={shieldImg} alt="Admin Shield" />
        <span>Admin</span>
      </div>

      <div className="admin-form-card">
        <h2>JAI HIND! Welcome to 2 STC Online Exam Portal</h2>

        <form onSubmit={login}>
          <div className="input-field">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
                disabled={loading}
                placeholder="Username"
              />
              <span className="input-icon" aria-hidden>👤</span>
            </div>
          </div>

          <div className="input-field">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                disabled={loading}
                placeholder="Password"
              />
              <span className="input-icon" aria-hidden>🔒</span>
            </div>
          </div>

          {error && <div className="admin-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
