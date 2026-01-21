import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();

  const [masters, setMasters] = useState({
    ranks: [],
    trades: [],
    commands: [],
    centers: []
  });

  const [form, setForm] = useState({
    armyNo: "",
    name: "",
    rankId: "",
    tradeId: "",
    dob: "",
    doe: "",
    unit: "",
    medCat: "",
    corps: "",
    commandId: "",
    centerId: "",
    selectedExamTypes: []
  });

  const [errors, setErrors] = useState({});
  const [selectedTrade, setSelectedTrade] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ===== LOAD DROPDOWNS ===== */
  useEffect(() => {
    api.get("/admin/masters")
      .then(res => {
        setMasters({
          ranks: Array.isArray(res.data?.ranks) ? res.data.ranks : [],
          trades: Array.isArray(res.data?.trades) ? res.data.trades : [],
          commands: Array.isArray(res.data?.commands) ? res.data.commands : [],
          centers: Array.isArray(res.data?.centers) ? res.data.centers : []
        });
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Failed to load dropdown data. Please contact admin.");
        setLoading(false);
      });
  }, []);

  const filteredCenters = useMemo(() => {
    if (!form.commandId) return [];
    return masters.centers.filter(center => center.commandId === Number(form.commandId));
  }, [masters.centers, form.commandId]);

  const transformedTrades = useMemo(() => masters.trades, [masters.trades]);

  /* ===== HANDLE CHANGE ===== */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));

    if (name === "tradeId") {
      const trade = Array.isArray(transformedTrades)
        ? transformedTrades.find(t => t.id === Number(value))
        : null;

      setSelectedTrade(trade || null);
      setForm(prev => ({ ...prev, selectedExamTypes: trade ? prev.selectedExamTypes : [] }));
    }

    if (name === "commandId") {
      setForm(prev => ({ ...prev, centerId: "" }));
    }
  };

  /* ===== HANDLE EXAM TYPE SELECTION ===== */
  const handleExamTypeChange = (examType) => {
    const currentTypes = form.selectedExamTypes || [];
    const newTypes = currentTypes.includes(examType)
      ? currentTypes.filter(t => t !== examType)
      : [...currentTypes, examType];

    setForm(prev => ({ ...prev, selectedExamTypes: newTypes }));
    setErrors(prev => ({ ...prev, selectedExamTypes: "" }));
  };

  /* ===== VALIDATION ===== */
  const validate = () => {
    const newErrors = {};

    Object.keys(form).forEach(key => {
      if (key === "selectedExamTypes") {
        if (!form[key] || form[key].length === 0) {
          newErrors[key] = "Please select at least one exam type";
        }
      } else if (!form[key]) {
        newErrors[key] = "This field is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ===== SUBMIT ===== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      await api.post("/candidate/register", form);
      alert("Candidate registered successfully. Please login to continue.");
      navigate("/candidate/login", {
        replace: true,
        state: { armyNo: form.armyNo }
      });
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ===== LOADING (NO BLANK SCREEN) ===== */
  if (loading) {
    return (
      <div className="register-page">
        <div className="overlay" />
        <div className="register-card">
          <header className="register-header">
            <h1>Army Candidate Registration</h1>
            <p>Preparing registration form…</p>
          </header>
          <p className="loading-copy">Loading registration form...</p>
        </div>
      </div>
    );
  }

  /* ===== API ERROR (NO BLANK SCREEN) ===== */
  if (loadError) {
    return (
      <div className="register-page">
        <div className="overlay" />
        <div className="register-card error-state">
          <header className="register-header">
            <h1>Army Candidate Registration</h1>
          </header>
          <div className="error-pane">
            <h2>Unable to load form</h2>
            <p>{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="overlay" />

      <div className="register-card">
        <header className="register-header">
          <h1>Army Candidate Registration</h1>
          <p>2 Signal Training Centre · Online Examination Portal</p>
        </header>

        <form className="register-form" onSubmit={handleSubmit}>
          <section>
            <h2 className="section-title">Personal Details</h2>
            <div className="grid two">
              <div className="form-group">
                <label htmlFor="armyNo">Army No (Username) *</label>
                <input id="armyNo" name="armyNo" value={form.armyNo} onChange={handleChange} />
                {errors.armyNo && <span className="error">{errors.armyNo}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="rankId">Rank *</label>
                <select id="rankId" name="rankId" value={form.rankId} onChange={handleChange}>
                  <option value="">Select Rank</option>
                  {masters.ranks.map((rank) => (
                    <option key={rank.id} value={rank.id}>{rank.name}</option>
                  ))}
                </select>
                {errors.rankId && <span className="error">{errors.rankId}</span>}
              </div>
            </div>

            <div className="grid two">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input id="name" name="name" value={form.name} onChange={handleChange} />
                {errors.name && <span className="error">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="tradeId">Trade *</label>
                <select id="tradeId" name="tradeId" value={form.tradeId} onChange={handleChange}>
                  <option value="">Select Trade</option>
                  {transformedTrades.map((trade) => (
                    <option key={trade.id} value={trade.id}>{trade.name}</option>
                  ))}
                </select>
                {errors.tradeId && <span className="error">{errors.tradeId}</span>}
              </div>
            </div>

            <div className="grid two">
              <div className="form-group">
                <label htmlFor="dob">Date of Birth *</label>
                <input type="date" id="dob" name="dob" value={form.dob} onChange={handleChange} />
                {errors.dob && <span className="error">{errors.dob}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="doe">Date of Enrolment *</label>
                <input type="date" id="doe" name="doe" value={form.doe} onChange={handleChange} />
                {errors.doe && <span className="error">{errors.doe}</span>}
              </div>
            </div>

            <div className="grid two">
              <div className="form-group">
                <label htmlFor="unit">Unit *</label>
                <input id="unit" name="unit" value={form.unit} onChange={handleChange} />
                {errors.unit && <span className="error">{errors.unit}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="medCat">Medical Category *</label>
                <input id="medCat" name="medCat" value={form.medCat} onChange={handleChange} />
                {errors.medCat && <span className="error">{errors.medCat}</span>}
              </div>
            </div>

            <div className="grid two">
              <div className="form-group">
                <label htmlFor="commandId">Command *</label>
                <select id="commandId" name="commandId" value={form.commandId} onChange={handleChange}>
                  <option value="">Select Command</option>
                  {masters.commands.map((command) => (
                    <option key={command.id} value={command.id}>{command.name}</option>
                  ))}
                </select>
                {errors.commandId && <span className="error">{errors.commandId}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="centerId">Conducting Centre *</label>
                <select
                  id="centerId"
                  name="centerId"
                  value={form.centerId}
                  onChange={handleChange}
                  disabled={!form.commandId || filteredCenters.length === 0}
                >
                  <option value="">{form.commandId ? "Select Centre" : "Select command first"}</option>
                  {filteredCenters.map((center) => (
                    <option key={center.id} value={center.id}>{center.name}</option>
                  ))}
                </select>
                {errors.centerId && <span className="error">{errors.centerId}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="corps">Corps *</label>
              <input id="corps" name="corps" value={form.corps} onChange={handleChange} />
              {errors.corps && <span className="error">{errors.corps}</span>}
            </div>
          </section>

          <section>
            <h2 className="section-title">Written Paper Selection</h2>
            {selectedTrade ? (
              <div className="exam-types">
                <p className="exam-helper">Select the written papers you are appearing for. Only enabled papers for the chosen trade are shown.</p>
                <div className="exam-list">
                  {selectedTrade.wp1 && (
                    <label className="exam-option">
                      <input
                        type="checkbox"
                        checked={form.selectedExamTypes.includes("WP-I")}
                        onChange={() => handleExamTypeChange("WP-I")}
                      />
                      <span>WP-I · Written Paper I</span>
                    </label>
                  )}
                  {selectedTrade.wp2 && (
                    <label className="exam-option">
                      <input
                        type="checkbox"
                        checked={form.selectedExamTypes.includes("WP-II")}
                        onChange={() => handleExamTypeChange("WP-II")}
                      />
                      <span>WP-II · Written Paper II</span>
                    </label>
                  )}
                  {selectedTrade.wp3 && (
                    <label className="exam-option">
                      <input
                        type="checkbox"
                        checked={form.selectedExamTypes.includes("WP-III")}
                        onChange={() => handleExamTypeChange("WP-III")}
                      />
                      <span>WP-III · Written Paper III</span>
                    </label>
                  )}
                  {!selectedTrade.wp1 && !selectedTrade.wp2 && !selectedTrade.wp3 && (
                    <p className="exam-warning">No written papers are enabled for the selected trade. Contact the admin.</p>
                  )}
                </div>
                {errors.selectedExamTypes && <span className="error">{errors.selectedExamTypes}</span>}
              </div>
            ) : (
              <p className="exam-placeholder">Select a trade to view available written papers.</p>
            )}
          </section>

          <footer className="register-footer">
            <button type="submit" disabled={submitting}>
              {submitting ? "Registering…" : "Register Candidate"}
            </button>
            <p className="login-redirect">
              Already registered? <button type="button" className="link" onClick={() => navigate("/candidate/login")}>Go to Candidate Login</button>
            </p>
          </footer>
        </form>
      </div>
    </div>
  );
}
