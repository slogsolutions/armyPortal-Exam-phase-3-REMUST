import { useEffect, useState } from "react";
import api from "../api/api";
import "./UploadPaper.css";

export default function UploadPaper() {
  const [masters, setMasters] = useState({ trades: [] });
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
  const [fileMeta, setFileMeta] = useState({ name: "", extension: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const allowedExtensions = ["csv", "xls", "xlsx", "dat"];

  useEffect(() => {
    api.get("/admin/masters")
      .then(res => setMasters(res.data))
      .catch(() => alert("Failed to load trades"));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setUploading(true);
    setUploadResult(null);

    try {
      if (!file) {
        setFormError("Please select a file to upload.");
        throw new Error("Please select a file to upload");
      }

      const extension = (fileMeta.extension || file.name.split(".").pop() || "").toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        setFormError("Unsupported file type. Please upload CSV, XLSX, XLS, or DAT files.");
        throw new Error("Unsupported file type");
      }

      if (extension === "dat" && !password.trim()) {
        setFormError("Enter the password to decrypt .dat files before uploading.");
        throw new Error("Password required for .dat upload");
      }

      const formData = new FormData();
      formData.append("file", file);

      if (extension) {
        formData.append("fileType", extension);
      }

      const trimmedPassword = password.trim();
      if (trimmedPassword && extension === "dat") {
        formData.append("password", trimmedPassword);
      }

      const res = await api.post("/exam/bulk-upload", formData);
      setUploadResult(res.data);

      if (res.data.success) {
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
      if (formError) {
        setUploading(false);
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const extension = (selectedFile.name.split(".").pop() || "").toLowerCase();
      setFileMeta({ name: selectedFile.name, extension });
      setPassword("");
      setFormError("");
    }
    if (!selectedFile) {
      setFile(null);
      setFileMeta({ name: "", extension: "" });
      setPassword("");
    }
  };

  const isDatFile = fileMeta.extension === "dat";

  return (
    <div className="upload-paper-page">
      <div className="upload-header">
        <h2>Upload Question Papers</h2>
      </div>

      <div className="upload-form">
        <div className="form-section">
          <h3>Bulk Upload (.xlsx / .csv / .dat)</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group full-width">
                <label>Select File *</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.dat"
                  onChange={handleFileChange}
                  required
                />
                <p className="form-helper">
                  Supports Excel (.xlsx, .xls), CSV, and encrypted DAT packages. Provide a password when uploading DAT files.
                </p>
              </div>
            </div>

            {file && isDatFile && (
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
            {formError && <div className="form-error">{formError}</div>}
          </form>
        </div>
      </div>

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
