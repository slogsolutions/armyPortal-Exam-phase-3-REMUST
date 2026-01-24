import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import "./ExamSlots.css";

const EMPTY_FORM = {
  commandId: "",
  centerId: "",
  tradeId: "",
  paperType: "",
  startTime: "",
  endTime: "",
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
  const [commands, setCommands] = useState([]);
  const [centers, setCenters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [paperMessage, setPaperMessage] = useState("");
  const [checkingPaper, setCheckingPaper] = useState(false);
  const [filters, setFilters] = useState({ commandId: "", tradeId: "", status: "" });

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
      setCommands(Array.isArray(mastersRes.data?.commands) ? mastersRes.data.commands : []);
      setCenters(Array.isArray(mastersRes.data?.centers) ? mastersRes.data.centers : []);
    } catch (err) {
      console.error("Failed to load exam slots", err);
      setError(err.response?.data?.error || "Failed to load exam slots");
    } finally {
      setLoading(false);
    }
  };

  const selectedCommand = useMemo(
    () => commands.find((command) => command.id === Number(form.commandId)),
    [commands, form.commandId]
  );

  const filteredCenters = useMemo(() => {
    if (!form.commandId) return [];
    return centers.filter((center) => center.commandId === Number(form.commandId));
  }, [centers, form.commandId]);

  const selectedTrade = useMemo(
    () => trades.find((trade) => trade.id === Number(form.tradeId)),
    [trades, form.tradeId]
  );

  const paperTypeOptions = useMemo(() => {
    if (!selectedTrade) return [];
    return PAPER_TYPE_FIELDS.filter(({ field }) => Boolean(selectedTrade[field]));
  }, [selectedTrade]);

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      const matchesCommand = filters.commandId
        ? Number(filters.commandId) === Number(slot.commandId || slot.command?.id)
        : true;
      const matchesTrade = filters.tradeId
        ? Number(filters.tradeId) === Number(slot.tradeId)
        : true;
      const matchesStatus = filters.status
        ? filters.status === (slot.isActive ? "active" : "inactive")
        : true;
      return matchesCommand && matchesTrade && matchesStatus;
    });
  }, [slots, filters]);

  const activeCount = useMemo(() => filteredSlots.filter((slot) => slot.isActive).length, [filteredSlots]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingSlot(null);
    setPaperMessage("");
    setCheckingPaper(false);
    setError("");
  };

  const handleCommandChange = (commandId) => {
    setForm((prev) => ({
      ...prev,
      commandId,
      centerId: "",
      tradeId: "",
      paperType: ""
    }));
    setPaperMessage("");
  };

  const handleTradeChange = (tradeId) => {
    setForm((prev) => ({
      ...prev,
      tradeId,
      paperType: ""
    }));
    setPaperMessage("");
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => setFilters({ commandId: "", tradeId: "", status: "" });

  const handlePaperTypeChange = async (paperType) => {
    setForm((prev) => ({ ...prev, paperType }));
    setPaperMessage("");

    if (!paperType || !form.tradeId) {
      return;
    }

    setCheckingPaper(true);
    try {
      const res = await api.get(`/exam/paper/${form.tradeId}/${paperType}`);
      if (res.data?.questions?.length > 0) {
        const questionCount = res.data.questions.length;
        setPaperMessage(`${questionCount} questions available`);
      } else if (res.data?.status === "NA") {
        setPaperMessage("No question bank uploaded for the selected trade and paper type.");
      } else {
        const questionCount = Array.isArray(res.data?.questions)
          ? res.data.questions.length
          : res.data?._count?.questions;
        if (typeof questionCount === "number" && questionCount > 0) {
          setPaperMessage(`${questionCount} questions available`);
        } else {
          setPaperMessage("Unable to verify question availability for the selected trade.");
        }
      }
    } catch (err) {
      console.error("Failed to load exam paper", err);
      setPaperMessage("Failed to load questions. Please ensure a question bank is uploaded.");
    } finally {
      setCheckingPaper(false);
    }
  };

  const handleToggleStatus = async (slotId, currentStatus) => {
    try {
      const res = await api.patch(`/exam-slot/${slotId}/toggle-status`);
      
      // Update the slot in the local state
      setSlots(prevSlots => 
        prevSlots.map(slot => 
          slot.id === slotId 
            ? { ...slot, isActive: !currentStatus }
            : slot
        )
      );
      
      // Show success message briefly
      setError("");
      const message = res.data.message || `Slot ${!currentStatus ? 'activated' : 'deactivated'} successfully`;
      
      // You could add a success message state if needed
      console.log(message);
      
    } catch (err) {
      console.error("Failed to toggle slot status", err);
      setError(err.response?.data?.error || "Failed to toggle slot status");
    }
  };

  const handleEdit = (slot) => {
    setEditingSlot(slot);
    setShowForm(true);

    setForm({
      commandId: String(slot.commandId ?? slot.command?.id ?? ""),
      centerId: String(slot.centerId ?? slot.center?.id ?? ""),
      tradeId: String(slot.tradeId ?? ""),
      paperType: slot.paperType || "",
      startTime: formatDateTimeLocal(slot.startTime),
      endTime: formatDateTimeLocal(slot.endTime),
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
    if (!form.commandId || !form.centerId || !form.tradeId || !form.paperType || !form.startTime || !form.endTime) {
      setError("Please complete all required fields.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      commandId: Number(form.commandId),
      centerId: Number(form.centerId),
      tradeId: Number(form.tradeId),
      paperType: form.paperType,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
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

      <div className="slots-filter-bar">
        <select
          value={filters.commandId}
          onChange={(e) => handleFilterChange("commandId", e.target.value)}
        >
          <option value="">All Commands</option>
          {commands.map((command) => (
            <option key={command.id} value={command.id}>
              {command.name}
            </option>
          ))}
        </select>

        <select
          value={filters.tradeId}
          onChange={(e) => handleFilterChange("tradeId", e.target.value)}
        >
          <option value="">All Trades</option>
          {trades.map((trade) => (
            <option key={trade.id} value={trade.id}>
              {trade.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button type="button" className="ghost-btn" onClick={clearFilters}>
          Reset Filters
        </button>
      </div>

      {showForm && (
        <div className="slot-form-overlay">
          <div className="slot-form">
            <h3>{editingSlot ? "Edit Exam Slot" : "Create Exam Slot"}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Command *</label>
                  <select
                    value={form.commandId}
                    onChange={(e) => handleCommandChange(e.target.value)}
                    required
                  >
                    <option value="">Select Command</option>
                    {commands.map((command) => (
                      <option key={command.id} value={command.id}>
                        {command.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Conducting Center *</label>
                  <select
                    value={form.centerId}
                    onChange={(e) => setForm((prev) => ({ ...prev, centerId: e.target.value }))}
                    required
                    disabled={!form.commandId}
                  >
                    <option value="">Select Center</option>
                    {filteredCenters.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Trade *</label>
                  <select
                    value={form.tradeId}
                    onChange={(e) => handleTradeChange(e.target.value)}
                    required
                    disabled={!form.commandId}
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

      <div className="slots-table-card">
        <div className="slots-table-meta">
          <span>{filteredSlots.length} slots</span>
          <span>{activeCount} active</span>
        </div>

        {filteredSlots.length === 0 ? (
          <div className="no-slots">
            <h3>No Exam Slots Found</h3>
            <p>Adjust filters or create a new slot to get started.</p>
          </div>
        ) : (
          <div className="slots-table-wrapper">
            <table className="slots-table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Command / Center</th>
                  <th>Paper & Questions</th>
                  <th>Window</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td>
                      <div className="slot-name">{slot.trade?.name || "Unknown Trade"}</div>
                      <div className="slot-subtitle">{slot.paperType || "—"}</div>
                    </td>
                    <td>
                      <div className="slot-meta">{slot.command?.name || "—"}</div>
                      <div className="slot-meta">{slot.center?.name || "—"}</div>
                    </td>
                    <td>
                      <span className="paper-type-pill">{slot.paperType || "—"}</span>
                      <span className="question-pill">{slot.questionCount ?? 0} Qs</span>
                    </td>
                    <td>
                      <div className="slot-meta">{formatDateTime(slot.startTime)}</div>
                      <div className="slot-meta">→ {formatDateTime(slot.endTime)}</div>
                    </td>
                    <td>
                      <div className="status-row">
                        <span className={`status-chip ${slot.isActive ? "active" : "inactive"}`}>
                          {slot.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          type="button"
                          className={`toggle-btn ${slot.isActive ? "active" : "inactive"}`}
                          onClick={() => handleToggleStatus(slot.id, slot.isActive)}
                          title={slot.isActive ? "Deactivate slot" : "Activate slot"}
                        >
                          {slot.isActive ? "🟢" : "🔴"}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="slot-actions">
                        <button type="button" className="ghost-btn" onClick={() => handleEdit(slot)}>
                          Edit
                        </button>
                        <button type="button" className="danger-btn" onClick={() => handleDelete(slot.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
