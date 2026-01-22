import { useEffect, useState } from "react";
import api from "../api/api";
import "./ExamOfficer.css";

export default function ExamOfficer() {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [examType, setExamType] = useState("");
  const [marks, setMarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    try {
      const res = await api.get("/practical/candidates");
      setCandidates(res.data);
    } catch (error) {
      console.error("Error loading candidates:", error);
      alert("Failed to load candidates");
    }
  };

  const handleCandidateSelect = (candidateId) => {
    const candidate = candidates.find(c => c.id === Number(candidateId));
    setSelectedCandidate(candidate);
    setMarks("");
    setExamType("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCandidate || !examType || marks === "") {
      setMessage("Please fill all fields");
      return;
    }

    const marksValue = parseFloat(marks);
    if (isNaN(marksValue) || marksValue < 0) {
      setMessage("Please enter a valid marks value");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Get admin ID from token (or use a default)
      const token = localStorage.getItem("token");
      const adminId = 1; // This should come from decoded token in a real app

      await api.post("/practical/submit", {
        candidateId: selectedCandidate.id,
        examType,
        marks: marksValue,
        enteredBy: adminId
      });

      setMessage("✓ Practical marks saved successfully!");
      setMarks("");
      setExamType("");
      
      // Reload candidates to get updated marks
      loadCandidates();
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || "Failed to save marks");
    } finally {
      setLoading(false);
    }
  };

  const getPracticalMarks = (candidate) => {
    if (!candidate.practicalMarks) return null;
    return candidate.practicalMarks;
  };

  const examTypes = [
    { value: "PR-I", label: "PR-I" },
    { value: "PR-II", label: "PR-II" },
    { value: "PR-III", label: "PR-III" },
    { value: "PR-IV", label: "PR-IV" },
    { value: "PR-V", label: "PR-V" },
    { value: "ORAL", label: "ORAL" }
  ];

  return (
    <div className="exam-officer-page">
      <div className="exam-officer-container">
        <h1>Exam Officer - Practical Marks Entry</h1>

        <div className="officer-content">
          {/* Candidate Selection */}
          <div className="candidate-selection-section">
            <h2>Select Candidate</h2>
            <div className="candidate-search">
              <select
                value={selectedCandidate?.id || ""}
                onChange={(e) => handleCandidateSelect(e.target.value)}
              >
                <option value="">– Select Candidate by Army No –</option>
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.armyNo} - {c.name} ({c.rank.name}, {c.trade.name})
                  </option>
                ))}
              </select>
            </div>

            {selectedCandidate && (
              <div className="candidate-info">
                <h3>Candidate Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Army No:</label>
                    <span>{selectedCandidate.armyNo}</span>
                  </div>
                  <div className="info-item">
                    <label>Name:</label>
                    <span>{selectedCandidate.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Rank:</label>
                    <span>{selectedCandidate.rank.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Trade:</label>
                    <span>{selectedCandidate.trade.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Unit:</label>
                    <span>{selectedCandidate.unit}</span>
                  </div>
                  <div className="info-item">
                    <label>Command:</label>
                    <span>{selectedCandidate.command.name}</span>
                  </div>
                </div>

                {/* Current Practical Marks */}
                <div className="current-marks">
                  <h4>Current Practical Marks</h4>
                  <div className="marks-grid">
                    {examTypes.map(exam => {
                      const practicalMarks = getPracticalMarks(selectedCandidate);
                      const value = practicalMarks && practicalMarks[exam.value.toLowerCase().replace("-", "")];
                      return (
                        <div key={exam.value} className="mark-item">
                          <label>{exam.label}:</label>
                          <span>{value !== null && value !== undefined ? value : "N/A"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Marks Entry Form */}
          {selectedCandidate && (
            <div className="marks-entry-section">
              <h2>Enter Practical Marks</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Exam Type *</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    required
                  >
                    <option value="">– Select Exam Type –</option>
                    {examTypes.map(exam => (
                      <option key={exam.value} value={exam.value}>{exam.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Marks *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder="Enter marks"
                    required
                  />
                </div>

                {message && (
                  <div className={`message ${message.startsWith("✓") ? "success" : "error"}`}>
                    {message}
                  </div>
                )}

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? "Saving..." : "Save Marks"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
