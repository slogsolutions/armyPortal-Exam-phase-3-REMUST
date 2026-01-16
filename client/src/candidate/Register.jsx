import { useEffect, useState } from "react";
import api from "../api/api";

export default function Register() {
  const [form, setForm] = useState({});
  const [masters, setMasters] = useState({
    ranks: [], trades: [], commands: [], centers: []
  });
  const [tradeConfig, setTradeConfig] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/admin/rank"),
      api.get("/admin/trade"),
      api.get("/admin/command"),
      api.get("/admin/center")
    ]).then(([r, t, c, ce]) => {
      setMasters({
        ranks: r.data,
        trades: t.data,
        commands: c.data,
        centers: ce.data
      });
    });
  }, []);

  const onTradeChange = async (tradeId) => {
    setForm({ ...form, tradeId });
    const trade = masters.trades.find(t => t.id === Number(tradeId));
    setTradeConfig(trade);
  };

  const submit = async () => {
    await api.post("/candidate/register", form);
    alert("Registered Successfully");
    window.location.href = "/instructions";
  };

  return (
    <div>
      <h2>Army Exam Registration</h2>

      <input placeholder="Army No"
        onChange={e => setForm({ ...form, armyNo: e.target.value })} />

      <input placeholder="Name"
        onChange={e => setForm({ ...form, name: e.target.value })} />

      <select onChange={e => setForm({ ...form, rankId: e.target.value })}>
        <option>Select Rank</option>
        {masters.ranks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      <select onChange={e => onTradeChange(e.target.value)}>
        <option>Select Trade</option>
        {masters.trades.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      {/* Dynamic WP / PR / ORAL */}
      {tradeConfig && (
        <div>
          {tradeConfig.wp1 && <label><input type="checkbox" defaultChecked /> WP-I</label>}
          {tradeConfig.wp2 && <label><input type="checkbox" defaultChecked /> WP-II</label>}
          {tradeConfig.pr1 && <label>PR-I</label>}
          {tradeConfig.pr2 && <label>PR-II</label>}
          {tradeConfig.pr3 && <label>PR-III</label>}
          {tradeConfig.pr4 && <label>PR-IV</label>}
          {tradeConfig.pr5 && <label>PR-V</label>}
          {tradeConfig.oral && <label>ORAL</label>}
        </div>
      )}

      <button onClick={submit}>Submit</button>
    </div>
  );
}
