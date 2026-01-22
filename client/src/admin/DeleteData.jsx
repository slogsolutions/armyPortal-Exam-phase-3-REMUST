import { useState } from "react";
import api from "../api/api";
import "./DeleteData.css";

export default function DeleteData() {
  const [status, setStatus] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  const triggerExport = async (format = "excel") => {
    setStatus("");
    setLoadingAction(`export-${format}`);
    try {
      const response = await api.get("/admin/data/export", {
        params: { format },
        responseType: "blob"
      });

      const blob = new Blob([response.data], {
        type:
          format === "csv"
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `exam-data.${format === "csv" ? "csv" : "xlsx"}`;
      link.click();
      window.URL.revokeObjectURL(url);
      setStatus("Exam data export prepared successfully.");
    } catch (error) {
      console.error("Export failed", error);
      setStatus(error.response?.data?.error || "Failed to export data");
    } finally {
      setLoadingAction("");
    }
  };

  const confirmAndDelete = async ({ endpoint, message }) => {
    if (!window.confirm(message)) return;

    setStatus("");
    setLoadingAction(endpoint);
    try {
      const response = await api.delete(endpoint);
      setStatus(response.data?.message || "Operation completed successfully.");
    } catch (error) {
      console.error("Delete failed", error);
      setStatus(error.response?.data?.error || "Failed to delete data");
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="delete-data-page">
      <div className="delete-header">
        <div>
          <h1>Data Maintenance</h1>
          <p className="subtitle">
            Export exam datasets or purge sensitive operational data. These actions cannot be undone.
          </p>
        </div>
      </div>

      <div className="action-grid">
        <section className="action-card neutral">
          <div>
            <h2>Export All Exam Data</h2>
            <p>
              Download written & practical marks including candidate, trade, slot, and attempt details.
            </p>
          </div>
          <div className="button-row">
            <button
              className="primary"
              disabled={loadingAction.startsWith("export")}
              onClick={() => triggerExport("excel")}
            >
              {loadingAction === "export-excel" ? "Preparing..." : "Export Excel"}
            </button>
            <button
              className="ghost"
              disabled={loadingAction.startsWith("export")}
              onClick={() => triggerExport("csv")}
            >
              {loadingAction === "export-csv" ? "Preparing..." : "Export CSV"}
            </button>
          </div>
        </section>

        <section className="action-card warning">
          <div>
            <h2>Delete All Operational Data</h2>
            <p>
              Clears answers, exam attempts, practical marks, slots, questions, and papers. Master data & users remain.
            </p>
          </div>
          <button
            className="danger"
            disabled={loadingAction === "/admin/data"}
            onClick={() =>
              confirmAndDelete({
                endpoint: "/admin/data",
                message: "Delete all operational exam data? This cannot be undone."
              })
            }
          >
            {loadingAction === "/admin/data" ? "Deleting..." : "Delete Operational Data"}
          </button>
        </section>

        <section className="action-card danger-card">
          <div>
            <h2>Delete Uploaded Papers & Questions</h2>
            <p>
              Removes every uploaded paper and question bank. Perform this before uploading a fresh set.
            </p>
          </div>
          <button
            className="danger"
            disabled={loadingAction === "/admin/data/exam-content"}
            onClick={() =>
              confirmAndDelete({
                endpoint: "/admin/data/exam-content",
                message: "Delete all uploaded papers & questions?"
              })
            }
          >
            {loadingAction === "/admin/data/exam-content" ? "Deleting..." : "Delete Papers & Questions"}
          </button>
        </section>
      </div>

      {status && <div className="status-banner">{status}</div>}
    </div>
  );
}
