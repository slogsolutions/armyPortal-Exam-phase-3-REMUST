import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./CandidateManager.css";

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

const defaultCreateForm = {
  armyNo: "",
  name: "",
  unit: "",
  medCat: "",
  corps: "",
  dob: "",
  doe: "",
  rankId: "",
  tradeId: "",
  commandId: "",
  centerId: "",
  selectedExamTypes: [],
  slotIds: [], // Array to store assigned slot IDs
};

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

const tradeExamTypes = (trade) => {
  if (!trade) return [];
  return TRADE_EXAM_FLAGS.filter(({ flag }) => trade[flag]).map(({ label }) => label);
};

export default function CandidateManager() {
  const navigate = useNavigate();
  const [masters, setMasters] = useState({ ranks: [], trades: [], commands: [], centers: [] });
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [filterTradeId, setFilterTradeId] = useState("");
  const [filterCommandId, setFilterCommandId] = useState("");
  const [filterCenterId, setFilterCenterId] = useState("");
  const [slotOptions, setSlotOptions] = useState([]); // Available slots for assignment
  const [bulkAssigning, setBulkAssigning] = useState(false); // For bulk assignment loading state

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
    loadCandidates();
  }, [navigate]);

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

  const filteredCandidates = useMemo(() => {
    let filtered = candidates;
    
    if (filterTradeId) {
      filtered = filtered.filter(c => String(c.tradeId) === filterTradeId);
    }
    
    if (filterCommandId) {
      filtered = filtered.filter(c => String(c.commandId) === filterCommandId);
    }
    
    if (filterCenterId) {
      filtered = filtered.filter(c => String(c.centerId) === filterCenterId);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.armyNo?.toLowerCase().includes(term) ||
        c.name?.toLowerCase().includes(term) ||
        c.trade?.name?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [candidates, filterTradeId, filterCommandId, filterCenterId, searchTerm]);

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

  const loadCandidates = async () => {
    setLoadingList(true);
    try {
      const res = await api.get("/candidate");
      const data = Array.isArray(res.data) ? res.data : [];
      setCandidates(data);
    } catch (error) {
      console.error("Failed to load candidates", error);
      if (!handleAdminAuthError(error)) {
        setCandidates([]);
      }
    } finally {
      setLoadingList(false);
    }
  };

  const loadSlotOptions = async (tradeId, commandId, centerId, selectedExamTypes = []) => {
    if (!tradeId) {
      setSlotOptions([]);
      return;
    }

    console.log('Loading slots for candidate creation:', { tradeId, commandId, centerId, selectedExamTypes });

    const params = new URLSearchParams({ tradeId: String(tradeId) });
    
    // Filter by command and center if provided
    if (commandId) {
      params.append("commandId", String(commandId));
    }
    if (centerId) {
      params.append("centerId", String(centerId));
    }
    
    params.append("upcoming", "false"); // Get all slots, not just upcoming

    try {
      const res = await api.get(`/exam-slot?${params.toString()}`);
      const allSlots = res.data || [];
      
      console.log('All slots received for creation:', allSlots);
      
      // Filter slots by trade, command, and center
      let filtered = allSlots.filter((slot) => {
        // Must match trade
        if (slot.tradeId !== Number(tradeId)) {
          return false;
        }
        
        // Must match command if provided
        if (commandId && slot.commandId !== Number(commandId)) {
          return false;
        }
        
        // Must match center if provided
        if (centerId && slot.centerId !== Number(centerId)) {
          return false;
        }
        
        return true;
      });
      
      // Further filter by selected exam types if any are selected
      if (selectedExamTypes.length > 0) {
        filtered = filtered.filter((slot) => selectedExamTypes.includes(slot.paperType));
      }
      
      console.log('Filtered slots for creation:', filtered);
      setSlotOptions(filtered);
    } catch (error) {
      console.error("Failed to load exam slots for creation", error);
      if (handleAdminAuthError(error)) return;
      setSlotOptions([]);
    }
  };

  const handleCandidateClick = (candidate) => {
    navigate(`/admin/candidate-profile/${candidate.id}`);
  };

  const handleCreateInput = (field, value) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExamTypeToggle = (value) => {
    setCreateForm((prev) => {
      const exists = prev.selectedExamTypes.includes(value);
      const nextTypes = exists
        ? prev.selectedExamTypes.filter((item) => item !== value)
        : [...prev.selectedExamTypes, value];
      
      // Clear slot assignments when exam types change
      const filteredSlotIds = prev.slotIds.filter((id) => {
        const slot = slotOptions.find((option) => option.id === id);
        return slot ? nextTypes.includes(slot.paperType) : false;
      });
      
      // Reload slots with new exam types
      if (prev.tradeId) {
        loadSlotOptions(prev.tradeId, prev.commandId, prev.centerId, nextTypes);
      }
      
      return {
        ...prev,
        selectedExamTypes: nextTypes,
        slotIds: filteredSlotIds,
      };
    });
  };

  const handleTradeChange = (value) => {
    setCreateForm((prev) => {
      const newForm = {
        ...prev,
        tradeId: value,
        selectedExamTypes: [], // Reset exam types when trade changes
        slotIds: [], // Clear slot assignments
      };
      
      // Load slots for new trade (will be empty initially since no exam types selected)
      if (value) {
        loadSlotOptions(value, prev.commandId, prev.centerId, []);
      } else {
        setSlotOptions([]);
      }
      
      return newForm;
    });
  };

  const handleCommandChange = (value) => {
    setCreateForm((prev) => {
      const newForm = {
        ...prev,
        commandId: value,
        centerId: "", // Reset center when command changes
        slotIds: [], // Clear slot assignments when command changes
      };
      
      // Reload slots with new command
      if (prev.tradeId) {
        loadSlotOptions(prev.tradeId, value, "", prev.selectedExamTypes);
      }
      
      return newForm;
    });
  };

  const handleCenterChange = (value) => {
    setCreateForm((prev) => {
      const newForm = {
        ...prev,
        centerId: value,
        slotIds: [], // Clear slot assignments when center changes
      };
      
      // Reload slots with new center
      if (prev.tradeId) {
        loadSlotOptions(prev.tradeId, prev.commandId, value, prev.selectedExamTypes);
      }
      
      return newForm;
    });
  };

  const allowedExamTypesForCreate = useMemo(() => {
    const trade = masters.trades.find((item) => String(item.id) === String(createForm.tradeId));
    return tradeExamTypes(trade);
  }, [masters.trades, createForm.tradeId]);

  const centersForCreate = useMemo(() => {
    if (!createForm.commandId) return [];
    return centersByCommand.get(Number(createForm.commandId)) || [];
  }, [centersByCommand, createForm.commandId]);

  const validateCreateForm = () => {
    const requiredFields = ["armyNo", "name", "unit", "medCat", "corps", "dob", "doe", "rankId", "tradeId", "commandId"];
    for (const field of requiredFields) {
      if (!createForm[field]) {
        return "Please complete all required fields";
      }
    }
    if (!createForm.selectedExamTypes.length) {
      return "Select at least one exam type";
    }
    return "";
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    const validationError = validateCreateForm();
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setCreateSubmitting(true);
    try {
      await api.post("/candidate/register", {
        armyNo: createForm.armyNo.trim(),
        name: createForm.name.trim(),
        unit: createForm.unit.trim(),
        medCat: createForm.medCat.trim(),
        corps: createForm.corps.trim(),
        dob: createForm.dob,
        doe: createForm.doe,
        rankId: Number(createForm.rankId),
        tradeId: Number(createForm.tradeId),
        commandId: Number(createForm.commandId),
        centerId: createForm.centerId ? Number(createForm.centerId) : null,
        selectedExamTypes: createForm.selectedExamTypes,
        slotIds: createForm.slotIds, // Include slot assignments
      });

      setCreateForm(defaultCreateForm);
      setSlotOptions([]); // Clear slot options
      setCreateOpen(false);
      await loadCandidates();
      alert("Candidate created successfully");
    } catch (error) {
      console.error("Failed to create candidate", error);
      if (handleAdminAuthError(error)) return;
      setCreateError(error.response?.data?.error || "Failed to create candidate");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleClearFilters = () => {
    setFilterTradeId("");
    setFilterCommandId("");
    setFilterCenterId("");
    setSearchTerm("");
  };

  const handleBulkAssignSlots = async () => {
    if (!confirm("This will automatically assign all unassigned candidates to available slots. Continue?")) {
      return;
    }

    setBulkAssigning(true);
    try {
      const res = await api.post("/candidate/bulk-assign-slots");
      alert(`Success! Assigned ${res.data.totalAssigned} candidates to slots.`);
      await loadCandidates(); // Refresh the candidate list
    } catch (error) {
      console.error("Failed to bulk assign slots", error);
      if (handleAdminAuthError(error)) return;
      alert(error.response?.data?.error || "Failed to bulk assign slots");
    } finally {
      setBulkAssigning(false);
    }
  };

  return (
    <div className="candidate-manager-new">
      <div className="header-section">
        <div className="breadcrumb">
          <span>Home</span> • <span>Registration</span> • <span>Candidate profiles</span>
        </div>
        <div className="header-content">
          <h1>Candidate profiles</h1>
          <div className="header-buttons">
            <button 
              className="bulk-assign-btn" 
              onClick={handleBulkAssignSlots}
              disabled={bulkAssigning}
            >
              {bulkAssigning ? "Assigning..." : "🔄 Auto-Assign Slots"}
            </button>
            <button className="add-candidate-btn" onClick={() => setCreateOpen(true)}>
              Add candidate profile
            </button>
          </div>
        </div>
      </div>

      <div className="search-filters">
        <input
          type="text"
          placeholder="trade"
          className="filter-input"
        />
        <input
          type="text"
          placeholder="training center"
          className="filter-input"
        />
        <button className="search-btn">Search</button>
        <input
          type="text"
          placeholder="Search by Army No, name or trade"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button className="go-btn">Go</button>
        <span className="selection-info">
          5 of 13 selected
        </span>
      </div>

      <div className="candidates-table-container">
        {loadingList ? (
          <div className="loading">Loading candidates...</div>
        ) : (
          <table className="candidates-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>Army no</th>
                <th>Name</th>
                <th>User</th>
                <th>Rank</th>
                <th>Trade</th>
                <th>Shift</th>
                <th>Created at</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => (
                <tr 
                  key={candidate.id} 
                  onClick={() => handleCandidateClick(candidate)}
                  className="candidate-row"
                >
                  <td><input type="checkbox" /></td>
                  <td className="army-no">{candidate.armyNo}</td>
                  <td>{candidate.name}</td>
                  <td>{candidate.unit}</td>
                  <td>{candidate.rank?.name || "—"}</td>
                  <td>{candidate.trade?.name || "—"}</td>
                  <td>—</td>
                  <td>{formatDate(candidate.doe) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Candidate Modal */}
      {createOpen && (
        <div className="modal-backdrop" onClick={(e) => e.target.classList.contains("modal-backdrop") && setCreateOpen(false)}>
          <div className="modal">
            <header className="modal-header">
              <h2>Create Candidate</h2>
              <button type="button" className="close-btn" onClick={() => setCreateOpen(false)}>
                ×
              </button>
            </header>

            <form className="modal-body" onSubmit={handleCreateCandidate}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Army Number *</label>
                  <input
                    value={createForm.armyNo}
                    onChange={(e) => handleCreateInput("armyNo", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Name *</label>
                  <input
                    value={createForm.name}
                    onChange={(e) => handleCreateInput("name", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit *</label>
                  <input
                    value={createForm.unit}
                    onChange={(e) => handleCreateInput("unit", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Medical Category *</label>
                  <input
                    value={createForm.medCat}
                    onChange={(e) => handleCreateInput("medCat", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Corps *</label>
                  <input
                    value={createForm.corps}
                    onChange={(e) => handleCreateInput("corps", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    value={createForm.dob}
                    onChange={(e) => handleCreateInput("dob", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date of Enrolment *</label>
                  <input
                    type="date"
                    value={createForm.doe}
                    onChange={(e) => handleCreateInput("doe", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Rank *</label>
                  <select
                    value={createForm.rankId}
                    onChange={(e) => handleCreateInput("rankId", e.target.value)}
                    required
                  >
                    <option value="">Select Rank</option>
                    {masters.ranks.map((rank) => (
                      <option key={rank.id} value={rank.id}>
                        {rank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Trade *</label>
                  <select
                    value={createForm.tradeId}
                    onChange={(e) => {
                      handleTradeChange(e.target.value);
                      handleCreateInput("tradeId", e.target.value);
                    }}
                    required
                  >
                    <option value="">Select Trade</option>
                    {masters.trades.map((trade) => (
                      <option key={trade.id} value={trade.id}>
                        {trade.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Command *</label>
                  <select
                    value={createForm.commandId}
                    onChange={(e) => {
                      handleCommandChange(e.target.value);
                      handleCreateInput("commandId", e.target.value);
                    }}
                    required
                  >
                    <option value="">Select Command</option>
                    {masters.commands.map((command) => (
                      <option key={command.id} value={command.id}>
                        {command.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Conducting Center</label>
                  <select
                    value={createForm.centerId}
                    onChange={(e) => handleCreateInput("centerId", e.target.value)}
                  >
                    <option value="">Select Center</option>
                    {centersForCreate.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <section className="exam-types">
                <h3>Exam Types *</h3>
                {allowedExamTypesForCreate.length === 0 ? (
                  <p className="muted">Select a trade to choose exam types.</p>
                ) : (
                  <div className="pill-group">
                    {allowedExamTypesForCreate.map((type) => (
                      <label key={type} className={`pill ${createForm.selectedExamTypes.includes(type) ? "active" : ""}`}>
                        <input
                          type="checkbox"
                          checked={createForm.selectedExamTypes.includes(type)}
                          onChange={() => handleExamTypeToggle(type)}
                        />
                        {EXAM_DISPLAY_NAMES[type]}
                      </label>
                    ))}
                  </div>
                )}
              </section>

              {/* Slot Assignment Section */}
              {createForm.selectedExamTypes.length > 0 && (
                <section className="slot-assignments">
                  <h3>📅 Assign Exam Slots</h3>
                  <div className="slot-info">
                    <p className="muted">
                      🔒 Only slots matching the selected trade, command, and center are shown.
                    </p>
                    <div className="slot-stats">
                      <span>Available Slots: {slotOptions.length}</span>
                      <span>Assigned: {createForm.slotIds.length} of {createForm.selectedExamTypes.length}</span>
                    </div>
                  </div>
                  
                  {createForm.selectedExamTypes.map((examType) => {
                    const slotsForType = slotOptions.filter(slot => slot.paperType === examType);
                    const assignedSlotId = createForm.slotIds.find(slotId => {
                      const slot = slotOptions.find(s => s.id === slotId);
                      return slot && slot.paperType === examType;
                    });
                    
                    return (
                      <div key={examType} className="slot-assignment-row">
                        <label className="slot-label">
                          <span className="exam-type-badge">{examType}</span>
                          Slot Assignment
                        </label>
                        {slotsForType.length === 0 ? (
                          <div className="no-slots-message">
                            <span className="warning-icon">⚠️</span>
                            <div>
                              <p><strong>No {examType} slots available</strong></p>
                              <p>Create slots for this trade/command/center combination.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="slot-selection">
                            <select 
                              value={assignedSlotId || ""} 
                              onChange={(e) => {
                                const newSlotId = e.target.value ? Number(e.target.value) : null;
                                setCreateForm(prev => {
                                  // Remove any existing slot for this exam type
                                  const filteredSlotIds = prev.slotIds.filter(slotId => {
                                    const slot = slotOptions.find(s => s.id === slotId);
                                    return slot && slot.paperType !== examType;
                                  });
                                  
                                  // Add new slot if selected
                                  const newSlotIds = newSlotId 
                                    ? [...filteredSlotIds, newSlotId]
                                    : filteredSlotIds;
                                  
                                  return {
                                    ...prev,
                                    slotIds: newSlotIds
                                  };
                                });
                              }}
                              className="slot-select"
                            >
                              <option value="">🔽 Select {examType} Slot</option>
                              {slotsForType.map((slot) => (
                                <option key={slot.id} value={slot.id}>
                                  📅 {formatDateTime(slot.startTime)} - {formatDateTime(slot.endTime)} 
                                  🏢 ({slot.center?.name}) - 👥 {slot.currentCount || 0} assigned
                                </option>
                              ))}
                            </select>
                            <div className="slot-status">
                              {assignedSlotId ? (
                                <span className="assigned">✅ Assigned</span>
                              ) : (
                                <span className="unassigned">⏳ Not Assigned</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              )}

              {createError && <div className="error-message">{createError}</div>}

              <footer className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="create-btn" disabled={createSubmitting}>
                  {createSubmitting ? "Creating..." : "Create"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}