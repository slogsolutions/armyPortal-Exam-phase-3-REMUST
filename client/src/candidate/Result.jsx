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
    // practicalResults = [],
    trade = {},
    // summary = {}
  } = data;

  // Filter only written paper results (WP-I, WP-II, WP-III)
  const writtenPaperResults = writtenResults.filter(result => 
    result.type && result.type.startsWith('WP-')
  );

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "NA";
    }
    return value;
  };

  // Calculate question statistics for each written paper
  const calculateQuestionStats = (result) => {
    if (!result || result.status === "NA" || result.status === "PENDING") {
      return { attempted: 0, correct: 0, wrong: 0, negativeMarks: 0 };
    }

    const totalQuestions = result.totalQuestions || 0;
    const correctAnswers = result.correctAnswers || 0;
    const wrongAnswers = result.wrongAnswers || 0;
    const attempted = correctAnswers + wrongAnswers;
    const negativeMarking = trade.negativeMarking || 0;
    const negativeMarks = wrongAnswers * negativeMarking;

    return {
      attempted,
      correct: correctAnswers,
      wrong: wrongAnswers,
      total: totalQuestions,
      negativeMarks: negativeMarks.toFixed(2)
    };
  };

  // Commented out for future use
  // const extraFields = [
  //   { key: "bpet", label: "BPET" },
  //   { key: "ppt", label: "PPT" },
  //   { key: "cpt", label: "CPT" },
  //   { key: "grade", label: "Computed Grade" },
  //   { key: "gradeOverride", label: "Grade Override" },
  //   { key: "overallResult", label: "Overall Result" }
  // ];

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

          {/* Written Paper Results - Enhanced */}
          <section className="results-section">
            <h4>Written Paper Results</h4>
            {writtenPaperResults.length === 0 ? (
              <div className="empty">No written paper results available</div>
            ) : (
              <div className="written-results-grid">
                {writtenPaperResults.map((result, index) => {
                  const stats = calculateQuestionStats(result);
                  const isCompleted = result.status !== "NA" && result.status !== "PENDING";
                  
                  return (
                    <div key={index} className="written-paper-card">
                      <div className="paper-header">
                        <h5 className="paper-title">{result.type || result.paper}</h5>
                        <span className={`status-badge ${result.status?.toLowerCase() || 'pending'}`}>
                          {result.status || 'PENDING'}
                        </span>
                      </div>
                      
                      {isCompleted ? (
                        <>
                          <div className="score-summary">
                            <div className="main-score">
                              <span className="score-value">{result.score?.toFixed(2) || '0.00'}</span>
                              <span className="score-total">/ {result.totalMarks?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="percentage">
                              <span className="percentage-value">{result.percentage || 0}%</span>
                            </div>
                          </div>

                          <div className="question-stats">
                            <div className="stats-grid">
                              <div className="stat-item">
                                <span className="stat-label">Total Questions</span>
                                <span className="stat-value">{stats.total}</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-label">Attempted</span>
                                <span className="stat-value">{stats.attempted}</span>
                              </div>
                              <div className="stat-item correct">
                                <span className="stat-label">Correct</span>
                                <span className="stat-value">{stats.correct}</span>
                              </div>
                              <div className="stat-item wrong">
                                <span className="stat-label">Wrong</span>
                                <span className="stat-value">{stats.wrong}</span>
                              </div>
                            </div>
                          </div>

                          {trade.negativeMarking > 0 && stats.wrong > 0 && (
                            <div className="negative-marking-info">
                              <div className="negative-marking-header">
                                <span className="negative-icon">⚠️</span>
                                <span className="negative-title">Negative Marking Applied</span>
                              </div>
                              <div className="negative-details">
                                <span className="negative-rate">
                                  {trade.negativeMarking} marks deducted per wrong answer
                                </span>
                                <span className="negative-total">
                                  Total deduction: {stats.negativeMarks} marks
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="pending-state">
                          <div className="pending-icon">⏳</div>
                          <p className="pending-text">
                            {result.status === "NA" ? "Not Available" : "Result Pending"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Trade Information */}
          <section className="trade-info-section">
            <div className="trade-info-card">
              <h4>Exam Configuration</h4>
              <div className="trade-details">
                <div className="trade-detail">
                  <span className="detail-label">Trade:</span>
                  <span className="detail-value">{candidate.trade || "-"}</span>
                </div>
                <div className="trade-detail">
                  <span className="detail-label">Negative Marking:</span>
                  <span className="detail-value">
                    {trade.negativeMarking ? `${trade.negativeMarking} marks per wrong answer` : "No negative marking"}
                  </span>
                </div>
                <div className="trade-detail">
                  <span className="detail-label">Minimum Passing:</span>
                  <span className="detail-value">{trade.minPercent || 0}%</span>
                </div>
              </div>
            </div>
          </section>

          {/* COMMENTED OUT FOR FUTURE USE */}
          {/* 
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
          */}

          {/* COMMENTED OUT FOR FUTURE USE */}
          {/*
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
          */}
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
