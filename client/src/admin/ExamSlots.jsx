import { useEffect, useState } from "react";
import api from "../api/api";
import "./ExamSlots.css";

export default function ExamSlots() {
  const [slots, setSlots] = useState([]);
  const [trades, setTrades] = useState([]);
  const [papers, setPapers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    tradeId: "",
    examPaperId: "",
    paperType: "",
    startTime: "",
    endTime: "",
    maxCandidates: 50,
    location: "",
    instructions: "",
    password: "",
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [slotsRes, mastersRes, candidatesRes] = await Promise.all([
        api.get("/exam-slot/all"),
        api.get("/admin/masters"),
        api.get("/admin/candidates")
      ]);

      setSlots(slotsRes.data || []);
      setTrades(mastersRes.data?.trades || []);
      setCandidates(candidatesRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setLoading(false);
    }
  };

  const handleTradeChange = (tradeId) => {
    setForm(prev => ({ ...prev, tradeId, examPaperId: "", paperType: "" }));
    
    // Get papers for this trade
    api.get(`/exam/papers/trade/${tradeId}`)
      .then(res => setPapers(res.data || []))
      .catch(() => setPapers([]));
  };

  const handlePaperChange = (examPaperId) => {
    const selectedPaper = papers.find(p => p.id === Number(examPaperId));
    if (selectedPaper) {
      setForm(prev => ({ 
        ...prev, 
        examPaperId, 
        paperType: selectedPaper.paperType 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingSlot) {
        await api.put(`/exam-slot/${editingSlot.id}`, form);
        alert("Exam slot updated successfully!");
      } else {
        await api.post("/exam-slot/create", form);
        alert("Exam slot created successfully!");
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to save exam slot");
    }
  };

  const handleEdit = (slot) => {
    setEditingSlot(slot);
    setForm({
      tradeId: slot.tradeId,
      examPaperId: slot.examPaperId || "",
      paperType: slot.paperType,
      startTime: new Date(slot.startTime).toISOString().slice(0, 16),
      endTime: new Date(slot.endTime).toISOString().slice(0, 16),
      maxCandidates: slot.maxCandidates,
      location: slot.location || "",
      instructions: slot.instructions || "",
      password: slot.password || "",
      isActive: slot.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (slotId) => {
    if (!confirm("Are you sure you want to delete this exam slot?")) return;
    
    try {
      await api.delete(`/exam-slot/${slotId}`);
      alert("Exam slot deleted successfully!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to delete exam slot");
    }
  };

  const resetForm = () => {
    setForm({
      tradeId: "",
      examPaperId: "",
      paperType: "",
      startTime: "",
      endTime: "",
      maxCandidates: 50,
      location: "",
      instructions: "",
      password: "",
      isActive: true
    });
    setEditingSlot(null);
    setShowForm(false);
    setPapers([]);
  };

  const assignCandidates = async (slotId) => {
    const selectedCandidates = prompt(
      "Enter candidate IDs (comma-separated):"
    );
    
    if (!selectedCandidates) return;
    
    try {
      const candidateIds = selectedCandidates.split(',').map(id => id.trim()).filter(id => id);
      await api.post(`/exam-slot/${slotId}/assign-candidates`, { candidateIds });
      alert("Candidates assigned successfully!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to assign candidates");
    }
  };

  if (loading) {
    return <div className="loading">Loading exam slots...</div>;
  }

  return (
    <div className="exam-slots-container">
      <div className="header">
        <h1>Exam Slot Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Create New Slot
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingSlot ? "Edit Exam Slot" : "Create Exam Slot"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Trade *</label>
                  <select
                    value={form.tradeId}
                    onChange={(e) => handleTradeChange(e.target.value)}
                    required
                  >
                    <option value="">Select Trade</option>
                    {trades.map(trade => (
                      <option key={trade.id} value={trade.id}>
                        {trade.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Paper Type *</label>
                  <select
                    value={form.examPaperId}
                    onChange={(e) => handlePaperChange(e.target.value)}
                    required
                    disabled={!form.tradeId}
                  >
                    <option value="">Select Paper</option>
                    {papers.map(paper => (
                      <option key={paper.id} value={paper.id}>
                        {paper.paperType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Max Candidates</label>
                  <input
                    type="number"
                    value={form.maxCandidates}
                    onChange={(e) => setForm(prev => ({ ...prev, maxCandidates: Number(e.target.value) }))}
                    min="1"
                    max="200"
                  />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Exam location/center"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Instructions</label>
                  <textarea
                    value={form.instructions}
                    onChange={(e) => setForm(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder="Special instructions for this slot"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Password (for encrypted files)</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Optional password"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingSlot ? "Update Slot" : "Create Slot"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="slots-list">
        <h2>Exam Slots ({slots.length})</h2>
        
        {slots.length === 0 ? (
          <div className="empty-state">
            <p>No exam slots found. Create your first slot to get started.</p>
          </div>
        ) : (
          <div className="slots-grid">
            {slots.map(slot => (
              <div key={slot.id} className="slot-card">
                <div className="slot-header">
                  <h3>{slot.paperType}</h3>
                  <span className={`status-badge ${slot.isActive ? 'active' : 'inactive'}`}>
                    {slot.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="slot-details">
                  <p><strong>Trade:</strong> {slot.trade?.name}</p>
                  <p><strong>Start:</strong> {new Date(slot.startTime).toLocaleString()}</p>
                  <p><strong>End:</strong> {new Date(slot.endTime).toLocaleString()}</p>
                  <p><strong>Candidates:</strong> {slot.currentCount}/{slot.maxCandidates}</p>
                  {slot.location && <p><strong>Location:</strong> {slot.location}</p>}
                  {slot.password && <p><strong>🔒 Password Protected</strong></p>}
                </div>

                <div className="slot-actions">
                  <button 
                    className="btn btn-sm btn-info"
                    onClick={() => assignCandidates(slot.id)}
                  >
                    Assign Candidates
                  </button>
                  <button 
                    className="btn btn-sm btn-warning"
                    onClick={() => handleEdit(slot)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(slot.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
