import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/api";
import "./Result.css";

export default function Result() {
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get("candidateId");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      try {
        const res = await api.get(`/result/candidate/${candidateId}`);
        setData(res.data);
      } catch (error) {
        console.error("Error loading result:", error);
        alert("Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      loadResult();
    }
  }, [candidateId]);

  if (loading) {
    return (
      <div className="result-loading">
        <div className="loading-spinner"></div>
        <p>Loading results...</p>
      </div>
    );
  }

  if (!data) {
    return <div className="result-error">No results found</div>;
  }

  const {
    candidate = {},
    writtenResults = [],
    practicalResults = [],
    trade = {},
    summary = {}
  } = data;

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "NA";
    }
    return value;
  };

  const extraFields = [
    { key: "bpet", label: "BPET" },
    { key: "ppt", label: "PPT" },
    { key: "cpt", label: "CPT" },
    { key: "grade", label: "Computed Grade" },
    { key: "gradeOverride", label: "Grade Override" },
    { key: "overallResult", label: "Overall Result" }
  ];

  return (
    <div className="result-page">
      <div className="result-container">
        <div className="result-header">
          <h1>ARMY EXAM PORTAL</h1>
          <h2>2 Signal Training Centre Online Exam Portal</h2>
          <h3>EXAMINATION RESULT</h3>
        </div>

        <div className="result-content">
          {/* Candidate Details */}
          <section className="candidate-details">
            <h4>Candidate Details</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>Army No:</label>
                <span>{candidate.armyNo}</span>
              </div>
              <div className="detail-item">
                <label>Name:</label>
                <span>{candidate.name}</span>
              </div>
              <div className="detail-item">
                <label>Rank:</label>
                <span>{candidate.rank || "-"}</span>
              </div>
              <div className="detail-item">
                <label>Trade:</label>
                <span>{candidate.trade || "-"}</span>
              </div>
              <div className="detail-item">
                <label>Unit:</label>
                <span>{candidate.unit || "-"}</span>
              </div>
              <div className="detail-item">
                <label>Medical Category:</label>
                <span>{candidate.medCat || "-"}</span>
              </div>
              <div className="detail-item">
                <label>Corps:</label>
                <span>{candidate.corps || "-"}</span>
              </div>
              <div className="detail-item">
                <label>Command:</label>
                <span>{candidate.command || "-"}</span>
              </div>
              <div className="detail-item">
                <label>Conducting Center:</label>
                <span>{candidate.center || "-"}</span>
              </div>
            </div>
          </section>

          {/* Theory Results */}
          <section className="results-section">
            <h4>Theory Results</h4>
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>Paper Type</th>
                    <th>Score</th>
                    <th>Total Marks</th>
                    <th>Percentage</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {writtenResults.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty">No written results available</td>
                    </tr>
                  )}
                  {writtenResults.map((result, index) => (
                    <tr key={index}>
                      <td className="paper-type">{result.type || result.paper}</td>
                      <td className="score">
                        {result.status === "NA" ? (
                          <span className="na">N/A</span>
                        ) : result.status === "PENDING" ? (
                          <span className="pending">Pending</span>
                        ) : (
                          result.score?.toFixed(2) || "-"
                        )}
                      </td>
                      <td className="total-marks">
                        {result.status === "NA" || result.status === "PENDING" ? (
                          "-"
                        ) : (
                          result.totalMarks?.toFixed(2) || "-"
                        )}
                      </td>
                      <td className="percentage">
                        {result.status === "NA" || result.status === "PENDING" ? (
                          "-"
                        ) : result.percentage !== null ? (
                          `${result.percentage}%`
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="status">
                        {result.status === "NA" ? (
                          <span className="badge na">N/A</span>
                        ) : result.status === "PENDING" ? (
                          <span className="badge pending">Pending</span>
                        ) : result.status === "PASS" ? (
                          <span className="badge pass">PASS</span>
                        ) : (
                          <span className="badge fail">FAIL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Practical Results */}
          <section className="results-section practical-horizontal">
            <h4>Practical Results</h4>
            {practicalResults.length === 0 ? (
              <div className="empty practical-empty">
                No practical exams configured for your trade.
              </div>
            ) : (
              <div className="results-table horizontal">
                <table className="practical-horizontal-table">
                  <thead>
                    <tr>
                      {practicalResults.map((result) => (
                        <th key={result.type}>{result.type}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {practicalResults.map((result) => {
                        const rawMark = result.marks;
                        const numericMark = rawMark === null || rawMark === undefined
                          ? null
                          : Number(rawMark);
                        const hasMarks = numericMark !== null && !Number.isNaN(numericMark);

                        return (
                          <td key={result.type}>
                            <div className="practical-cell">
                              <span className="practical-marks">
                                {hasMarks ? numericMark.toFixed(2) : "NA"}
                              </span>
                              <span className={`badge ${hasMarks ? "pass" : "pending"}`}>
                                {hasMarks ? "Recorded" : "Pending"}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <p className="practical-note">Note: Practical marks are entered by Exam Officers.</p>
          </section>

          {/* Summary */}
          <section className="summary-section">
            <div className="summary-card">
              <h4>Negative Marking Applied</h4>
              <p className="negative-marking">
                {trade.negativeMarking ? `${trade.negativeMarking} marks per wrong answer` : "No negative marking"}
              </p>
            </div>
            <div className="summary-card">
              <h4>Minimum Passing Percentage</h4>
              <p className="min-percent">{trade.minPercent}%</p>
            </div>
          </section>

          {/* Additional Metrics */}
          <section className="aptitude-section">
            <h4>Physical & Override Metrics</h4>
            <div className="aptitude-grid">
              {extraFields.map(({ key, label }) => {
                const value = summary[key];
                const display = formatValue(value);
                const isResultBadge = key === "overallResult" && display !== "NA";
                return (
                  <div className="aptitude-card" key={key}>
                    <span className="aptitude-label">{label}</span>
                    {isResultBadge ? (
                      <span className={`badge ${display === "PASS" ? "pass" : "fail"}`}>
                        {display}
                      </span>
                    ) : (
                      <span className="aptitude-value">{display}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="result-footer">
          <button className="print-btn" onClick={() => window.print()}>
            Print Result
          </button>
          <button 
            className="home-btn" 
            onClick={() => window.location.href = "/"}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
