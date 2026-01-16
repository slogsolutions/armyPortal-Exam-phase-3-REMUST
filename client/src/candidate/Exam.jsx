import { useEffect, useState } from "react";
import api from "../api/api";

export default function Exam() {
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    api.get("/exam/paper/1/WP-I").then(res => setPaper(res.data));
  }, []);

  const submit = async () => {
    await api.post("/exam/submit", {
      attemptId: 1,
      answers
    });
    document.exitFullscreen();
    window.location.href = "/result";
  };

  if (!paper) return <p>Loading...</p>;

  return (
    <div>
      <h2>{paper.paperType}</h2>

      {paper.questions.map(q => (
        <div key={q.id}>
          <p>{q.question}</p>
          {["A", "B", "C", "D"].map(opt => (
            <label key={opt}>
              <input type="radio"
                name={q.id}
                onChange={() =>
                  setAnswers(a => [...a.filter(x => x.questionId !== q.id),
                    { questionId: q.id, selected: opt }])
                }
              />
              {q[`option${opt}`]}
            </label>
          ))}
        </div>
      ))}

      <button onClick={submit}>Submit</button>
    </div>
  );
}
