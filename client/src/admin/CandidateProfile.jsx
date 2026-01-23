import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import "./CandidateProfile.css";

const EXAM_DISPLAY_NAMES = {
  "WP-I": "WP-I",
  "WP-II": "WP-II", 
  "WP-III": "WP-III",
  "PR-I": "PR-I",
  "PR-II": "PR-II",
  "PR-III": "PR-III",
  "PR-IV": "PR-IV",
  "PR-V": "PR-V",
  ORAL: "ORAL",
};

const TRADE_EXAM_FLAGS = [
  { flag: "wp1", label: "WP-I" },
  { flag: "wp2", label: "WP-II" },
  { flag: "wp3", label: "WP-III" },
  { flag: "pr1", label: "PR-I" },
  { flag: "pr2", label: "PR-II" },
  { flag: "pr3", label: "PR-III" },
  { flag: "pr4", label: "PR-IV" },
  { flag: "pr5", label: "PR-V" },
  { flag: "oral", label: "ORAL" },
];

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const getAttemptSortTimestamp = (attempt = {}) => {
  const candidates = [attempt.submittedAt, attempt.startedAt, attempt.updatedAt, attempt.createdAt];
  for (const value of candidates) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) {
      return time;
    }
  }
  return 0;
};

const tradeExamTypes = (trade) => {
  if (!trade) return [];
  return TRADE_EXAM_FLAGS.filter(({ flag }) => trade[flag]).map(({ label }) => label);
};

