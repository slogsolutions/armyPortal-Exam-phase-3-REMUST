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
        const res = await api.get(`/result/${candidateId}`);
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

  const { candidate, theoryResults, practicalResults, trade } = data;

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
                <span>{candidate.rank}</span>
              </div>
              <div className="detail-item">
                <label>Trade:</label>
                <span>{candidate.trade}</span>
              </div>
              <div className="detail-item">
                <label>Unit:</label>
                <span>{candidate.unit}</span>
              </div>
              <div className="detail-item">
                <label>Medical Category:</label>
                <span>{candidate.medCat}</span>
              </div>
              <div className="detail-item">
                <label>Corps:</label>
                <span>{candidate.corps}</span>
              </div>
              <div className="detail-item">
                <label>Command:</label>
                <span>{candidate.command}</span>
              </div>
              <div className="detail-item">
                <label>Conducting Center:</label>
                <span>{candidate.center}</span>
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
                  {theoryResults.map((result, index) => (
                    <tr key={index}>
                      <td className="paper-type">{result.paper}</td>
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
          {practicalResults && practicalResults.length > 0 && (
            <section className="results-section">
              <h4>Practical Results</h4>
              <div className="results-table">
                <table>
                  <thead>
                    <tr>
                      <th>Exam Type</th>
                      <th>Marks</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {practicalResults.map((result, index) => (
                      <tr key={index}>
                        <td className="paper-type">{result.type}</td>
                        <td className="score">
                          {result.marks !== null && result.marks !== undefined ? (
                            result.marks.toFixed(2)
                          ) : (
                            <span className="na">N/A</span>
                          )}
                        </td>
                        <td className="status">
                          {result.marks !== null && result.marks !== undefined ? (
                            <span className="badge pass">Entered</span>
                          ) : (
                            <span className="badge na">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="practical-note">Note: Practical marks are entered by Exam Officers.</p>
            </section>
          )}

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
