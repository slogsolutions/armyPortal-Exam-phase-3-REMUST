import { useEffect, useState } from "react";
import api from "../api/api";
import "./PracticalMarks.css";

export default function PracticalMarks() {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [trades, setTrades] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('individual');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkMarks, setBulkMarks] = useState([]);
  const [form, setForm] = useState({
    pr1: "",
    pr2: "",
    pr3: "",
    pr4: "",
    pr5: "",
    oral: ""
  });

  useEffect(() => {
    fetchData();
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
      setLoading(false);
    }
  };

  const handleCandidateSelect = (candidate) => {
    setSelectedCandidate(candidate);
    setForm({
      pr1: candidate.practicalMarks?.pr1 || "",
      pr2: candidate.practicalMarks?.pr2 || "",
      pr3: candidate.practicalMarks?.pr3 || "",
      pr4: candidate.practicalMarks?.pr4 || "",
      pr5: candidate.practicalMarks?.pr5 || "",
      oral: candidate.practicalMarks?.oral || ""
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCandidate) {
      alert("Please select a candidate");
      return;
    }

    try {
      const adminId = localStorage.getItem('adminId');
      if (!adminId) {
        alert("Admin session not found. Please login again.");
        return;
      }

      // Submit each practical mark
      const trade = selectedCandidate.trade;
      const promises = [];

      if (trade.pr1 && form.pr1 !== "") {
        promises.push(api.post("/practical/submit", {
          candidateId: selectedCandidate.id,
          examType: "PR-I",
          marks: parseFloat(form.pr1),
          enteredBy: adminId
        }));
      }

      if (trade.pr2 && form.pr2 !== "") {
        promises.push(api.post("/practical/submit", {
          candidateId: selectedCandidate.id,
          examType: "PR-II",
          marks: parseFloat(form.pr2),
          enteredBy: adminId
        }));
      }

      if (trade.pr3 && form.pr3 !== "") {
        promises.push(api.post("/practical/submit", {
          candidateId: selectedCandidate.id,
          examType: "PR-III",
          marks: parseFloat(form.pr3),
          enteredBy: adminId
        }));
      }

      if (trade.pr4 && form.pr4 !== "") {
        promises.push(api.post("/practical/submit", {
          candidateId: selectedCandidate.id,
          examType: "PR-IV",
          marks: parseFloat(form.pr4),
          enteredBy: adminId
        }));
      }

      if (trade.pr5 && form.pr5 !== "") {
        promises.push(api.post("/practical/submit", {
          candidateId: selectedCandidate.id,
          examType: "PR-V",
          marks: parseFloat(form.pr5),
          enteredBy: adminId
        }));
      }

      if (trade.oral && form.oral !== "") {
        promises.push(api.post("/practical/submit", {
          candidateId: selectedCandidate.id,
          examType: "ORAL",
          marks: parseFloat(form.oral),
          enteredBy: adminId
        }));
      }

      await Promise.all(promises);
      alert("Practical marks saved successfully!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save practical marks");
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkMarks.length === 0) {
      alert("Please add at least one candidate");
      return;
    }

    try {
      const adminId = localStorage.getItem('adminId');
      if (!adminId) {
        alert("Admin session not found. Please login again.");
        return;
      }

      const response = await api.post("/practical/bulk-submit", {
        marks: bulkMarks,
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
      oral: candidate.trade.oral ? "" : null
    };

    setBulkMarks([...bulkMarks, newMark]);
  };

  const updateBulkMark = (index, field, value) => {
    const updated = [...bulkMarks];
    updated[index][field] = value === "" ? "" : parseFloat(value);
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
