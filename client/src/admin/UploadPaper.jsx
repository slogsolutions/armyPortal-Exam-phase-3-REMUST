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
  const [password, setPassword] = useState("");
  const [fileType, setFileType] = useState("excel");

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

    if (fileType === 'dat' && !password) {
      alert("Password is required for encrypted .dat files");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("password", password);
      formData.append("fileType", fileType);

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

  const paperTypes = ["WP-I", "WP-II", "WP-III"]; // Written papers - PR and ORAL are evaluated by Exam Officer

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
            <h2>Bulk Upload</h2>

            <div className="form-group">
              <label>File Type *</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                required
              >
                <option value="excel">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="dat">Encrypted (.dat)</option>
              </select>
            </div>

            {fileType === 'dat' && (
              <div className="form-group">
                <label>Password for .dat file *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for encrypted file"
                  required
                />
              </div>
            )}

            <div className="bulk-info">
              <h3>File Format</h3>
              {fileType === 'excel' && (
                <p>Excel file should have columns: Trade, PaperType, Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks</p>
              )}
              {fileType === 'csv' && (
                <p>CSV file should have columns: Trade, PaperType, Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks</p>
              )}
              {fileType === 'dat' && (
                <p>Encrypted .dat file containing JSON array of questions with the same structure as Excel/CSV</p>
              )}
              <p className="note">
                <strong>Note:</strong> The system will automatically create papers for trades if they don't exist.
                Questions will be added in the order they appear in the file.
              </p>
            </div>

            <div className="form-group">
              <label>
                {fileType === 'excel' && 'Excel File (.xlsx) *'}
                {fileType === 'csv' && 'CSV File (.csv) *'}
                {fileType === 'dat' && 'Encrypted File (.dat) *'}
              </label>
              <input
                type="file"
                accept={fileType === 'excel' ? '.xlsx,.xls' : fileType === 'csv' ? '.csv' : '.dat'}
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={uploading || !file}>
              {uploading ? "Uploading..." : "Upload File"}
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
