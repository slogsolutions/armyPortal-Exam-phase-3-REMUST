import { useEffect, useState } from "react";
import api from "../api/api";
import "./Register.css";

export default function Register() {

  const [masters, setMasters] = useState({
    ranks: [],
    trades: [],
    commands: []
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
    selectedExamTypes: []
  });

  const [errors, setErrors] = useState({});
  const [selectedTrade, setSelectedTrade] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  /* ===== LOAD DROPDOWNS ===== */
  useEffect(() => {
    api.get("/admin/masters")
      .then(res => {
        setMasters({
          ranks: Array.isArray(res.data?.ranks) ? res.data.ranks : [],
          trades: Array.isArray(res.data?.trades) ? res.data.trades : [],
          commands: Array.isArray(res.data?.commands) ? res.data.commands : []
        });
        setLoading(false);
      })
      .catch(() => {
        setLoadError("Failed to load dropdown data. Please contact admin.");
        setLoading(false);
      });
  }, []);

  /* ===== HANDLE CHANGE ===== */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));

    if (name === "tradeId" && value) {
      const trade = Array.isArray(masters.trades)
        ? masters.trades.find(t => t.id === Number(value))
        : null;

      setSelectedTrade(trade || null);
      setForm(prev => ({ ...prev, selectedExamTypes: [] }));
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
      const res = await api.post("/candidate/register", form);
      const candidateId = res.data.candidate.id;
      alert("Candidate Registered Successfully!");
      localStorage.setItem("candidateId", candidateId);
      window.location.href = "/instructions";
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed");
    }
  };

  /* ===== LOADING (NO BLANK SCREEN) ===== */
  if (loading) {
    return (
      <div className="register-page">
        <div className="form-card">
          <h3>Loading registration form...</h3>
        </div>
      </div>
    );
  }

  /* ===== API ERROR (NO BLANK SCREEN) ===== */
  if (loadError) {
    return (
      <div className="register-page">
        <div className="form-card">
          <h2>Error</h2>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="overlay"></div>

      <div className="form-card">
        <h1>ARMY CANDIDATE REGISTRATION</h1>
        <h3>2 Signal Training Centre Online Exam Portal</h3>

        <form onSubmit={handleSubmit}>
          <h4>Personal Details</h4>

          {/* Army No + Rank */}
          <div className="row">
            <div>
              <label>Army No (USERNAME) *</label>
              <input name="armyNo" onChange={handleChange} />
              {errors.armyNo && <span>{errors.armyNo}</span>}
            </div>

            <div>
              <label>Rank *</label>
              <select name="rankId" onChange={handleChange}>
                <option value="">– Select Rank –</option>
                {masters.ranks.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.rankId && <span>{errors.rankId}</span>}
            </div>
          </div>

          {/* Name + Trade */}
          <div className="row">
            <div>
              <label>Name *</label>
              <input name="name" onChange={handleChange} />
              {errors.name && <span>{errors.name}</span>}
            </div>

            <div>
              <label>Trade *</label>
              <select name="tradeId" onChange={handleChange}>
                <option value="">– Select Trade –</option>
                {masters.trades.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {errors.tradeId && <span>{errors.tradeId}</span>}
            </div>
          </div>

          {/* DOB + DOE */}
          <div className="row">
            <div>
              <label>Date of Birth *</label>
              <input type="date" name="dob" onChange={handleChange} />
              {errors.dob && <span>{errors.dob}</span>}
            </div>

            <div>
              <label>Date of Enrollment *</label>
              <input type="date" name="doe" onChange={handleChange} />
              {errors.doe && <span>{errors.doe}</span>}
            </div>
          </div>

          {/* Unit + Medical */}
          <div className="row">
            <div>
              <label>Unit *</label>
              <input name="unit" onChange={handleChange} />
              {errors.unit && <span>{errors.unit}</span>}
            </div>

            <div>
              <label>Medical Category *</label>
              <input name="medCat" onChange={handleChange} />
              {errors.medCat && <span>{errors.medCat}</span>}
            </div>
          </div>

          {/* Command */}
          <div>
            <label>Command *</label>
            <select name="commandId" onChange={handleChange}>
              <option value="">– Select Command –</option>
              {masters.commands.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.commandId && <span>{errors.commandId}</span>}
          </div>

          {/* Corps */}
          <div className="row">
            <div>
              <label>Corps *</label>
              <input name="corps" onChange={handleChange} />
              {errors.corps && <span>{errors.corps}</span>}
            </div>
          </div>

          <h4>Exam Details</h4>

          {/* Exam Types */}
          {selectedTrade && (
            <div className="exam-types-section">
              <label>Select Written Exam Types *</label>

              {selectedTrade.wp1 && (
                <label>
                  <input
                    type="checkbox"
                    checked={form.selectedExamTypes.includes("WP-I")}
                    onChange={() => handleExamTypeChange("WP-I")}
                  />
                  WP-I
                </label>
              )}

              {selectedTrade.wp2 && (
                <label>
                  <input
                    type="checkbox"
                    checked={form.selectedExamTypes.includes("WP-II")}
                    onChange={() => handleExamTypeChange("WP-II")}
                  />
                  WP-II
                </label>
              )}

              {selectedTrade.wp3 && (
                <label>
                  <input
                    type="checkbox"
                    checked={form.selectedExamTypes.includes("WP-III")}
                    onChange={() => handleExamTypeChange("WP-III")}
                  />
                  WP-III
                </label>
              )}

              {errors.selectedExamTypes && <span>{errors.selectedExamTypes}</span>}
            </div>
          )}

          <button type="submit">Register Candidate</button>
        </form>
      </div>
    </div>
  );
}
