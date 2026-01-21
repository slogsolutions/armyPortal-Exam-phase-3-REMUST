import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import "./Masters.css";

const TAB_CONFIG = {
  ranks: {
    title: "Ranks",
    description: "Manage army ranks available for candidate registration",
    fields: [{ name: "name", label: "Rank Name", placeholder: "e.g., Signalman" }],
    endpoint: "/admin/rank",
    listKey: "ranks"
  },
  trades: {
    title: "Trades",
    description: "Configure trades available for exams",
    fields: [{ name: "name", label: "Trade Name", placeholder: "e.g., JE NE REMUST" }],
    endpoint: "/admin/trade",
    listKey: "trades"
  },
  commands: {
    title: "Commands",
    description: "Maintain command list for candidate mapping",
    fields: [{ name: "name", label: "Command Name", placeholder: "e.g., Northern Command" }],
    endpoint: "/admin/command",
    listKey: "commands"
  }
};

function Masters() {
  const [activeTab, setActiveTab] = useState("ranks");
  const [masters, setMasters] = useState({ ranks: [], trades: [], commands: [] });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "" });

  const activeConfig = useMemo(() => TAB_CONFIG[activeTab], [activeTab]);

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    setFormData({ name: "" });
    setError("");
  }, [activeTab]);

  const loadMasters = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/masters");
      setMasters({
        ranks: Array.isArray(res.data?.ranks) ? res.data.ranks : [],
        trades: Array.isArray(res.data?.trades) ? res.data.trades : [],
        commands: Array.isArray(res.data?.commands) ? res.data.commands : []
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load master data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError("Please provide a valid name");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post(activeConfig.endpoint, { name: formData.name.trim() });
      setFormData({ name: "" });
      await loadMasters();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to save record");
    } finally {
      setSubmitting(false);
    }
  };

  const renderListItems = () => {
    const items = masters[activeConfig.listKey] || [];
    if (!items.length) {
      return (
        <div className="empty-state">
          <p>No records found. Add the first entry using the form above.</p>
        </div>
      );
    }

    return (
      <div className="items-grid">
        {items.map((item) => (
          <div key={item.id} className="item-card">
            <span>{item.name}</span>
            {activeTab === "trades" && (
              <div className="item-metadata">
                <span>{item._count?.examPapers || 0} Papers</span>
                <span>{item._count?.candidates || 0} Candidates</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="masters-page">
      <div className="tab-navigation">
        {Object.entries(TAB_CONFIG).map(([tabKey, config]) => (
          <button
            key={tabKey}
            type="button"
            className={`tab-button ${activeTab === tabKey ? "active" : ""}`}
            onClick={() => setActiveTab(tabKey)}
          >
            {config.title}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="content-section">
          <h3>{activeConfig.title}</h3>
          <p className="section-description">{activeConfig.description}</p>

          <form className="form-section" onSubmit={handleSubmit}>
            {activeConfig.fields.map((field) => (
              <div key={field.name} className="form-row">
                <input
                  type="text"
                  value={formData[field.name] || ""}
                  placeholder={field.placeholder}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  disabled={submitting}
                />
                <button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : `Add ${activeConfig.title.slice(0, -1)}`}
                </button>
              </div>
            ))}
            {error && <div className="error-banner">{error}</div>}
          </form>
        </div>

        <div className="list-section">
          <h4>Existing {activeConfig.title}</h4>
          {loading ? (
            <div className="loading-state">Loading data...</div>
          ) : (
            renderListItems()
          )}
        </div>
      </div>
    </div>
  );
}

export default Masters;
