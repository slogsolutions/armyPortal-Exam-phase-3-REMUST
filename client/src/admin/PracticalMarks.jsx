import { useState } from "react";
import api from "../api/api";

export default function PracticalMarks() {
  const [data, setData] = useState({});

  const submit = async () => {
    await api.post("/practical/submit", data);
    alert("Marks saved");
  };

  return (
    <div>
      <h2>Practical Marks</h2>

      <input placeholder="Candidate ID"
        onChange={e => setData({ ...data, candidateId: e.target.value })} />

      <input placeholder="Trade ID"
        onChange={e => setData({ ...data, tradeId: e.target.value })} />

      {["pr1","pr2","pr3","pr4","pr5","oral"].map(f => (
        <input key={f}
          placeholder={f.toUpperCase()}
          onChange={e => setData({ ...data, [f]: e.target.value })}
        />
      ))}

      <button onClick={submit}>Save</button>
    </div>
  );
}
