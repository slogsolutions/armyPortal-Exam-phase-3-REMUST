import { useState } from "react";
import api from "../api/api";

export default function Results() {
  const [candidateId, setCandidateId] = useState("");
  const [result, setResult] = useState(null);

  const load = async () => {
    const res = await api.get(`/result/${candidateId}`);
    setResult(res.data);
  };

  return (
    <div>
      <h2>Results</h2>

      <input
        placeholder="Candidate ID"
        onChange={e => setCandidateId(e.target.value)}
      />

      <button onClick={load}>Fetch</button>

      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
