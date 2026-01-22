import { useEffect, useMemo, useState } from "react";
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

const defaultEditForm = {
  id: null,
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
  slotIds: [],
};

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
  const [masters, setMasters] = useState({ ranks: [], trades: [], commands: [], centers: [] });
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [slotOptions, setSlotOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    loadMasters();
    loadCandidates();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredCandidates(candidates);
    } else {
      const normalized = searchTerm.toLowerCase();
      setFilteredCandidates(
        candidates.filter((candidate) => {
          const haystack = [
            candidate.armyNo,
            candidate.name,
            candidate.trade?.name,
            candidate.command?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalized);
        })
      );
    }
  }, [searchTerm, candidates]);

  useEffect(() => {
    if (selectedCandidateId) {
      fetchCandidateDetail(selectedCandidateId);
    }
  }, [selectedCandidateId]);

  useEffect(() => {
    if (!candidateDetail) return;
    initializeEditForm(candidateDetail);
  }, [candidateDetail]);

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
    }
  };

  const loadCandidates = async () => {
    setLoadingList(true);
    try {
      const res = await api.get("/candidate");
      const data = Array.isArray(res.data) ? res.data : [];
      setCandidates(data);
      setFilteredCandidates(data);
    } catch (error) {
      console.error("Failed to load candidates", error);
      setCandidates([]);
      setFilteredCandidates([]);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchCandidateDetail = async (candidateId) => {
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await api.get(`/candidate/${candidateId}`);
      setCandidateDetail(res.data);
      await loadSlotOptions(res.data.tradeId, res.data.commandId, res.data.centerId, res.data.selectedExamTypes);
    } catch (error) {
      console.error("Failed to load candidate", error);
      setDetailError(error.response?.data?.error || "Failed to load candidate detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const loadSlotOptions = async (tradeId, commandId, centerId, selectedExamTypes = []) => {
    if (!tradeId) {
      setSlotOptions([]);
      return;
    }

    const params = new URLSearchParams({ tradeId });
    if (commandId) params.append("commandId", commandId);
    if (centerId) params.append("centerId", centerId);
    params.append("upcoming", "false");

    try {
      const res = await api.get(`/exam-slot?${params.toString()}`);
      const slots = res.data || [];
      const filtered = selectedExamTypes.length
        ? slots.filter((slot) => selectedExamTypes.includes(slot.paperType))
        : slots;
      setSlotOptions(filtered);
    } catch (error) {
      console.error("Failed to load exam slots", error);
      setSlotOptions([]);
    }
  };

  const initializeEditForm = (detail) => {
    setEditForm({
      id: detail.id,
      armyNo: detail.armyNo || "",
      name: detail.name || "",
      unit: detail.unit || "",
      medCat: detail.medCat || "",
      corps: detail.corps || "",
      dob: formatDate(detail.dob),
      doe: formatDate(detail.doe),
      rankId: detail.rankId ? String(detail.rankId) : "",
      tradeId: detail.tradeId ? String(detail.tradeId) : "",
      commandId: detail.commandId ? String(detail.commandId) : "",
      centerId: detail.centerId ? String(detail.centerId) : "",
      selectedExamTypes: detail.selectedExamTypes || [],
      slotIds: (detail.examSlots || []).map((slot) => slot.id),
    });
  };

  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidateId(candidateId);
    setSaveMessage("");
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExamTypeToggle = (value, context = "edit") => {
    if (context === "create") {
      setCreateForm((prev) => {
        const exists = prev.selectedExamTypes.includes(value);
        return {
          ...prev,
          selectedExamTypes: exists
            ? prev.selectedExamTypes.filter((item) => item !== value)
            : [...prev.selectedExamTypes, value],
        };
      });
      return;
    }

    setEditForm((prev) => {
      const exists = prev.selectedExamTypes.includes(value);
      const nextTypes = exists
        ? prev.selectedExamTypes.filter((item) => item !== value)
        : [...prev.selectedExamTypes, value];
      loadSlotOptions(prev.tradeId, prev.commandId, prev.centerId, nextTypes);
      return {
        ...prev,
        selectedExamTypes: nextTypes,
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

  const handleTradeChange = (value, context = "edit") => {
    if (context === "create") {
      setCreateForm((prev) => ({
        ...prev,
        tradeId: value,
        selectedExamTypes: [],
      }));
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      tradeId: value,
      selectedExamTypes: [],
      slotIds: [],
    }));
    loadSlotOptions(value, editForm.commandId, editForm.centerId, []);
  };

  const handleCommandChange = (value, context = "edit") => {
    if (context === "create") {
      setCreateForm((prev) => ({
        ...prev,
        commandId: value,
        centerId: "",
      }));
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      commandId: value,
      centerId: "",
      slotIds: [],
    }));
    loadSlotOptions(editForm.tradeId, value, "", editForm.selectedExamTypes);
  };

  const handleCenterChange = (value, context = "edit") => {
    if (context === "create") {
      setCreateForm((prev) => ({
        ...prev,
        centerId: value,
      }));
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      centerId: value,
      slotIds: [],
    }));
    loadSlotOptions(editForm.tradeId, editForm.commandId, value, editForm.selectedExamTypes);
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
        slotIds: editForm.slotIds,
      };

      const res = await api.put(`/candidate/${editForm.id}`, payload);
      setCandidateDetail(res.data.candidate);
      await loadCandidates();
      setSaveMessage("Candidate updated successfully");
    } catch (error) {
      console.error("Failed to update candidate", error);
      setSaveMessage(error.response?.data?.error || "Failed to update candidate");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editForm.id) return;
    if (!window.confirm("Are you sure you want to delete this candidate? This cannot be undone.")) {
      return;
    }

    setDeleteBusy(true);
    try {
      await api.delete(`/candidate/${editForm.id}`);
      setCandidateDetail(null);
      setSelectedCandidateId(null);
      await loadCandidates();
      setEditForm(defaultEditForm);
    } catch (error) {
      console.error("Failed to delete candidate", error);
      alert(error.response?.data?.error || "Failed to delete candidate");
    } finally {
      setDeleteBusy(false);
    }
  };

  const allowedExamTypesForEdit = useMemo(() => {
    const trade = masters.trades.find((item) => String(item.id) === String(editForm.tradeId));
    return tradeExamTypes(trade);
  }, [masters.trades, editForm.tradeId]);

  const allowedExamTypesForCreate = useMemo(() => {
    const trade = masters.trades.find((item) => String(item.id) === String(createForm.tradeId));
    return tradeExamTypes(trade);
  }, [masters.trades, createForm.tradeId]);

  const centersForEdit = useMemo(() => {
    if (!editForm.commandId) return [];
    return centersByCommand.get(Number(editForm.commandId)) || [];
  }, [centersByCommand, editForm.commandId]);

  const centersForCreate = useMemo(() => {
    if (!createForm.commandId) return [];
    return centersByCommand.get(Number(createForm.commandId)) || [];
  }, [centersByCommand, createForm.commandId]);

  const attemptSummary = candidateDetail?.examAttempts || [];

  const handleCreateInput = (field, value) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCreateError("");
  };

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
      });

      setCreateForm(defaultCreateForm);
      setCreateOpen(false);
      await loadCandidates();
      alert("Candidate created successfully");
    } catch (error) {
      console.error("Failed to create candidate", error);
      setCreateError(error.response?.data?.error || "Failed to create candidate");
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="candidate-manager">
      <div className="candidate-sidebar">
        <div className="sidebar-header">
          <h2>Candidates</h2>
          <button
            type="button"
            className="primary"
            onClick={() => setCreateOpen(true)}
          >
            + Add Candidate
          </button>
        </div>

        <div className="search-bar">
          <input
            type="search"
            placeholder="Search by Army No, name or trade"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loadingList ? (
          <div className="placeholder">Loading candidates...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="placeholder">No candidates found</div>
        ) : (
          <ul className="candidate-list">
            {filteredCandidates.map((candidate) => (
              <li
                key={candidate.id}
                className={candidate.id === selectedCandidateId ? "active" : ""}
                onClick={() => handleSelectCandidate(candidate.id)}
              >
                <div className="candidate-name">{candidate.name}</div>
                <div className="candidate-meta">
                  <span>{candidate.armyNo}</span>
                  <span>{candidate.trade?.name || "—"}</span>
                </div>
                <div className="candidate-summary">
                  <span>{candidate.selectedExamTypes?.join(", ") || "No exams"}</span>
                  <span>
                    {candidate.attemptSummary?.completed || 0} completed · {candidate.attemptSummary?.inProgress || 0} in progress
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="candidate-detail">
        {!selectedCandidateId ? (
          <div className="placeholder detail">Select a candidate to view and manage details</div>
        ) : detailLoading ? (
          <div className="placeholder detail">Loading candidate detail...</div>
        ) : detailError ? (
          <div className="placeholder detail error">{detailError}</div>
        ) : !candidateDetail ? (
          <div className="placeholder detail">Candidate not found</div>
        ) : (
          <div className="detail-content">
            <header className="detail-header">
              <div>
                <h1>{candidateDetail.name}</h1>
                <p>Army No: {candidateDetail.armyNo}</p>
              </div>
              <div className="detail-actions">
                <button type="button" className="danger" disabled={deleteBusy} onClick={handleDelete}>
                  {deleteBusy ? "Deleting..." : "Delete"}
                </button>
                <button type="button" className="primary" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </header>

            {saveMessage && <div className="banner">{saveMessage}</div>}

            <section className="form-grid">
              <div className="form-group">
                <label>Army Number</label>
                <input value={editForm.armyNo} disabled readOnly />
              </div>

              <div className="form-group">
                <label>Candidate Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Unit</label>
                <input
                  value={editForm.unit}
                  onChange={(e) => handleEditChange("unit", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Medical Category</label>
                <input
                  value={editForm.medCat}
                  onChange={(e) => handleEditChange("medCat", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Corps</label>
                <input
                  value={editForm.corps}
                  onChange={(e) => handleEditChange("corps", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={editForm.dob}
                  onChange={(e) => handleEditChange("dob", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Date of Enrolment</label>
                <input
                  type="date"
                  value={editForm.doe}
                  onChange={(e) => handleEditChange("doe", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Rank</label>
                <select
                  value={editForm.rankId}
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

              <div className="form-group">
                <label>Trade</label>
                <select
                  value={editForm.tradeId}
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

              <div className="form-group">
                <label>Command</label>
                <select
                  value={editForm.commandId}
                  onChange={(e) => handleCommandChange(e.target.value)}
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
                  value={editForm.centerId}
                  onChange={(e) => handleCenterChange(e.target.value)}
                >
                  <option value="">Select Center</option>
                  {centersForEdit.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="exam-types">
              <h3>Exam Types</h3>
              {allowedExamTypesForEdit.length === 0 ? (
                <p className="muted">Selected trade does not have configured exam types.</p>
              ) : (
                <div className="pill-group">
                  {allowedExamTypesForEdit.map((type) => (
                    <label key={type} className={`pill ${editForm.selectedExamTypes.includes(type) ? "active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={editForm.selectedExamTypes.includes(type)}
                        onChange={() => handleExamTypeToggle(type)}
                      />
                      {EXAM_DISPLAY_NAMES[type]}
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="slots">
              <h3>Exam Slots</h3>
              {slotOptions.length === 0 ? (
                <p className="muted">No slots available for the selected trade and exam types.</p>
              ) : (
                <div className="slot-grid">
                  {slotOptions.map((slot) => {
                    const active = editForm.slotIds.includes(slot.id);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={`slot-card ${active ? "active" : ""}`}
                        onClick={() => handleSlotToggle(slot.id)}
                      >
                        <span className="slot-paper">{slot.paperType}</span>
                        <span className="slot-time">
                          {formatDateTime(slot.startTime)}
                        </span>
                        <span className="slot-locale">{slot.center?.name || "Center"}</span>
                        <span className="slot-count">{slot.currentCount} assigned · {slot.questionCount || 0} qns</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="attempts">
              <h3>Exam Attempts</h3>
              {attemptSummary.length === 0 ? (
                <p className="muted">No exam attempts recorded.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Paper</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Percentage</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attemptSummary.map((attempt) => (
                      <tr key={attempt.id}>
                        <td>{attempt.examPaper?.paperType || "—"}</td>
                        <td>{attempt.status}</td>
                        <td>{attempt.score ?? "—"}</td>
                        <td>
                          {typeof attempt.percentage === "number"
                            ? `${attempt.percentage.toFixed(2)}%`
                            : "—"}
                        </td>
                        <td>{formatDateTime(attempt.submittedAt) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}
      </div>

      {createOpen && (
        <div className="modal-backdrop" onClick={(e) => e.target.classList.contains("modal-backdrop") && setCreateOpen(false)}>
          <div className="modal">
            <header className="modal-header">
              <h2>Create Candidate</h2>
              <button type="button" className="icon" onClick={() => setCreateOpen(false)}>
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
                      handleTradeChange(e.target.value, "create");
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
                      handleCommandChange(e.target.value, "create");
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
                          onChange={() => handleExamTypeToggle(type, "create")}
                        />
                        {EXAM_DISPLAY_NAMES[type]}
                      </label>
                    ))}
                  </div>
                )}
              </section>

              {createError && <div className="banner error">{createError}</div>}

              <footer className="modal-footer">
                <button type="button" className="secondary" onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={createSubmitting}>
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
