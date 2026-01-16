import { useEffect, useState } from "react";
import api from "../api/api";

export default function TradeConfig() {
  const [trades, setTrades] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/admin/trade").then(res => setTrades(res.data));
  }, []);

  const save = async () => {
    await api.post("/admin/trade", selected);
    alert("Trade updated");
  };

  if (!selected) {
    return (
      <div>
        <h2>Select Trade</h2>
        {trades.map(t => (
          <button key={t.id} onClick={() => setSelected(t)}>
            {t.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2>{selected.name}</h2>

      <label>
        Negative Marking
        <input
          type="number"
          step="0.25"
          value={selected.negativeMarking || ""}
          onChange={e =>
            setSelected({ ...selected, negativeMarking: Number(e.target.value) })
          }
        />
      </label>

      {["wp1","wp2","pr1","pr2","pr3","pr4","pr5","oral"].map(f => (
        <label key={f}>
          <input
            type="checkbox"
            checked={selected[f]}
            onChange={e =>
              setSelected({ ...selected, [f]: e.target.checked })
            }
          />
          {f.toUpperCase()}
        </label>
      ))}

      <button onClick={save}>Save</button>
    </div>
  );
}
