import { useEffect, useState } from "react";
import api from "../api/api";
import "./UploadPaper.css";

export default function UploadPaper() {
  const [masters, setMasters] = useState({ trades: [] });
  const [uploadMode, setUploadMode] = useState("single"); // "single" or "bulk"
  const [form, setForm] = useState({
    tradeId: "",
    paperType: "",
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "",
    marks: "1.0"
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    api.get("/admin/masters")
      .then(res => setMasters(res.data))
      .catch(() => alert("Failed to load trades"));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSingleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadResult(null);

    try {
      const res = await api.post("/exam/upload-paper", form);
      setUploadResult({
        success: true,
        message: "Question uploaded successfully!",
        data: res.data
      });
      // Reset form
      setForm({
        tradeId: form.tradeId,
        paperType: form.paperType,
        questionText: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "",
        marks: "1.0"
      });
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.response?.data?.error || "Upload failed"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/exam/bulk-upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setUploadResult({
        success: true,
        message: `Successfully uploaded ${res.data.uploaded} questions!`,
        errors: res.data.errors,
        uploaded: res.data.uploaded,
        totalErrors: res.data.errors
      });
    } catch (error) {
      setUploadResult({
        success: false,
        message: error.response?.data?.error || "Bulk upload failed"
      });
    } finally {
      setUploading(false);
    }
  };

  const paperTypes = ["WP-I", "WP-II"]; // Only written papers - PR and ORAL are evaluated by Exam Officer

  return (
    <div className="upload-paper-page">
      <div className="upload-container">
        <h1>Upload Exam Paper</h1>

        <div className="upload-mode-selector">
          <button
            className={`mode-btn ${uploadMode === "single" ? "active" : ""}`}
            onClick={() => setUploadMode("single")}
          >
            Single Question Upload
          </button>
          <button
            className={`mode-btn ${uploadMode === "bulk" ? "active" : ""}`}
            onClick={() => setUploadMode("bulk")}
          >
            Bulk Excel Upload
          </button>
        </div>

        {uploadMode === "single" ? (
          <form className="upload-form" onSubmit={handleSingleUpload}>
            <h2>Single Question Upload</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Trade *</label>
                <select
                  name="tradeId"
                  value={form.tradeId}
                  onChange={handleChange}
                  required
                >
                  <option value="">– Select Trade –</option>
                  {masters.trades.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Paper Type *</label>
                <select
                  name="paperType"
                  value={form.paperType}
                  onChange={handleChange}
                  required
                >
                  <option value="">– Select Paper Type –</option>
                  {paperTypes.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Question Text *</label>
              <textarea
                name="questionText"
                value={form.questionText}
                onChange={handleChange}
                rows="4"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Option A *</label>
                <input
                  type="text"
                  name="optionA"
                  value={form.optionA}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Option B *</label>
                <input
                  type="text"
                  name="optionB"
                  value={form.optionB}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Option C *</label>
                <input
                  type="text"
                  name="optionC"
                  value={form.optionC}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Option D *</label>
                <input
                  type="text"
                  name="optionD"
                  value={form.optionD}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Correct Answer (A/B/C/D) *</label>
                <select
                  name="correctAnswer"
                  value={form.correctAnswer}
                  onChange={handleChange}
                  required
                >
                  <option value="">– Select Correct Answer –</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div className="form-group">
                <label>Marks *</label>
                <input
                  type="number"
                  step="0.5"
                  name="marks"
                  value={form.marks}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Question"}
            </button>
          </form>
        ) : (
          <form className="upload-form" onSubmit={handleBulkUpload}>
            <h2>Bulk Excel Upload</h2>

            <div className="bulk-info">
              <h3>Excel File Format</h3>
              <p>Your Excel file should have the following columns:</p>
              <ul>
                <li><strong>Trade</strong> - Trade name (e.g., "JE NE REMUST", "OCC CL-II")</li>
                <li><strong>PaperType</strong> - Paper type (e.g., "WP-I", "PR-I", "ORAL")</li>
                <li><strong>Question</strong> - Question text</li>
                <li><strong>OptionA</strong> - Option A text</li>
                <li><strong>OptionB</strong> - Option B text</li>
                <li><strong>OptionC</strong> - Option C text</li>
                <li><strong>OptionD</strong> - Option D text</li>
                <li><strong>CorrectAnswer</strong> - Correct answer (A, B, C, or D)</li>
                <li><strong>Marks</strong> - Marks for the question (default: 1.0)</li>
              </ul>
              <p className="note">
                <strong>Note:</strong> The system will automatically create papers for trades if they don't exist.
                Questions will be added in the order they appear in the Excel file.
              </p>
            </div>

            <div className="form-group">
              <label>Excel File (.xlsx) *</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload Excel File"}
            </button>
          </form>
        )}

        {uploadResult && (
          <div className={`upload-result ${uploadResult.success ? "success" : "error"}`}>
            <h3>{uploadResult.success ? "✓ Success" : "✗ Error"}</h3>
            <p>{uploadResult.message}</p>
            {uploadResult.uploaded !== undefined && (
              <p>Uploaded: {uploadResult.uploaded} questions</p>
            )}
            {uploadResult.totalErrors > 0 && (
              <p className="error-count">Errors: {uploadResult.totalErrors} rows failed</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
