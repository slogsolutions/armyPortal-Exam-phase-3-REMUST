import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import "./CandidateProfile.css";

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
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

const tradeExamTypes = (trade) =>
  trade
    ? TRADE_EXAM_FLAGS.filter(({ flag }) => trade[flag]).map(({ label }) => label)
    : [];

export default function CandidateProfile() {
  const { candidateId } = useParams();
  const navigate = useNavigate();

  const [masters, setMasters] = useState({
    ranks: [],
    trades: [],
    commands: [],
    centers: [],
  });

  const [candidateDetail, setCandidateDetail] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------------- AUTH ---------------- */
  const handleAuthError = (err) => {
    if ([401, 403].includes(err?.response?.status)) {
      alert("Session expired. Login again.");
      navigate("/admin/login", { replace: true });
      return true;
    }
    return false;
  };

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }
    loadMasters();
    loadCandidate();
  }, [candidateId]);

  const loadMasters = async () => {
    try {
      const res = await api.get("/admin/masters");
      setMasters({
        ranks: res.data?.ranks || [],
        trades: res.data?.trades || [],
        commands: res.data?.commands || [],
        centers: res.data?.centers || [],
      });
    } catch (e) {
      if (handleAuthError(e)) return;
    }
  };

  const loadCandidate = async () => {
    try {
      const res = await api.get(`/candidate/${candidateId}`);
      const c = res.data;

      setCandidateDetail(c);
      setEditForm({
        id: c.id,
        armyNo: c.armyNo || "",
        name: c.name || "",
        unit: c.unit || "",
        medCat: c.medCat || "",
        dob: formatDate(c.dob),
        doe: formatDate(c.doe),
        rankId: String(c.rankId || ""),
        tradeId: String(c.tradeId || ""),
        commandId: String(c.commandId || ""),
        centerId: String(c.centerId || ""),
        selectedExamTypes: c.selectedExamTypes || [],
        slotIds: (c.examSlots || []).map((s) => s.id),
      });
    } catch (e) {
      if (handleAuthError(e)) return;
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- HELPERS ---------------- */
  const allowedExamTypes = useMemo(() => {
    const trade = masters.trades.find(
      (t) => String(t.id) === String(editForm.tradeId)
    );
    return tradeExamTypes(trade);
  }, [masters.trades, editForm.tradeId]);

  const handleChange = (field, value) => {
    setEditForm((p) => ({ ...p, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/candidate/${editForm.id}`, {
        name: editForm.name,
        unit: editForm.unit,
        medCat: editForm.medCat,
        dob: editForm.dob,
        doe: editForm.doe,
        rankId: Number(editForm.rankId),
        tradeId: Number(editForm.tradeId),
        commandId: Number(editForm.commandId),
        centerId: editForm.centerId ? Number(editForm.centerId) : null,
        selectedExamTypes: editForm.selectedExamTypes,
        slotIds: editForm.slotIds,
      });
      alert("Candidate updated");
    } catch (e) {
      if (handleAuthError(e)) return;
      alert("Update failed");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return <div className="candidate-profile-loading">Loading…</div>;
  }

  if (!candidateDetail) {
    return <div>Candidate not found</div>;
  }

  return (
    <div className="candidate-profile-page">
      <div className="profile-header">
        <div className="breadcrumb">
          <span onClick={() => navigate("/admin")}>Home</span> •
          <span onClick={() => navigate("/admin/candidates")}>
            Candidates
          </span>{" "}
          • <span>{editForm.armyNo}</span>
        </div>
        <h1>Candidate Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-form-section">
          <div className="form-grid">
            {/* Army No */}
            <div className="form-row">
              <label>Army No</label>
              <input value={editForm.armyNo} disabled />
            </div>

            {/* Name */}
            <div className="form-row">
              <label>Name</label>
              <input
                value={editForm.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>

            {/* Rank */}
            <div className="form-row">
              <label>Rank</label>
              <select
                value={editForm.rankId}
                onChange={(e) => handleChange("rankId", e.target.value)}
              >
                <option value="">Select</option>
                {masters.ranks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Trade */}
            <div className="form-row">
              <label>Trade</label>
              <select
                value={editForm.tradeId}
                onChange={(e) => handleChange("tradeId", e.target.value)}
              >
                <option value="">Select</option>
                {masters.trades.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div className="form-row">
              <label>Unit</label>
              <input
                value={editForm.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
              />
            </div>

            {/* Med Cat */}
            <div className="form-row">
              <label>Med Cat</label>
              <input
                value={editForm.medCat}
                onChange={(e) => handleChange("medCat", e.target.value)}
              />
            </div>

            {/* DOB */}
            <div className="form-row">
              <label>DOB</label>
              <input
                type="date"
                value={editForm.dob}
                onChange={(e) => handleChange("dob", e.target.value)}
              />
            </div>

            {/* DOE */}
            <div className="form-row">
              <label>DOE</label>
              <input
                type="date"
                value={editForm.doe}
                onChange={(e) => handleChange("doe", e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
