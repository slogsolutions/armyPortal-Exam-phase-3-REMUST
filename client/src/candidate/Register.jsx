import { useEffect, useState } from "react";
import api from "../api/api";
import "./Register.css";

export default function Register() {
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

  /* ===== LOAD DROPDOWNS ===== */
  useEffect(() => {
    api.get("/admin/masters")
      .then(res => setMasters(res.data))
      .catch(() => alert("Failed to load dropdown data"));
  }, []);

  /* ===== HANDLE CHANGE ===== */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: "" });

    // When trade is selected, fetch trade details to show exam types
    if (name === "tradeId" && value) {
      const trade = masters.trades.find(t => t.id === Number(value));
      setSelectedTrade(trade || null);
    }
  };

  /* ===== HANDLE EXAM TYPE SELECTION ===== */
  const handleExamTypeChange = (examType) => {
    const currentTypes = form.selectedExamTypes || [];
    const newTypes = currentTypes.includes(examType)
      ? currentTypes.filter(t => t !== examType)
      : [...currentTypes, examType];
    
    setForm({ ...form, selectedExamTypes: newTypes });
    setErrors({ ...errors, selectedExamTypes: "" });
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
      // Store candidate ID in localStorage for now (later can use session/auth)
      localStorage.setItem("candidateId", candidateId);
      // Redirect to instructions - will need to select paper type first
      window.location.href = "/instructions";
    } catch (err) {
      alert(err.response?.data?.error || "Registration failed");
    }
  };

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
              <input
                name="armyNo"
                className={errors.armyNo ? "error" : ""}
                onChange={handleChange}
              />
              {errors.armyNo && <span>{errors.armyNo}</span>}
            </div>

            <div>
              <label>Rank *</label>
              <select
                name="rankId"
                className={errors.rankId ? "error" : ""}
                onChange={handleChange}
              >
                <option value="">– Select Rank –</option>
                {masters.ranks.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.rankId && <span>{errors.rankId}</span>}
            </div>
          </div>

          {/* Name */}
          <div className="row">
            <div>
              <label>Name *</label>
              <input
                name="name"
                className={errors.name ? "error" : ""}
                onChange={handleChange}
              />
              {errors.name && <span>{errors.name}</span>}
            </div>

            <div>
              <label>Trade *</label>
              <select
                name="tradeId"
                className={errors.tradeId ? "error" : ""}
                onChange={handleChange}
              >
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
              <input type="date" name="dob" className={errors.dob ? "error" : ""} onChange={handleChange} />
              {errors.dob && <span>{errors.dob}</span>}
            </div>

            <div>
              <label>Date of Enrollment *</label>
              <input type="date" name="doe" className={errors.doe ? "error" : ""} onChange={handleChange} />
              {errors.doe && <span>{errors.doe}</span>}
            </div>
          </div>

          {/* Unit + Medical */}
          <div className="row">
            <div>
              <label>Unit *</label>
              <input name="unit" className={errors.unit ? "error" : ""} onChange={handleChange} />
              {errors.unit && <span>{errors.unit}</span>}
            </div>

            <div>
              <label>Medical Category *</label>
              <input name="medCat" className={errors.medCat ? "error" : ""} onChange={handleChange} />
              {errors.medCat && <span>{errors.medCat}</span>}
            </div>
          </div>

          {/* Command */}
          <div>
            <label>Command *</label>
            <select
              name="commandId"
              className={errors.commandId ? "error" : ""}
              onChange={handleChange}
            >
              <option value="">– Select Command –</option>
              {masters.commands.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.commandId && <span>{errors.commandId}</span>}
          </div>

          {/* Command + Corps */}
          <div className="row">
            <div>
              <label>Corps *</label>
              <input name="corps" className={errors.corps ? "error" : ""} onChange={handleChange} />
              {errors.corps && <span>{errors.corps}</span>}
            </div>
          </div>

          <h4>Exam Details</h4>

          {/* Conducting Center */}
          <div>
            <label>Conducting Center *</label>
            <select
              name="centerId"
              className={errors.centerId ? "error" : ""}
              onChange={handleChange}
            >
              <option value="">– Select Conducting Center –</option>
              {masters.centers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.centerId && <span>{errors.centerId}</span>}
          </div>

          {/* Exam Types - Select Written Papers (WP-I, WP-II) */}
          {selectedTrade && (
            <div className="exam-types-section">
              <label>Select Written Exam Types (Select all that apply) *</label>
              <div className="exam-types-grid">
                {selectedTrade.wp1 && (
                  <label className="exam-type-checkbox">
                    <input 
                      type="checkbox" 
                      checked={form.selectedExamTypes.includes("WP-I")}
                      onChange={() => handleExamTypeChange("WP-I")}
                    />
                    <span>WP-I</span>
                  </label>
                )}
                {selectedTrade.wp2 && (
                  <label className="exam-type-checkbox">
                    <input 
                      type="checkbox" 
                      checked={form.selectedExamTypes.includes("WP-II")}
                      onChange={() => handleExamTypeChange("WP-II")}
                    />
                    <span>WP-II</span>
                  </label>
                )}
              </div>
              {errors.selectedExamTypes && <span>{errors.selectedExamTypes}</span>}
              <p className="exam-types-note">
                Note: Practical exams (PR-I to PR-V) and ORAL will be evaluated separately by exam officers.
                You can only take written exams (WP-I, WP-II) online.
              </p>
            </div>
          )}

          <button type="submit">Register Candidate</button>
        </form>
      </div>
    </div>
  );
}
