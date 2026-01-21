import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import "./ExamSlots.css";

const EMPTY_FORM = {
  tradeId: "",
  paperType: "",
  examPaperId: "",
  startTime: "",
  endTime: "",
  maxCandidates: 50,
  location: "",
  instructions: "",
  password: "",
  isActive: true
};

const PAPER_TYPE_FIELDS = [
  { field: "wp1", value: "WP-I", label: "WP-I (Written Paper I)" },
  { field: "wp2", value: "WP-II", label: "WP-II (Written Paper II)" },
  { field: "wp3", value: "WP-III", label: "WP-III (Written Paper III)" },
  { field: "pr1", value: "PR-I", label: "PR-I (Practical I)" },
  { field: "pr2", value: "PR-II", label: "PR-II (Practical II)" },
  { field: "pr3", value: "PR-III", label: "PR-III (Practical III)" },
  { field: "pr4", value: "PR-IV", label: "PR-IV (Practical IV)" },
  { field: "pr5", value: "PR-V", label: "PR-V (Practical V)" },
  { field: "oral", value: "ORAL", label: "ORAL" }
];

export default function ExamSlots() {
  const [slots, setSlots] = useState([]);
  const [trades, setTrades] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [paperMessage, setPaperMessage] = useState("");
  const [checkingPaper, setCheckingPaper] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [slotsRes, mastersRes] = await Promise.all([
        api.get("/exam-slot"),
        api.get("/admin/masters")
      ]);

      setSlots(Array.isArray(slotsRes.data) ? slotsRes.data : []);
      setTrades(Array.isArray(mastersRes.data?.trades) ? mastersRes.data.trades : []);
    } catch (err) {
      console.error("Failed to load exam slots", err);
      setError(err.response?.data?.error || "Failed to load exam slots");
    } finally {
      setLoading(false);
    }
  };

  const selectedTrade = useMemo(
    () => trades.find((trade) => trade.id === Number(form.tradeId)),
    [trades, form.tradeId]
  );

  const paperTypeOptions = useMemo(() => {
    if (!selectedTrade) return [];
    return PAPER_TYPE_FIELDS.filter(({ field }) => Boolean(selectedTrade[field]));
  }, [selectedTrade]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingSlot(null);
    setPaperMessage("");
    setCheckingPaper(false);
    setError("");
  };

  const handleTradeChange = (tradeId) => {
    setForm((prev) => ({
      ...prev,
      tradeId,
      paperType: "",
      examPaperId: ""
    }));
    setPaperMessage("");
  };

  const handlePaperTypeChange = async (paperType) => {
    setForm((prev) => ({ ...prev, paperType, examPaperId: "" }));
    setPaperMessage("");

    if (!paperType || !form.tradeId) {
      return;
    }

    setCheckingPaper(true);
    try {
      const res = await api.get(`/exam/paper/${form.tradeId}/${paperType}`);
      if (res.data?.id) {
        setForm((prev) => ({ ...prev, examPaperId: res.data.id }));
        const questionCount = Array.isArray(res.data.questions) ? res.data.questions.length : 0;
        const title = res.data.title || `${paperType} Paper`;
        setPaperMessage(`${title} • ${questionCount} questions`);
      } else if (res.data?.status === "NA") {
        setPaperMessage("No active exam paper uploaded for the selected trade and paper type.");
      } else {
        setPaperMessage("Unable to verify exam paper for the selected trade.");
      }
    } catch (err) {
      console.error("Failed to load exam paper", err);
      setPaperMessage("Failed to load exam paper. Please ensure a paper is uploaded.");
    } finally {
      setCheckingPaper(false);
    }
  };

  const handleEdit = (slot) => {
    setEditingSlot(slot);
    setShowForm(true);

    setForm({
      tradeId: String(slot.tradeId ?? ""),
      paperType: slot.paperType || "",
      examPaperId: slot.examPaperId ? String(slot.examPaperId) : "",
      startTime: formatDateTimeLocal(slot.startTime),
      endTime: formatDateTimeLocal(slot.endTime),
      maxCandidates: slot.maxCandidates || 50,
      location: slot.location || "",
      instructions: slot.instructions || "",
      password: slot.password || "",
      isActive: Boolean(slot.isActive)
    });

    if (slot.examPaper?.title) {
      const questionCount = Array.isArray(slot.examPaper.questions)
        ? slot.examPaper.questions.length
        : slot.examPaper?.questionCount || 0;
      setPaperMessage(`${slot.examPaper.title} • ${questionCount} questions`);
    } else {
      setPaperMessage("");
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm("Delete this exam slot?")) return;

    try {
      await api.delete(`/exam-slot/${slotId}`);
      await fetchData();
    } catch (err) {
      console.error("Failed to delete slot", err);
      setError(err.response?.data?.error || "Failed to delete exam slot");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.tradeId || !form.paperType || !form.startTime || !form.endTime) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      tradeId: Number(form.tradeId),
      paperType: form.paperType,
      examPaperId: form.examPaperId ? Number(form.examPaperId) : null,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
      maxCandidates: Number(form.maxCandidates) || 0,
      location: form.location,
      instructions: form.instructions,
      password: form.password,
      isActive: Boolean(form.isActive)
    };

    try {
      if (editingSlot?.id) {
        await api.put(`/exam-slot/${editingSlot.id}`, payload);
      } else {
        await api.post("/exam-slot", payload);
      }

      await fetchData();
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("Failed to save exam slot", err);
      setError(err.response?.data?.error || "Failed to save exam slot");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading exam slots…</div>;
  }

  return (
    <div className="exam-slots-page">
      <div className="slots-header">
        <h2>Exam Slots Management</h2>
        <button
          className="add-slot-btn"
          onClick={() => {
            setShowForm(true);
            resetForm();
          }}
        >
          + Create New Slot
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="slot-form-overlay">
          <div className="slot-form">
            <h3>{editingSlot ? "Edit Exam Slot" : "Create Exam Slot"}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Trade *</label>
                  <select
                    value={form.tradeId}
                    onChange={(e) => handleTradeChange(e.target.value)}
                    required
                  >
                    <option value="">Select Trade</option>
                    {trades.map((trade) => (
                      <option key={trade.id} value={trade.id}>
                        {trade.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Paper Type *</label>
                  <select
                    value={form.paperType}
                    onChange={(e) => handlePaperTypeChange(e.target.value)}
                    required
                    disabled={!form.tradeId}
                  >
                    <option value="">Select Paper Type</option>
                    {paperTypeOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {checkingPaper && <p className="hint">Checking available paper…</p>}
                  {paperMessage && !checkingPaper && (
                    <p className="hint">{paperMessage}</p>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Candidates *</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={form.maxCandidates}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxCandidates: Number(e.target.value) }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text"
                    placeholder="e.g., Exam Hall A"
                    value={form.location}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Instructions</label>
                  <textarea
                    placeholder="Special instructions for candidates"
                    value={form.instructions}
                    onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Exam Password</label>
                  <input
                    type="password"
                    placeholder="Optional password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>

                <div className="form-group inline-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Active Slot
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingSlot ? "Update Slot" : "Create Slot"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="slots-list">
        {slots.length === 0 ? (
          <div className="no-slots">
            <h3>No Exam Slots Found</h3>
            <p>Create your first exam slot to get started.</p>
          </div>
        ) : (
          <div className="slots-grid">
            {slots.map((slot) => (
              <div key={slot.id} className={`slot-card ${slot.isActive ? "active" : "inactive"}`}>
                <div className="slot-header">
                  <h4>{slot.trade?.name || "Unknown Trade"}</h4>
                  <span className={`status ${slot.isActive ? "active" : "inactive"}`}>
                    {slot.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="slot-details">
                  <p><strong>Paper Type:</strong> {slot.paperType}</p>
                  <p><strong>Exam Paper:</strong> {slot.examPaper?.title || "Not linked"}</p>
                  <p><strong>Questions:</strong> {slot.examPaper?.questionCount ?? slot.examPaper?.questions?.length ?? 0}</p>
                  <p><strong>Start:</strong> {new Date(slot.startTime).toLocaleString()}</p>
                  <p><strong>End:</strong> {new Date(slot.endTime).toLocaleString()}</p>
                  <p><strong>Location:</strong> {slot.location || "—"}</p>
                  <p><strong>Capacity:</strong> {slot.currentCount || 0} / {slot.maxCandidates}</p>
                  {slot.password && <p><strong>🔒 Password Protected</strong></p>}
                </div>

                {slot.instructions && (
                  <div className="slot-instructions">
                    <strong>Instructions:</strong>
                    <p>{slot.instructions}</p>
                  </div>
                )}

                <div className="slot-actions">
                  <button onClick={() => handleEdit(slot)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(slot.id)}>
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

function formatDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const iso = date.toISOString();
  return iso.slice(0, 16);
}
