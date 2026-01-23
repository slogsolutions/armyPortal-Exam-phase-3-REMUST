import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./PracticalMarks.css";

const INITIAL_FORM = {
  pr1: "",
  pr2: "",
  pr3: "",
  pr4: "",
  pr5: "",
  oral: "",
  bpet: "",
  ppt: "",
  cpt: "",
  gradeOverride: "",
  overallResult: ""
};

const GRADE_OPTIONS = ["", "A", "B", "C", "D", "E"];
const RESULT_OPTIONS = ["", "PASS", "FAIL", "ABSENT", "WITHHELD"];
const PHYSICAL_OPTIONS = ["", "YES", "NO", "NA", "PASS", "FAIL"];

export default function PracticalMarks() {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [trades, setTrades] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('individual');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkMarks, setBulkMarks] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const navigate = useNavigate();

  const requireAdminSession = () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return false;
    }
    return true;
  };

  const getAdminId = () => {
    const adminFromStorage = localStorage.getItem("admin");
    if (adminFromStorage) {
      try {
        const parsed = JSON.parse(adminFromStorage);
        if (parsed?.id) return parsed.id;
      } catch (error) {
        console.warn("Failed to parse stored admin info", error);
      }
    }
    const storedId = localStorage.getItem("adminId");
    return storedId && storedId !== "undefined" ? storedId : null;
  };

  useEffect(() => {
    if (!requireAdminSession()) return;
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [candidatesRes, mastersRes, summaryRes] = await Promise.all([
        api.get("/practical/candidates"),
        api.get("/admin/masters"),
        api.get("/practical/summary")
      ]);

      setCandidates(candidatesRes.data || []);
      setTrades(mastersRes.data?.trades || []);
      setSummary(summaryRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        alert("Admin session expired. Please login again.");
        navigate("/admin/login", { replace: true });
        return;
      }
      setLoading(false);
    }
  };

  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate);
    setForm({
      ...INITIAL_FORM,
      pr1: candidate.practicalMarks?.pr1 ?? "",
      pr2: candidate.practicalMarks?.pr2 ?? "",
      pr3: candidate.practicalMarks?.pr3 ?? "",
      pr4: candidate.practicalMarks?.pr4 ?? "",
      pr5: candidate.practicalMarks?.pr5 ?? "",
      oral: candidate.practicalMarks?.oral ?? "",
      bpet: candidate.practicalMarks?.bpet ?? "",
      ppt: candidate.practicalMarks?.ppt ?? "",
      cpt: candidate.practicalMarks?.cpt ?? "",
      gradeOverride: candidate.practicalMarks?.gradeOverride ?? "",
      overallResult: candidate.practicalMarks?.overallResult ?? ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCandidate) {
      alert("Please select a candidate");
      return;
    }

    try {
      if (!requireAdminSession()) return;
      const adminId = getAdminId();
      if (!adminId) {
        alert("Admin session not found. Please login again.");
        navigate("/admin/login", { replace: true });
        return;
      }

      // Prepare all data in a single payload
      const trade = selectedCandidate.trade;
      const payload = {
        candidateId: selectedCandidate.id,
        enteredBy: adminId
      };

      // Add practical marks if enabled for the trade and values are provided
      if (trade.pr1 && form.pr1 !== "") payload.pr1 = parseFloat(form.pr1);
      if (trade.pr2 && form.pr2 !== "") payload.pr2 = parseFloat(form.pr2);
      if (trade.pr3 && form.pr3 !== "") payload.pr3 = parseFloat(form.pr3);
      if (trade.pr4 && form.pr4 !== "") payload.pr4 = parseFloat(form.pr4);
      if (trade.pr5 && form.pr5 !== "") payload.pr5 = parseFloat(form.pr5);
      if (trade.oral && form.oral !== "") payload.oral = parseFloat(form.oral);

      // Add extra fields if provided
      if (form.bpet !== "") payload.bpet = form.bpet;
      if (form.ppt !== "") payload.ppt = form.ppt;
      if (form.cpt !== "") payload.cpt = form.cpt;
      if (form.gradeOverride !== "") payload.gradeOverride = form.gradeOverride;
      if (form.overallResult !== "") payload.overallResult = form.overallResult;

      // Use bulk submit for single candidate to handle all data at once
      const response = await api.post("/practical/bulk-submit", {
        marks: [payload],
        enteredBy: adminId
      });

      if (response.data.successful > 0) {
        alert("Practical marks saved successfully!");
        fetchData();
      } else {
        const errorMsg = response.data.errors?.[0]?.error || "Failed to save practical marks";
        alert(errorMsg);
      }
    } catch (error) {
      console.error("Error saving practical marks:", error);
      alert(error.response?.data?.error || "Failed to save practical marks");
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkMarks.length === 0) {
      alert("Please add at least one candidate");
      return;
    }

    try {
      if (!requireAdminSession()) return;
      const adminId = getAdminId();
      if (!adminId) {
        alert("Admin session not found. Please login again.");
        return;
      }

      const sanitizedMarks = bulkMarks.map((entry) => {
        const payload = { candidateId: entry.candidateId };
        NUMERIC_FIELDS.forEach((field) => {
          const value = entry[field];
          if (value !== null && value !== "" && value !== undefined) {
            payload[field] = Number(value);
          }
        });
        ["bpet", "ppt", "cpt", "gradeOverride", "overallResult"].forEach((field) => {
          const value = entry[field];
          if (value !== undefined && value !== null && value !== "") {
            payload[field] = typeof value === "string" ? value.toUpperCase() : value;
          }
        });
        return payload;
      });

      const response = await api.post("/practical/bulk-submit", {
        marks: sanitizedMarks,
        enteredBy: adminId
      });

      alert(`Successfully saved ${response.data.successful} of ${response.data.total} marks`);
      setBulkMarks([]);
      setBulkMode(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save bulk marks");
    }
  };

  const addBulkCandidate = (candidate) => {
    const existingIndex = bulkMarks.findIndex(m => m.candidateId === candidate.id);
    
    if (existingIndex >= 0) {
      alert("Candidate already added to bulk list");
      return;
    }

    const newMark = {
      candidateId: candidate.id,
      armyNo: candidate.armyNo,
      name: candidate.name,
      trade: candidate.trade.name,
      pr1: candidate.trade.pr1 ? "" : null,
      pr2: candidate.trade.pr2 ? "" : null,
      pr3: candidate.trade.pr3 ? "" : null,
      pr4: candidate.trade.pr4 ? "" : null,
      pr5: candidate.trade.pr5 ? "" : null,
      oral: candidate.trade.oral ? "" : null,
      bpet: "",
      ppt: "",
      cpt: "",
      gradeOverride: "",
      overallResult: ""
    };

    setBulkMarks([...bulkMarks, newMark]);
  };

  const NUMERIC_FIELDS = ["pr1", "pr2", "pr3", "pr4", "pr5", "oral"];

  const updateBulkMark = (index, field, value) => {
    const updated = [...bulkMarks];
    if (NUMERIC_FIELDS.includes(field)) {
      updated[index][field] = value === "" ? "" : parseFloat(value);
    } else {
      updated[index][field] = value;
    }
    setBulkMarks(updated);
  };

  const removeBulkCandidate = (index) => {
    setBulkMarks(bulkMarks.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="loading">Loading practical marks...</div>;
  }

  return (
    <div className="practical-marks-container">
      <div className="header">
        <h1>Practical Marks Management</h1>
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'individual' ? 'active' : ''}`}
            onClick={() => setActiveTab('individual')}
          >
            Individual Entry
          </button>
          <button 
            className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk')}
          >
            Bulk Entry
          </button>
          <button 
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
        </div>
      </div>

      {activeTab === 'individual' && (
        <div className="individual-entry">
          <div className="candidate-selection">
            <h2>Select Candidate</h2>
            <div className="candidate-list">
              {candidates.map(candidate => (
                <div 
                  key={candidate.id}
                  className={`candidate-card ${selectedCandidate?.id === candidate.id ? 'selected' : ''}`}
                  onClick={() => handleCandidateSelect(candidate)}
                >
                  <div className="candidate-info">
                    <span className="army-no">{candidate.armyNo}</span>
                    <span className="name">{candidate.name}</span>
                    <span className="trade">{candidate.trade.name}</span>
                  </div>
                  <div className="marks-status">
                    {candidate.practicalMarks ? (
                      <span className="has-marks">✓ Marks Entered</span>
                    ) : (
                      <span className="no-marks">No Marks</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedCandidate && (
            <div className="marks-form">
              <h2>Enter Marks for {selectedCandidate.name} ({selectedCandidate.armyNo})</h2>
              <p className="trade-info">Trade: {selectedCandidate.trade.name}</p>
              
              <form onSubmit={handleSubmit}>
                <div className="marks-grid">
                  {selectedCandidate.trade.pr1 && (
                    <div className="form-group">
                      <label>PR-I Marks</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={form.pr1}
                        onChange={(e) => setForm(prev => ({ ...prev, pr1: e.target.value }))}
                        placeholder="0-100"
                      />
                    </div>
                  )}

                  {selectedCandidate.trade.pr2 && (
                    <div className="form-group">
                      <label>PR-II Marks</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={form.pr2}
                        onChange={(e) => setForm(prev => ({ ...prev, pr2: e.target.value }))}
                        placeholder="0-100"
                      />
                    </div>
                  )}

                  {selectedCandidate.trade.pr3 && (
                    <div className="form-group">
                      <label>PR-III Marks</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={form.pr3}
                        onChange={(e) => setForm(prev => ({ ...prev, pr3: e.target.value }))}
                        placeholder="0-100"
                      />
                    </div>
                  )}

                  {selectedCandidate.trade.pr4 && (
                    <div className="form-group">
                      <label>PR-IV Marks</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={form.pr4}
                        onChange={(e) => setForm(prev => ({ ...prev, pr4: e.target.value }))}
                        placeholder="0-100"
                      />
                    </div>
                  )}

                  {selectedCandidate.trade.pr5 && (
                    <div className="form-group">
                      <label>PR-V Marks</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={form.pr5}
                        onChange={(e) => setForm(prev => ({ ...prev, pr5: e.target.value }))}
                        placeholder="0-100"
                      />
                    </div>
                  )}

                  {selectedCandidate.trade.oral && (
                    <div className="form-group">
                      <label>ORAL Marks</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={form.oral}
                        onChange={(e) => setForm(prev => ({ ...prev, oral: e.target.value }))}
                        placeholder="0-100"
                      />
                    </div>
                  )}
                </div>

                <div className="grading-section">
                  <h3>Physical Tests & Overrides</h3>
                  <div className="grading-grid">
                    <div className="form-group">
                      <label>BPET</label>
                      <select
                        value={form.bpet}
                        onChange={(e) => setForm(prev => ({ ...prev, bpet: e.target.value }))}
                      >
                        {PHYSICAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt || "Select option"}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>PPT</label>
                      <select
                        value={form.ppt}
                        onChange={(e) => setForm(prev => ({ ...prev, ppt: e.target.value }))}
                      >
                        {PHYSICAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt || "Select option"}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>CPT</label>
                      <select
                        value={form.cpt}
                        onChange={(e) => setForm(prev => ({ ...prev, cpt: e.target.value }))}
                      >
                        {PHYSICAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt || "Select option"}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Grade Override</label>
                      <select
                        value={form.gradeOverride}
                        onChange={(e) => setForm(prev => ({ ...prev, gradeOverride: e.target.value }))}
                      >
                        {GRADE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt || "None"}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Overall Result</label>
                      <select
                        value={form.overallResult}
                        onChange={(e) => setForm(prev => ({ ...prev, overallResult: e.target.value }))}
                      >
                        {RESULT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt || "Select result"}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Save Marks</button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setSelectedCandidate(null)}
                  >
                    Clear Selection
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="bulk-entry">
          <div className="bulk-header">
            <h2>Bulk Marks Entry</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setBulkMode(true)}
            >
              Add Candidates
            </button>
          </div>

          {bulkMode && (
            <div className="candidate-selection-modal">
              <div className="modal-content">
                <h3>Select Candidates for Bulk Entry</h3>
                <div className="modal-candidate-list">
                  {candidates.map(candidate => (
                    <div 
                      key={candidate.id}
                      className="modal-candidate-card"
                      onClick={() => addBulkCandidate(candidate)}
                    >
                      <span className="army-no">{candidate.armyNo}</span>
                      <span className="name">{candidate.name}</span>
                      <span className="trade">{candidate.trade.name}</span>
                    </div>
                  ))}
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setBulkMode(false)}
                >
                  Done Adding
                </button>
              </div>
            </div>
          )}

          {bulkMarks.length > 0 && (
            <div className="bulk-table-container">
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th>Army No</th>
                    <th>Name</th>
                    <th>Trade</th>
                    <th>PR-I</th>
                    <th>PR-II</th>
                    <th>PR-III</th>
                    <th>PR-IV</th>
                    <th>PR-V</th>
                    <th>ORAL</th>
                    <th>BPET</th>
                    <th>PPT</th>
                    <th>CPT</th>
                    <th>Grade Override</th>
                    <th>Overall Result</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkMarks.map((mark, index) => (
                    <tr key={index}>
                      <td>{mark.armyNo}</td>
                      <td>{mark.name}</td>
                      <td>{mark.trade}</td>
                      <td>
                        {mark.pr1 !== null && (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={mark.pr1}
                            onChange={(e) => updateBulkMark(index, 'pr1', e.target.value)}
                            placeholder="0-100"
                          />
                        )}
                      </td>
                      <td>
                        {mark.pr2 !== null && (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={mark.pr2}
                            onChange={(e) => updateBulkMark(index, 'pr2', e.target.value)}
                            placeholder="0-100"
                          />
                        )}
                      </td>
                      <td>
                        {mark.pr3 !== null && (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={mark.pr3}
                            onChange={(e) => updateBulkMark(index, 'pr3', e.target.value)}
                            placeholder="0-100"
                          />
                        )}
                      </td>
                      <td>
                        {mark.pr4 !== null && (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={mark.pr4}
                            onChange={(e) => updateBulkMark(index, 'pr4', e.target.value)}
                            placeholder="0-100"
                          />
                        )}
                      </td>
                      <td>
                        {mark.pr5 !== null && (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={mark.pr5}
                            onChange={(e) => updateBulkMark(index, 'pr5', e.target.value)}
                            placeholder="0-100"
                          />
                        )}
                      </td>
                      <td>
                        {mark.oral !== null && (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={mark.oral}
                            onChange={(e) => updateBulkMark(index, 'oral', e.target.value)}
                            placeholder="0-100"
                          />
                        )}
                      </td>
                      <td>
                        <select
                          value={mark.bpet}
                          onChange={(e) => updateBulkMark(index, 'bpet', e.target.value)}
                        >
                          {PHYSICAL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt || "Select"}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={mark.ppt}
                          onChange={(e) => updateBulkMark(index, 'ppt', e.target.value)}
                        >
                          {PHYSICAL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt || "Select"}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={mark.cpt}
                          onChange={(e) => updateBulkMark(index, 'cpt', e.target.value)}
                        >
                          {PHYSICAL_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt || "Select"}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={mark.gradeOverride}
                          onChange={(e) => updateBulkMark(index, 'gradeOverride', e.target.value)}
                        >
                          {GRADE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt || "Select"}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={mark.overallResult}
                          onChange={(e) => updateBulkMark(index, 'overallResult', e.target.value)}
                        >
                          {RESULT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt || "Select"}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => removeBulkCandidate(index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bulk-actions">
                <button className="btn btn-primary" onClick={handleBulkSubmit}>
                  Save All Marks ({bulkMarks.length} candidates)
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setBulkMarks([])}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="summary-view">
          <h2>Practical Marks Summary by Trade</h2>
          
          {summary.length === 0 ? (
            <div className="empty-state">
              <p>No practical marks data available</p>
            </div>
          ) : (
            <div className="summary-grid">
              {summary.map(trade => (
                <div key={trade.tradeName} className="summary-card">
                  <h3>{trade.tradeName}</h3>
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="label">Total Candidates:</span>
                      <span className="value">{trade.totalCandidates}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Marks Submitted:</span>
                      <span className="value">{trade.practicalMarksSubmitted}</span>
                    </div>
                  </div>
                  
                  <div className="marks-breakdown">
                    {trade.pr1.count > 0 && (
                      <div className="mark-stat">
                        <span className="exam-type">PR-I:</span>
                        <span className="avg-marks">{trade.pr1.average.toFixed(1)}</span>
                        <span className="count">({trade.pr1.count} candidates)</span>
                      </div>
                    )}
                    {trade.pr2.count > 0 && (
                      <div className="mark-stat">
                        <span className="exam-type">PR-II:</span>
                        <span className="avg-marks">{trade.pr2.average.toFixed(1)}</span>
                        <span className="count">({trade.pr2.count} candidates)</span>
                      </div>
                    )}
                    {trade.pr3.count > 0 && (
                      <div className="mark-stat">
                        <span className="exam-type">PR-III:</span>
                        <span className="avg-marks">{trade.pr3.average.toFixed(1)}</span>
                        <span className="count">({trade.pr3.count} candidates)</span>
                      </div>
                    )}
                    {trade.pr4.count > 0 && (
                      <div className="mark-stat">
                        <span className="exam-type">PR-IV:</span>
                        <span className="avg-marks">{trade.pr4.average.toFixed(1)}</span>
                        <span className="count">({trade.pr4.count} candidates)</span>
                      </div>
                    )}
                    {trade.pr5.count > 0 && (
                      <div className="mark-stat">
                        <span className="exam-type">PR-V:</span>
                        <span className="avg-marks">{trade.pr5.average.toFixed(1)}</span>
                        <span className="count">({trade.pr5.count} candidates)</span>
                      </div>
                    )}
                    {trade.oral.count > 0 && (
                      <div className="mark-stat">
                        <span className="exam-type">ORAL:</span>
                        <span className="avg-marks">{trade.oral.average.toFixed(1)}</span>
                        <span className="count">({trade.oral.count} candidates)</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
