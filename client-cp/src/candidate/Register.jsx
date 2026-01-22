import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import armyBg from "../../img/army.jpg";
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

  const fieldClass = (key) => `form-field${errors[key] ? " invalid" : ""}`;
  const controlClass = (key) => (errors[key] ? "invalid" : "");

  const footer = (
    <div className="footer-container">
      <div className="footer-note developed">
        Developed by SLOG Solutions Pvt Ltd and 2STC
      </div>
      <div className="footer-note reserved">
        All Rights Reserved @ SLOG Solutions Pvt Ltd
      </div>
    </div>
  );

  const shell = (content) => (
    <div
      className="register-page"
      style={{ backgroundImage: `url(${armyBg})` }}
    >
      <div className="background-overlay" />
      <div className="wrap">
        <div className="title">ARMY CANDIDATE REGISTRATION</div>
        <div className="subtitle">2 Signal Training Centre Online Exam Portal</div>
        {content}
      </div>
      {footer}
    </div>
  );

  if (loading) {
    return shell(
      <div className="card status-card">
        <h2>Loading Registration Form</h2>
        <p className="status-copy">Preparing registration form…</p>
      </div>
    );
  }

  if (loadError) {
    return shell(
      <div className="card status-card">
        <h2>Unable to load form</h2>
        <p className="status-copy">{loadError}</p>
      </div>
    );
  }

  const examSectionClass = errors.selectedExamTypes ? "exam-section invalid" : "exam-section";

  return shell(
    <form className="card register-form" onSubmit={handleSubmit} noValidate>
      <h2>Registration Form</h2>

      <div className="grid grid-1">
        <div className="section-header">Personal Details</div>
      </div>

      <div className="grid">
        <div className={fieldClass("armyNo")}>
          <label htmlFor="armyNo">Army No (USERNAME) *</label>
          <input
            id="armyNo"
            name="armyNo"
            placeholder="Army Number"
            value={form.armyNo}
            onChange={handleChange}
            className={controlClass("armyNo")}
          />
          {errors.armyNo && <span className="field-error">{errors.armyNo}</span>}
        </div>

        <div className={fieldClass("rankId")}>
          <label htmlFor="rankId">Rank *</label>
          <select
            id="rankId"
            name="rankId"
            value={form.rankId}
            onChange={handleChange}
            className={controlClass("rankId")}
          >
            <option value="">-- Select Rank --</option>
            {masters.ranks.map((rank) => (
              <option key={rank.id} value={rank.id}>{rank.name}</option>
            ))}
          </select>
          {errors.rankId && <span className="field-error">{errors.rankId}</span>}
        </div>

        <div className={fieldClass("name")}>
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className={controlClass("name")}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className={fieldClass("tradeId")}>
          <label htmlFor="tradeId">Trade *</label>
          <select
            id="tradeId"
            name="tradeId"
            value={form.tradeId}
            onChange={handleChange}
            className={controlClass("tradeId")}
          >
            <option value="">-- Select Trade --</option>
            {transformedTrades.map((trade) => (
              <option key={trade.id} value={trade.id}>{trade.name}</option>
            ))}
          </select>
          {errors.tradeId && <span className="field-error">{errors.tradeId}</span>}
        </div>

        <div className={fieldClass("dob")}>
          <label htmlFor="dob">Date of Birth (PASSWORD dd-mm-yyyy) *</label>
          <input
            id="dob"
            name="dob"
            placeholder="dd-mm-yyyy"
            value={form.dob}
            onChange={handleChange}
            className={controlClass("dob")}
          />
          {errors.dob && <span className="field-error">{errors.dob}</span>}
        </div>

        <div className={fieldClass("doe")}>
          <label htmlFor="doe">Date of Enrolment *</label>
          <input
            type="date"
            id="doe"
            name="doe"
            value={form.doe}
            onChange={handleChange}
            className={controlClass("doe")}
          />
          {errors.doe && <span className="field-error">{errors.doe}</span>}
        </div>

        <div className={fieldClass("unit")}>
          <label htmlFor="unit">Unit *</label>
          <input
            id="unit"
            name="unit"
            placeholder="Unit"
            value={form.unit}
            onChange={handleChange}
            className={controlClass("unit")}
          />
          {errors.unit && <span className="field-error">{errors.unit}</span>}
        </div>

        <div className={fieldClass("medCat")}>
          <label htmlFor="medCat">Medical Category *</label>
          <input
            id="medCat"
            name="medCat"
            placeholder="Medical Category"
            value={form.medCat}
            onChange={handleChange}
            className={controlClass("medCat")}
          />
          {errors.medCat && <span className="field-error">{errors.medCat}</span>}
        </div>

        <div className={fieldClass("commandId")}>
          <label htmlFor="commandId">Command *</label>
          <select
            id="commandId"
            name="commandId"
            value={form.commandId}
            onChange={handleChange}
            className={controlClass("commandId")}
          >
            <option value="">-- Select Command --</option>
            {masters.commands.map((command) => (
              <option key={command.id} value={command.id}>{command.name}</option>
            ))}
          </select>
          {errors.commandId && <span className="field-error">{errors.commandId}</span>}
        </div>

        <div className={fieldClass("centerId")}>
          <label htmlFor="centerId">Conducting Centre *</label>
          <select
            id="centerId"
            name="centerId"
            value={form.centerId}
            onChange={handleChange}
            disabled={!form.commandId || filteredCenters.length === 0}
            className={controlClass("centerId")}
          >
            <option value="">{form.commandId ? "-- Select Centre --" : "Select command first"}</option>
            {filteredCenters.map((center) => (
              <option key={center.id} value={center.id}>{center.name}</option>
            ))}
          </select>
          {errors.centerId && <span className="field-error">{errors.centerId}</span>}
        </div>

        <div className={`${fieldClass("corps")} full-span`}>
          <label htmlFor="corps">Corps *</label>
          <input
            id="corps"
            name="corps"
            placeholder="Corps"
            value={form.corps}
            onChange={handleChange}
            className={controlClass("corps")}
          />
          {errors.corps && <span className="field-error">{errors.corps}</span>}
        </div>
      </div>

      <div className="grid grid-1">
        <div className="section-header">Exam Details</div>
      </div>

      {selectedTrade ? (
        <div className={examSectionClass}>
          <p className="exam-helper">
            Select the written papers you are appearing for. Only enabled papers for the chosen trade are shown.
          </p>
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
          {errors.selectedExamTypes && <span className="field-error">{errors.selectedExamTypes}</span>}
        </div>
      ) : (
        <p className="exam-placeholder">Select a trade to view available written papers.</p>
      )}

      <div className="actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? "Registering…" : "Register Candidate"}
        </button>
      </div>
    </form>
  );
}
