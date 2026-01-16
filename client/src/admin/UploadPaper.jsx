import { useState } from "react";
import api from "../api/api";

export default function UploadPaper() {
  const [form, setForm] = useState({});

  const upload = async () => {
    await api.post("/exam/upload-paper", form);
    alert("Paper uploaded");
  };

  return (
    <div>
      <h2>Upload Exam Paper</h2>

      <input placeholder="Trade ID"
        onChange={e => setForm({ ...form, tradeId: e.target.value })} />

      <input placeholder="Paper Type (WP-I)"
        onChange={e => setForm({ ...form, paperType: e.target.value })} />

      <input placeholder="Question"
        onChange={e => setForm({ ...form, question: e.target.value })} />

      <input placeholder="Option A"
        onChange={e => setForm({ ...form, optionA: e.target.value })} />
      <input placeholder="Option B"
        onChange={e => setForm({ ...form, optionB: e.target.value })} />
      <input placeholder="Option C"
        onChange={e => setForm({ ...form, optionC: e.target.value })} />
      <input placeholder="Option D"
        onChange={e => setForm({ ...form, optionD: e.target.value })} />

      <input placeholder="Correct (A/B/C/D)"
        onChange={e => setForm({ ...form, correct: e.target.value })} />

      <input placeholder="Marks"
        onChange={e => setForm({ ...form, marks: e.target.value })} />

      <button onClick={upload}>Upload</button>
    </div>
  );
}