export default function CandidateProfile() {
  const navigate = useNavigate();
  const { candidateId } = useParams();
  const [masters, setMasters] = useState({ ranks: [], trades: [], commands: [], centers: [] });
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});
  const [slotOptions, setSlotOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reassigningId, setReassigningId] = useState(null);
  const [reassignMessage, setReassignMessage] = useState("");
  const [reassignError, setReassignError] = useState("");

  const getAttemptStatusMeta = useCallback((status) => {
    switch (status) {
      case "COMPLETED":
        return { label: "Completed", tone: "completed" };
      case "IN_PROGRESS":
        return { label: "In Progress", tone: "in-progress" };
      case "PENDING":
        return { label: "Awaiting Attempt", tone: "pending" };
      case "CANCELLED":
        return { label: "Cancelled", tone: "cancelled" };
      default:
        return { label: status || "Unknown", tone: "neutral" };
    }
  }, []);

  const handleAdminAuthError = (error) => {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      alert("Admin session expired. Please login again.");
      navigate("/admin/login", { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    loadMasters();
    if (candidateId) {
      fetchCandidateDetail(candidateId);
    }
  }, [navigate, candidateId]);

  const centersByCommand = useMemo(() => {
    const map = new Map();
    masters.centers.forEach((center) => {
      if (!map.has(center.commandId)) {
        map.set(center.commandId, []);
      }
      map.get(center.commandId).push(center);
    });
    return map;
  }, [masters.centers]);

  const loadMasters = async () => {
    try {
      const res = await api.get("/admin/masters");
      setMasters({
        ranks: res.data?.ranks || [],
        trades: res.data?.trades || [],
        commands: res.data?.commands || [],
        centers: res.data?.centers || [],
      });
    } catch (error) {
      console.error("Failed to load masters", error);
      if (handleAdminAuthError(error)) return;
    }
  };

  const fetchCandidateDetail = async (candidateId, options = {}) => {
    const { withSpinner = true } = options;
    if (withSpinner) {
      setLoading(true);
    }
    try {
      const res = await api.get(`/candidate/${candidateId}`);
      const candidateData = res.data;
      
      console.log('Candidate data received:', candidateData);
      
      // Parse selectedExamTypes - it comes as an array from the backend
      const selectedExamTypes = Array.isArray(candidateData.selectedExamTypes) 
        ? candidateData.selectedExamTypes 
        : [];
      
      console.log('Parsed selectedExamTypes:', selectedExamTypes);
      
      setCandidateDetail(candidateData);
      setEditForm({
        id: candidateData.id,
        armyNo: candidateData.armyNo || "",
        name: candidateData.name || "",
        unit: candidateData.unit || "",
        medCat: candidateData.medCat || "",
        corps: candidateData.corps || "",
        dob: formatDate(candidateData.dob),
        doe: formatDate(candidateData.doe),
        rankId: candidateData.rankId ? String(candidateData.rankId) : "",
        tradeId: candidateData.tradeId ? String(candidateData.tradeId) : "",
        commandId: candidateData.commandId ? String(candidateData.commandId) : "",
        centerId: candidateData.centerId ? String(candidateData.centerId) : "",
        selectedExamTypes: selectedExamTypes,
        slotIds: (candidateData.examSlots || []).map((slot) => slot.id),
      });
      
      // Load slots with the parsed exam types
      await loadSlotOptions(candidateData.tradeId, candidateData.commandId, candidateData.centerId, selectedExamTypes);
    } catch (error) {
      console.error("Failed to load candidate", error);
      if (handleAdminAuthError(error)) return;
    } finally {
      if (withSpinner) {
        setLoading(false);
      }
    }
  };

  const loadSlotOptions = async (tradeId, commandId, centerId, selectedExamTypes = []) => {
    if (!tradeId) {
      setSlotOptions([]);
      return;
    }

    console.log('Loading slots for:', { tradeId, commandId, centerId, selectedExamTypes });

    const params = new URLSearchParams({ tradeId: String(tradeId) });
    if (commandId) params.append("commandId", String(commandId));
    if (centerId) params.append("centerId", String(centerId));
    params.append("upcoming", "false"); // Get all slots, not just upcoming

    try {
      const res = await api.get(`/exam-slot?${params.toString()}`);
      const allSlots = res.data || [];
      
      console.log('All slots received:', allSlots);
      
      // Filter slots based on selected exam types
      // Only show slots for paper types that the candidate has selected
      const filtered = selectedExamTypes.length > 0
        ? allSlots.filter((slot) => selectedExamTypes.includes(slot.paperType))
        : allSlots;
      
      console.log('Filtered slots:', filtered);
      setSlotOptions(filtered);
    } catch (error) {
      console.error("Failed to load exam slots", error);
      if (handleAdminAuthError(error)) return;
      setSlotOptions([]);
    }
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExamTypeToggle = (value) => {
    setEditForm((prev) => {
      const exists = prev.selectedExamTypes.includes(value);
      const nextTypes = exists
        ? prev.selectedExamTypes.filter((item) => item !== value)
        : [...prev.selectedExamTypes, value];
      
      console.log('Exam types changed to:', nextTypes);
      
      // Reload slots with new exam types
      loadSlotOptions(prev.tradeId, prev.commandId, prev.centerId, nextTypes);
      
      return {
        ...prev,
        selectedExamTypes: nextTypes,
        // Clear slot assignments when exam types change
        slotIds: prev.slotIds.filter((id) => {
          const slot = slotOptions.find((option) => option.id === id);
          return slot ? nextTypes.includes(slot.paperType) : false;
        }),
      };
    });
  };

  const handleSlotToggle = (slotId) => {
    setEditForm((prev) => {
      const exists = prev.slotIds.includes(slotId);
      return {
        ...prev,
        slotIds: exists ? prev.slotIds.filter((id) => id !== slotId) : [...prev.slotIds, slotId],
      };
    });
  };

  const handleTradeChange = (value) => {
    setEditForm((prev) => {
      const newForm = {
        ...prev,
        tradeId: value,
        selectedExamTypes: [], // Reset exam types when trade changes
        slotIds: [], // Clear slot assignments
      };
      
      // Load slots for new trade (will be empty initially since no exam types selected)
      loadSlotOptions(value, prev.commandId, prev.centerId, []);
      
      return newForm;
    });
  };

  const handleCommandChange = (value) => {
    setEditForm((prev) => {
      const newForm = {
        ...prev,
        commandId: value,
        centerId: "", // Reset center when command changes
        slotIds: [], // Clear slot assignments
      };
      
      // Reload slots for new command
      loadSlotOptions(prev.tradeId, value, "", prev.selectedExamTypes);
      
      return newForm;
    });
  };

  const handleCenterChange = (value) => {
    setEditForm((prev) => {
      const newForm = {
        ...prev,
        centerId: value,
        slotIds: [], // Clear slot assignments when center changes
      };
      
      // Reload slots for new center
      loadSlotOptions(prev.tradeId, prev.commandId, value, prev.selectedExamTypes);
      
      return newForm;
    });
  };

  const handleSave = async () => {
    if (!editForm.id) return;
    setSaving(true);
    setSaveMessage("");
    try {
      const payload = {
        name: editForm.name.trim(),
        unit: editForm.unit.trim(),
        medCat: editForm.medCat.trim(),
        corps: editForm.corps.trim(),
        dob: editForm.dob,
        doe: editForm.doe,
        rankId: editForm.rankId ? Number(editForm.rankId) : undefined,
        tradeId: editForm.tradeId ? Number(editForm.tradeId) : undefined,
        commandId: editForm.commandId ? Number(editForm.commandId) : undefined,
        centerId: editForm.centerId ? Number(editForm.centerId) : null,
        selectedExamTypes: editForm.selectedExamTypes,
        slotIds: editForm.slotIds
      };

      const res = await api.put(`/candidate/${editForm.id}`, payload);
      setCandidateDetail(res.data.candidate);
      setSaveMessage("Candidate updated successfully");
    } catch (error) {
      console.error("Failed to update candidate", error);
      if (handleAdminAuthError(error)) return;
      setSaveMessage(error.response?.data?.error || "Failed to update candidate");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editForm.id) return;
    if (!confirm("Are you sure you want to delete this candidate? This action cannot be undone.")) {
      return;
    }
    
    setDeleteBusy(true);
    try {
      await api.delete(`/candidate/${editForm.id}`);
      alert("Candidate deleted successfully");
      navigate("/admin/candidates");
    } catch (error) {
      console.error("Failed to delete candidate", error);
      if (handleAdminAuthError(error)) return;
      alert(error.response?.data?.error || "Failed to delete candidate");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleReassignAttempt = async (attempt) => {
    if (!candidateDetail?.id) return;

    const paperLabel = attempt.examPaper?.paperType || "this paper";

    if (!window.confirm(`Reset ${paperLabel} attempt? The candidate will be able to take the test again.`)) {
      return;
    }

    setReassignMessage("");
    setReassignError("");
    setReassigningId(attempt.id);

    try {
      const payload = { attemptId: attempt.id };
      if (attempt.examSlot?.id) {
        payload.examSlotId = attempt.examSlot.id;
      }

      const res = await api.post(`/candidate/${candidateDetail.id}/reassign-exam`, payload);

      const message = res.data?.message || `${paperLabel} has been reset.`;
      setReassignMessage(message);

      const refreshedId = res.data?.candidate?.id || candidateDetail.id;
      await fetchCandidateDetail(refreshedId, { withSpinner: false });
    } catch (error) {
      console.error("Failed to reassign exam", error);
      if (handleAdminAuthError(error)) return;
      setReassignError(error.response?.data?.error || "Failed to reassign exam attempt");
    } finally {
      setReassigningId(null);
    }
  };

  const allowedExamTypesForEdit = useMemo(() => {
    const trade = masters.trades.find((item) => String(item.id) === String(editForm.tradeId));
    return tradeExamTypes(trade);
  }, [masters.trades, editForm.tradeId]);

  const centersForEdit = useMemo(() => {
    if (!editForm.commandId) return [];
    return centersByCommand.get(Number(editForm.commandId)) || [];
  }, [centersByCommand, editForm.commandId]);

  const attemptSummary = useMemo(() => {
    const attempts = candidateDetail?.examAttempts || [];
    if (!attempts.length) return [];

    const sorted = [...attempts].sort(
      (a, b) => getAttemptSortTimestamp(b) - getAttemptSortTimestamp(a)
    );

    const latestByPaper = new Map();
    for (const attempt of sorted) {
      const paperType = attempt.examPaper?.paperType || "UNKNOWN";
      if (!latestByPaper.has(paperType)) {
        latestByPaper.set(paperType, attempt);
      }
    }

    const preferredOrder = Array.isArray(candidateDetail?.selectedExamTypes)
      ? candidateDetail.selectedExamTypes
      : [];

    const prioritized = preferredOrder
      .map((type) => latestByPaper.get(type))
      .filter(Boolean);

    const remaining = [];
    latestByPaper.forEach((attempt, type) => {
      if (!preferredOrder.includes(type)) {
        remaining.push(attempt);
      }
    });

    return [...prioritized, ...remaining];
  }, [candidateDetail]);

  if (loading) {
    return (
      <div className="candidate-profile-loading">
        <div className="loading-spinner">Loading candidate profile...</div>
      </div>
    );
  }

  if (!candidateDetail) {
    return (
      <div className="candidate-profile-error">
        <div className="error-message">Candidate not found</div>
        <button onClick={() => navigate("/admin/candidates")}>
          Back to Candidate List
        </button>
      </div>
    );
  }

  return (
    <div className="candidate-profile-page">
      <div className="profile-header">
        <div className="breadcrumb">
          <span onClick={() => navigate("/admin")}>Home</span> • 
          <span>Registration</span> • 
          <span onClick={() => navigate("/admin/candidates")}>Candidate profiles</span> • 
          <span>{editForm.armyNo} - {editForm.name}</span>
        </div>
        <h1>Candidate profiles</h1>
      </div>

      <div className="profile-content">
        <div className="profile-form-section">
          <div className="form-grid">
            <div className="form-row">
              <label>User</label>
              <div className="input-with-icons">
                <input 
                  type="text" 
                  value={editForm.unit || ""} 
                  onChange={(e) => handleEditChange("unit", e.target.value)}
                />
                <div className="input-icons">
                  <span className="icon edit">✏️</span>
                  <span className="icon add">➕</span>
                  <span className="icon remove">➖</span>
                </div>
              </div>
            </div>
            
            <div className="form-row">
              <label>Army no</label>
              <input 
                type="text" 
                value={editForm.armyNo || ""} 
                disabled
                className="disabled-input"
              />
            </div>

            <div className="form-row">
              <label>Rank</label>
              <select 
                value={editForm.rankId || ""} 
                onChange={(e) => handleEditChange("rankId", e.target.value)}
              >
                <option value="">Select Rank</option>
                {masters.ranks.map((rank) => (
                  <option key={rank.id} value={rank.id}>
                    {rank.name}
                  </option>
                ))}
              </select>
            </div>

            {/* <div className="form-row">
              <label>Trade type</label>
              <input 
                type="text" 
                value={masters.trades.find(t => String(t.id) === String(editForm.tradeId))?.name || ""} 
                disabled
                className="disabled-input"
              />
            </div> */}

            <div className="form-row">
              <label>Unit</label>
              <input 
                type="text" 
                value={editForm.unit || ""} 
                onChange={(e) => handleEditChange("unit", e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Command</label>
              <div className="input-with-icons">
                <input 
                  type="text" 
                  value={masters.commands.find(c => String(c.id) === String(editForm.commandId))?.name || ""} 
                  disabled
                  className="disabled-input"
                />
                <div className="input-icons">
                  <span className="icon edit">✏️</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <label>Trade</label>
              <select 
                value={editForm.tradeId || ""} 
                onChange={(e) => handleTradeChange(e.target.value)}
              >
                <option value="">Select Trade</option>
                {masters.trades.map((trade) => (
                  <option key={trade.id} value={trade.id}>
                    {trade.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label>Name</label>
              <div className="input-with-icons">
                <input 
                  type="text" 
                  value={editForm.name || ""} 
                  onChange={(e) => handleEditChange("name", e.target.value)}
                />
                <div className="input-icons">
                  <span className="icon star">⭐</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <label>Date of Birth</label>
              <input 
                type="date" 
                value={editForm.dob || ""} 
                onChange={(e) => handleEditChange("dob", e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Date of Enrolment</label>
              <input 
                type="date" 
                value={editForm.doe || ""} 
                onChange={(e) => handleEditChange("doe", e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Med cat</label>
              <input 
                type="text" 
                value={editForm.medCat || ""} 
                onChange={(e) => handleEditChange("medCat", e.target.value)}
              />
            </div>

            {/* <div className="form-row">
              <label>Cat</label>
              <input 
                type="text" 
                value={editForm.corps || ""} 
                onChange={(e) => handleEditChange("corps", e.target.value)}
              />
            </div> */}

            <div className="form-row">
              <label>Exam center</label>
              <input 
                type="text" 
                value={masters.centers.find(c => String(c.id) === String(editForm.centerId))?.name || ""} 
                onChange={(e) => handleEditChange("examCenter", e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Shift</label>
              <div className="input-with-icons">
                <select>
                  <option value="">Select Shift</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
                <div className="input-icons">
                  <span className="icon edit">✏️</span>
                  <span className="icon add">➕</span>
                  <span className="icon remove">➖</span>
                  <span className="icon star">⭐</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-actions-section">
          <div className="action-buttons">
            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="delete-btn" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? "Deleting..." : "Delete"}
            </button>
            <button className="save-continue-btn">Save and add another</button>
            <button className="save-edit-btn">Save and continue editing</button>
            <button className="history-btn">History</button>
          </div>

          {saveMessage && (
            <div className="save-message">{saveMessage}</div>
          )}

          {/* Exam Types Section */}
          <div className="exam-types-section">
            <h3>Exam Types</h3>
            {allowedExamTypesForEdit.length === 0 ? (
              <p>Selected trade does not have configured exam types.</p>
            ) : (
              <div className="exam-types-grid">
                {allowedExamTypesForEdit.map((type) => (
                  <label key={type} className={`exam-type-pill ${editForm.selectedExamTypes?.includes(type) ? "active" : ""}`}>
                    <input
                      type="checkbox"
                      checked={editForm.selectedExamTypes?.includes(type) || false}
                      onChange={() => handleExamTypeToggle(type)}
                    />
                    {EXAM_DISPLAY_NAMES[type]}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Exam Slots Section */}
          <div className="exam-slots-section">
            <h3>Exam Slots</h3>
            {editForm.selectedExamTypes?.length === 0 ? (
              <p>Please select exam types first to see available slots.</p>
            ) : slotOptions.length === 0 ? (
              <p>No slots available for the selected trade and exam types.</p>
            ) : (
              <div className="slots-grid">
                {slotOptions.map((slot) => {
                  const active = editForm.slotIds?.includes(slot.id);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className={`slot-card ${active ? "active" : ""}`}
                      onClick={() => handleSlotToggle(slot.id)}
                    >
                      <span className="slot-paper">{slot.paperType}</span>
                      <span className="slot-time">
                        {formatDateTime(slot.startTime)} - {formatDateTime(slot.endTime)}
                      </span>
                      <span className="slot-locale">{slot.center?.name || "Center"}</span>
                      <span className="slot-count">{slot.currentCount || 0} assigned · {slot.questionCount || 0} qns</span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Show currently assigned slots */}
            {editForm.slotIds?.length > 0 && (
              <div className="assigned-slots">
                <h4>Currently Assigned Slots:</h4>
                <ul>
                  {editForm.slotIds.map(slotId => {
                    const slot = slotOptions.find(s => s.id === slotId);
                    return slot ? (
                      <li key={slotId}>
                        <strong>{slot.paperType}</strong> - {formatDateTime(slot.startTime)} at {slot.center?.name}
                      </li>
                    ) : (
                      <li key={slotId}>Slot ID {slotId} (details not available)</li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>
      <div className="exam-attempts-panel">
        <div className="exam-attempts-section">
          <div className="exam-attempts-header">
            <div>
              <h3>Exam Attempts</h3>
              <p className="exam-attempts-subtitle">Monitor progress and reset attempts when needed.</p>
            </div>
          </div>
          {(reassignMessage || reassignError) && (
            <div className={`reassign-banner ${reassignError ? "error" : "success"}`}>
              {reassignError || reassignMessage}
            </div>
          )}
          {attemptSummary.length === 0 ? (
            <p>No exam attempts recorded.</p>
          ) : (
            <div className="attempts-table-wrapper">
              <table className="attempts-table">
                <thead>
                  <tr>
                    <th>Paper</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attemptSummary.map((attempt) => {
                    const statusMeta = getAttemptStatusMeta(attempt.status);
                    const isCompleted = attempt.status === "COMPLETED";
                    const hasScore = typeof attempt.score === "number" && isCompleted;
                    const hasPercentage = typeof attempt.percentage === "number" && isCompleted;
                    const submittedLabel = isCompleted
                      ? formatDateTime(attempt.submittedAt)
                      : attempt.status === "IN_PROGRESS"
                        ? "In progress"
                        : "Not yet submitted";

                    return (
                      <tr key={attempt.id} className={`attempt-row status-${statusMeta.tone}`}>
                        <td>{attempt.examPaper?.paperType || "—"}</td>
                        <td>
                          <span className={`status-badge status-${statusMeta.tone}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td>{hasScore ? attempt.score.toFixed(2) : "—"}</td>
                        <td>{hasPercentage ? `${attempt.percentage.toFixed(2)}%` : "—"}</td>
                        <td>{submittedLabel || "—"}</td>
                        <td className="attempt-actions">
                          {isCompleted ? (
                            <button
                              type="button"
                              className="reassign-btn"
                              onClick={() => handleReassignAttempt(attempt)}
                              disabled={reassigningId === attempt.id}
                            >
                              {reassigningId === attempt.id ? "Reassigning..." : "Reassign Exam"}
                            </button>
                          ) : (
                            <span className="attempt-action-hint">
                              {attempt.status === "PENDING" ? "Ready for retake" : "—"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}