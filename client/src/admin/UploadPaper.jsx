import { useEffect, useState } from "react";
import api from "../api/api";
import "./UploadPaper.css";

export default function UploadPaper() {
  const [masters, setMasters] = useState({ trades: [] });
  const [uploadMode, setUploadMode] = useState("single");
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
  const [password, setPassword] = useState("");

  useEffect(() => {
    api.get("/admin/masters")
      .then(res => setMasters(res.data))
      .catch(() => alert("Failed to load trades"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadResult(null);

    try {
      const endpoint = uploadMode === "single" ? "/exam/upload-paper" : "/exam/bulk-upload";
      let res;

      if (uploadMode === "single") {
        const payload = {
          tradeId: Number(form.tradeId),
          paperType: form.paperType.trim().toUpperCase(),
          questionText: form.questionText,
          optionA: form.optionA,
          optionB: form.optionB,
          optionC: form.optionC,
          optionD: form.optionD,
          correctAnswer: form.correctAnswer,
          marks: parseFloat(form.marks)
        };

        res = await api.post(endpoint, payload);
      } else {
        if (!file) {
          throw new Error("Please select a file to upload");
        }

        const formData = new FormData();
        formData.append("file", file);

        const fileExtension = file.name.split(".").pop();
        if (fileExtension) {
          formData.append("fileType", fileExtension.toLowerCase());
        }
        if (password) {
          formData.append("password", password);
        }

        res = await api.post(endpoint, formData);
      }
      setUploadResult(res.data);

      if (res.data.success) {
        setForm({
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
        setFile(null);
        setPassword("");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      const errorData = err.response?.data;
      if (errorData) {
        setUploadResult({
          ...errorData,
          success: errorData.success ?? false,
          error: errorData.error || errorData.message || err.message || "Upload failed"
        });
      } else {
        setUploadResult({ success: false, status: "failed", error: err.message || "Upload failed" });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPassword("");
    }
  };

  return (
    <div className="upload-paper-page">
      <div className="upload-header">
        <h2>Upload Question Papers</h2>
      </div>

      <div className="upload-mode-selector">
        <label>
          <input
            type="radio"
            name="uploadMode"
            value="single"
            checked={uploadMode === "single"}
            onChange={(e) => setUploadMode(e.target.value)}
          />
          Single Question
        </label>
        <label>
          <input
            type="radio"
            name="uploadMode"
            value="bulk"
            checked={uploadMode === "bulk"}
            onChange={(e) => setUploadMode(e.target.value)}
          />
          Bulk Upload (Excel/CSV)
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        {uploadMode === "single" ? (
          <div className="upload-form">
            <div className="form-section">
              <h3>Single Question Upload</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Trade *</label>
                  <select
                    value={form.tradeId}
                    onChange={(e) => setForm(prev => ({ ...prev, tradeId: e.target.value }))}
                    required
                  >
                    <option value="">Select Trade</option>
                    {masters.trades.map(trade => (
                      <option key={trade.id} value={trade.id}>
                        {trade.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Paper Type *</label>
                  <input
                    type="text"
                    placeholder="e.g., WP-I, WP-II, PR-I"
                    value={form.paperType}
                    onChange={(e) => setForm(prev => ({ ...prev, paperType: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Question Text *</label>
                  <textarea
                    placeholder="Enter the question text"
                    value={form.questionText}
                    onChange={(e) => setForm(prev => ({ ...prev, questionText: e.target.value }))}
                    required
                    rows="4"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Option A</label>
                  <input
                    type="text"
                    placeholder="Option A text"
                    value={form.optionA}
                    onChange={(e) => setForm(prev => ({ ...prev, optionA: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Option B</label>
                  <input
                    type="text"
                    placeholder="Option B text"
                    value={form.optionB}
                    onChange={(e) => setForm(prev => ({ ...prev, optionB: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Option C</label>
                  <input
                    type="text"
                    placeholder="Option C text"
                    value={form.optionC}
                    onChange={(e) => setForm(prev => ({ ...prev, optionC: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Option D</label>
                  <input
                    type="text"
                    placeholder="Option D text"
                    value={form.optionD}
                    onChange={(e) => setForm(prev => ({ ...prev, optionD: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Correct Answer</label>
                  <select
                    value={form.correctAnswer}
                    onChange={(e) => setForm(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    required
                  >
                    <option value="">Select Correct Answer</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.marks}
                    onChange={(e) => setForm(prev => ({ ...prev, marks: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Question"}
              </button>
            </div>
          </div>
        ) : (
          <div className="upload-form">
            <div className="form-section">
              <h3>Bulk Upload (Excel/CSV)</h3>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Select File *</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.dat"
                    onChange={handleFileChange}
                    required
                  />
                </div>
              </div>

              {file && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Password (for .dat files)</label>
                    <input
                      type="password"
                      placeholder="Enter password for encrypted .dat files"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload File"}
              </button>
            </div>
          </div>
        )}
      </form>

      {uploadResult && (
        (() => {
          const status = uploadResult.status || (uploadResult.success ? "success" : "failed");
          const headings = {
            success: "✅ Upload Successful",
            partial: "⚠️ Upload Partially Successful",
            failed: "❌ Upload Failed"
          };
          const headline = headings[status] || "Upload Result";
          const totalRows = uploadResult.totalRows ?? (uploadResult.uploaded ?? 0) + (uploadResult.errorCount ?? 0);

          return (
            <div className={`upload-result status-${status}`}>
              <h3>{headline}</h3>
              <p>
                {uploadResult.message || uploadResult.error ||
                  (status === "success"
                    ? "Questions uploaded successfully."
                    : "Upload completed with issues. Review the details below.")}
              </p>

              <div className="upload-stat-grid">
                <div className="stat-pill">
                  <span className="label">Total Rows</span>
                  <span className="value">{totalRows}</span>
                </div>
                <div className="stat-pill">
                  <span className="label">Created</span>
                  <span className="value">{uploadResult.uploaded ?? 0}</span>
                </div>
                <div className="stat-pill">
                  <span className="label">Errors</span>
                  <span className="value">{uploadResult.errorCount ?? (uploadResult.errors?.length ?? 0)}</span>
                </div>
              </div>

              {uploadResult.summary?.length > 0 && (
                <div className="upload-summary">
                  <h4>Summary by Trade &amp; Paper</h4>
                  <table className="upload-summary-table">
                    <thead>
                      <tr>
                        <th>Trade</th>
                        <th>Paper Type</th>
                        <th>Attempted</th>
                        <th>Created</th>
                        <th>Errors</th>
                        <th>Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResult.summary.map((entry, index) => (
                        <tr key={`${entry.tradeName}-${entry.paperType}-${index}`}>
                          <td>{entry.tradeName}</td>
                          <td>{entry.paperType}</td>
                          <td>{entry.attempted}</td>
                          <td>{entry.created}</td>
                          <td>{entry.errors}</td>
                          <td>{entry.pending}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {uploadResult.errorBreakdown?.length > 0 && (
                <div className="upload-errors">
                  <h4>Error Breakdown</h4>
                  <ul>
                    {uploadResult.errorBreakdown.map(({ reason, count }, index) => (
                      <li key={`${reason}-${index}`}>
                        <span className="reason">{reason}</span>
                        <span className="count">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.errorSamples?.length > 0 && (
                <details className="error-samples" open={status !== "success"}>
                  <summary>View sample problematic rows ({uploadResult.errorSamples.length})</summary>
                  <div className="samples">
                    {uploadResult.errorSamples.map((sample, index) => (
                      <div key={index} className="sample-row">
                        <pre>{JSON.stringify(sample.row, null, 2)}</pre>
                        <p className="sample-error">{sample.error}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
