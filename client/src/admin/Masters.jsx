import { useState } from "react";
import api from "../api/api";

export default function Masters() {
  const [type, setType] = useState("rank");
  const [name, setName] = useState("");

  const submit = async () => {
    await api.post(`/admin/${type}`, { name });
    alert(`${type} added`);
    setName("");
  };

  return (
    <div>
      <h2>Master Data</h2>

      <select onChange={e => setType(e.target.value)}>
        <option value="rank">Rank</option>
        <option value="trade">Trade</option>
        <option value="command">Command</option>
        <option value="center">Center</option>
      </select>

      <input
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <button onClick={submit}>Add</button>
    </div>
  );
}
