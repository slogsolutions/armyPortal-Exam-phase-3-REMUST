import { useEffect, useState } from "react";
import api from "../api/api";

export default function Result() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/result/1").then(res => setData(res.data));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>Result</h2>

      {data.theoryResults.map(r => (
        <p key={r.paper}>
          {r.paper}: {r.status} {r.score ?? ""}
        </p>
      ))}

      <h3>Overall: {data.overallResult}</h3>
    </div>
  );
}
