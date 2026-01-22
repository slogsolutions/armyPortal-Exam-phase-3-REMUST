import { useEffect, useState } from "react";
import api from "../api/api";
import "./TradeConfig.css";

export default function TradeConfig() {
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [configData, setConfigData] = useState({
    wp1: false,
    wp2: false,
    wp3: false,
    practical: false,
    oral: false,
    negativeMarking: 0
  });

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const res = await api.get("/admin/trade");
      setTrades(res.data);
    } catch (err) {
      console.error("Failed to fetch trades:", err);
    }
  };

  const handleTradeSelect = async (trade) => {
    setSelectedTrade(trade);
    if (trade) {
      try {
        const res = await api.get(`/admin/trade/${trade.id}`);
        setConfigData(res.data);
      } catch (err) {
        console.error("Failed to fetch trade config:", err);
      }
    }
  };

  const handleConfigChange = (field, value) => {
    setConfigData(prev => ({ ...prev, [field]: value }));
  };

  const saveConfig = async () => {
    if (!selectedTrade) {
      alert("Please select a trade first");
      return;
    }

    try {
      await api.put(`/admin/trade/${selectedTrade.id}`, configData);
      alert("Trade configuration saved successfully!");
    } catch (err) {
      console.error("Failed to save trade config:", err);
      alert("Failed to save trade configuration. Please try again.");
    }
  };

  return (
    <div className="trade-config-page">
      <div className="config-layout">
        <div className="trades-list">
          <h3>Select Trade</h3>
          <div className="trade-cards">
            {trades.map(trade => (
              <div
                key={trade.id}
                className={`trade-card ${selectedTrade?.id === trade.id ? "selected" : ""}`}
                onClick={() => handleTradeSelect(trade)}
              >
                <h4>{trade.name}</h4>
                <p>Configure exam types and settings</p>
              </div>
            ))}
          </div>
        </div>

        <div className="config-panel">
          {selectedTrade ? (
            <>
              <h3>Configure: {selectedTrade.name}</h3>
              
              <div className="config-section">
                <h4>Written Exam Types</h4>
                <div className="exam-types">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configData.wp1}
                      onChange={(e) => handleConfigChange("wp1", e.target.checked)}
                    />
                    WP-I (Written Paper I)
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configData.wp2}
                      onChange={(e) => handleConfigChange("wp2", e.target.checked)}
                    />
                    WP-II (Written Paper II)
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configData.wp3}
                      onChange={(e) => handleConfigChange("wp3", e.target.checked)}
                    />
                    WP-III (Written Paper III)
                  </label>
                </div>
              </div>

              <div className="config-section">
                <h4>Practical/Oral Exam Types</h4>
                <div className="exam-types">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configData.practical}
                      onChange={(e) => handleConfigChange("practical", e.target.checked)}
                    />
                    Practical Exam
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={configData.oral}
                      onChange={(e) => handleConfigChange("oral", e.target.checked)}
                    />
                    Oral Exam
                  </label>
                </div>
              </div>

              <div className="config-section">
                <h4>Marking Settings</h4>
                <div className="marking-config">
                  <label>
                    Negative Marking (per wrong answer):
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.25"
                      value={configData.negativeMarking}
                      onChange={(e) => handleConfigChange("negativeMarking", parseFloat(e.target.value))}
                    />
                    marks
                  </label>
                </div>
              </div>

              <div className="save-section">
                <button className="save-btn" onClick={saveConfig}>
                  Save Configuration
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <h3>No Trade Selected</h3>
              <p>Please select a trade from the left to configure its settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
