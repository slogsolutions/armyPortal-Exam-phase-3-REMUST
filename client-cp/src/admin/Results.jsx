import { useEffect, useState } from "react";
import api from "../api/api";
import "./Results.css";

export default function Results() {
  const [results, setResults] = useState([]);
  const [trades, setTrades] = useState([]);
  const [commands, setCommands] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('all');
  const [filters, setFilters] = useState({
    tradeId: '',
    paperType: '',
    commandId: '',
    centerId: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [exportType, setExportType] = useState('');

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [activeView, filters]);

  const fetchMasters = async () => {
    try {
      const mastersRes = await api.get("/admin/masters");
      setTrades(mastersRes.data?.trades || []);
      setCommands(mastersRes.data?.commands || []);
      setCenters(mastersRes.data?.centers || []);
    } catch (error) {
      console.error("Failed to fetch masters:", error);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      let endpoint = "/result/all";
      let params = { ...filters };

      if (activeView === 'trade-wise') {
        endpoint = "/result/trade-wise";
      } else if (activeView === 'candidate-wise') {
        endpoint = "/result/candidate-wise";
      }

      if (exportType) {
        params.export = exportType;
      }

      const response = await api.get(endpoint, { params });
      
      if (exportType) {
        // Handle file download
        const blob = new Blob([response.data], { 
          type: exportType === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `results.${exportType === 'excel' ? 'xlsx' : 'csv'}`;
        a.click();
        window.URL.revokeObjectURL(url);
        setExportType('');
        return;
      }

      if (activeView === 'all') {
        setResults(response.data?.attempts || []);
      } else {
        setResults(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
      if (exportType) {
        alert("Export failed. Please try again.");
        setExportType('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      tradeId: '',
      paperType: '',
      commandId: '',
      centerId: '',
      status: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleExport = (type) => {
    setExportType(type);
  };

  const formatPercent = (value, digits = 2) =>
    typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}%` : "NA";

  const formatNumber = (value, digits = 2) =>
    typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "NA";

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");

  const renderAllResults = () => (
    <div className="results-table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>Army No</th>
            <th>Name</th>
            <th>Rank</th>
            <th>Trade</th>
            <th>Command</th>
            <th>Center</th>
            <th>Paper Type</th>
            <th>Score</th>
            <th>Total</th>
            <th>Percentage</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Slot Location</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={index}>
              <td>{result.candidate?.armyNo}</td>
              <td>{result.candidate?.name}</td>
              <td>{result.candidate?.rank?.name}</td>
              <td>{result.candidate?.trade?.name}</td>
              <td>{result.candidate?.command?.name}</td>
              <td>{result.candidate?.center?.name}</td>
              <td>{result.examPaper?.paperType}</td>
              <td>{formatNumber(result.score, 2)}</td>
              <td>{formatNumber(result.totalMarks, 2)}</td>
              <td>{formatPercent(result.percentage)}</td>
              <td>
                <span className={`status-badge ${typeof result.percentage === "number" && result.percentage >= 40 ? 'pass' : 'fail'}`}>
                  {typeof result.percentage === "number" && result.percentage >= 40 ? 'PASS' : 'FAIL'}
                </span>
              </td>
              <td>{formatDate(result.submittedAt)}</td>
              <td>{result.examSlot?.location || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTradeWiseResults = () => (
    <div className="trade-results-grid">
      {results.map((trade, index) => (
        <div key={index} className="trade-result-card">
          <h3>{trade.tradeName}</h3>
          <div className="trade-stats">
            <div className="stat">
              <span className="label">Total Candidates:</span>
              <span className="value">{trade.totalCandidates}</span>
            </div>
            <div className="stat">
              <span className="label">Completed Attempts:</span>
              <span className="value">{trade.completedAttempts}</span>
            </div>
            <div className="stat">
              <span className="label">Passed:</span>
              <span className="value pass">{trade.passedAttempts}</span>
            </div>
            <div className="stat">
              <span className="label">Failed:</span>
              <span className="value fail">{trade.failedAttempts}</span>
            </div>
            <div className="stat">
              <span className="label">Average Score:</span>
              <span className="value">{formatPercent(trade.averageScore)}</span>
            </div>
          </div>
          
          <div className="paper-breakdown">
            <h4>Paper Type Breakdown</h4>
            {trade.paperBreakdown?.map((paper, pIndex) => (
              <div key={pIndex} className="paper-stat">
                <span className="paper-type">{paper.paperType}</span>
                <div className="paper-details">
                  <span>Attempts: {paper.attempts ?? 0}</span>
                  <span>Passed: {paper.passed ?? 0}</span>
                  <span>Avg: {formatPercent(paper.averageScore, 1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCandidateWiseResults = () => (
    <div className="candidate-results-grid">
      {results.map((candidate, index) => (
        <div key={index} className="candidate-result-card">
          <div className="candidate-header">
            <div className="candidate-info">
              <h3>{candidate.name}</h3>
              <span className="army-no">{candidate.armyNo}</span>
            </div>
            <div className="candidate-details">
              <span>{candidate.rank}</span>
              <span>{candidate.trade}</span>
              <span>{candidate.command}</span>
            </div>
          </div>
          
          <div className="candidate-stats">
            <div className="stat">
              <span className="label">Selected Exams:</span>
              <span className="value">{Array.isArray(candidate.selectedExamTypes) && candidate.selectedExamTypes.length > 0 ? candidate.selectedExamTypes.join(', ') : 'NA'}</span>
            </div>
            <div className="stat">
              <span className="label">Completed:</span>
              <span className="value">{candidate.completedAttempts}</span>
            </div>
            <div className="stat">
              <span className="label">Passed:</span>
              <span className="value pass">{candidate.passedAttempts}</span>
            </div>
            <div className="stat">
              <span className="label">Average Score:</span>
              <span className="value">{formatPercent(candidate.averageScore)}</span>
            </div>
          </div>

          <div className="written-results">
            <h4>Written Results</h4>
            {candidate.writtenResults?.map((result, rIndex) => (
              <div key={rIndex} className="written-result">
                <span className="paper-type">{result.paperType}</span>
                <span className={`status-badge ${result.status === 'PASS' ? 'pass' : 'fail'}`}>
                  {result.status}
                </span>
                <span className="score">{formatPercent(result.percentage, 1)}</span>
                <span className="date">{formatDate(result.submittedAt)}</span>
              </div>
            ))}
          </div>

          {candidate.practicalMarks && (
            <div className="practical-results">
              <h4>Practical Marks</h4>
              <div className="practical-grid">
                {candidate.practicalMarks.pr1 !== null && candidate.practicalMarks.pr1 !== undefined && (
                  <div className="practical-mark">
                    <span className="exam-type">PR-I:</span>
                    <span className="marks">{candidate.practicalMarks.pr1}</span>
                  </div>
                )}
                {candidate.practicalMarks.pr2 !== null && candidate.practicalMarks.pr2 !== undefined && (
                  <div className="practical-mark">
                    <span className="exam-type">PR-II:</span>
                    <span className="marks">{candidate.practicalMarks.pr2}</span>
                  </div>
                )}
                {candidate.practicalMarks.pr3 !== null && candidate.practicalMarks.pr3 !== undefined && (
                  <div className="practical-mark">
                    <span className="exam-type">PR-III:</span>
                    <span className="marks">{candidate.practicalMarks.pr3}</span>
                  </div>
                )}
                {candidate.practicalMarks.pr4 !== null && candidate.practicalMarks.pr4 !== undefined && (
                  <div className="practical-mark">
                    <span className="exam-type">PR-IV:</span>
                    <span className="marks">{candidate.practicalMarks.pr4}</span>
                  </div>
                )}
                {candidate.practicalMarks.pr5 !== null && candidate.practicalMarks.pr5 !== undefined && (
                  <div className="practical-mark">
                    <span className="exam-type">PR-V:</span>
                    <span className="marks">{candidate.practicalMarks.pr5}</span>
                  </div>
                )}
                {candidate.practicalMarks.oral !== null && candidate.practicalMarks.oral !== undefined && (
                  <div className="practical-mark">
                    <span className="exam-type">ORAL:</span>
                    <span className="marks">{candidate.practicalMarks.oral}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return <div className="loading">Loading results...</div>;
  }

  return (
    <div className="results-container">
      <div className="header">
        <h1>Exam Results</h1>
        <div className="view-tabs">
          <button 
            className={`tab-btn ${activeView === 'all' ? 'active' : ''}`}
            onClick={() => setActiveView('all')}
          >
            All Results
          </button>
          <button 
            className={`tab-btn ${activeView === 'trade-wise' ? 'active' : ''}`}
            onClick={() => setActiveView('trade-wise')}
          >
            Trade Wise
          </button>
          <button 
            className={`tab-btn ${activeView === 'candidate-wise' ? 'active' : ''}`}
            onClick={() => setActiveView('candidate-wise')}
          >
            Candidate Wise
          </button>
        </div>
      </div>

      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Trade</label>
            <select
              value={filters.tradeId}
              onChange={(e) => handleFilterChange('tradeId', e.target.value)}
            >
              <option value="">All Trades</option>
              {trades.map(trade => (
                <option key={trade.id} value={trade.id}>{trade.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Paper Type</label>
            <select
              value={filters.paperType}
              onChange={(e) => handleFilterChange('paperType', e.target.value)}
            >
              <option value="">All Papers</option>
              <option value="WP-I">WP-I</option>
              <option value="WP-II">WP-II</option>
              <option value="WP-III">WP-III</option>
              <option value="PR-I">PR-I</option>
              <option value="PR-II">PR-II</option>
              <option value="PR-III">PR-III</option>
              <option value="PR-IV">PR-IV</option>
              <option value="PR-V">PR-V</option>
              <option value="ORAL">ORAL</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Command</label>
            <select
              value={filters.commandId}
              onChange={(e) => handleFilterChange('commandId', e.target.value)}
            >
              <option value="">All Commands</option>
              {commands.map(command => (
                <option key={command.id} value={command.id}>{command.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Center</label>
            <select
              value={filters.centerId}
              onChange={(e) => handleFilterChange('centerId', e.target.value)}
            >
              <option value="">All Centers</option>
              {centers.map(center => (
                <option key={center.id} value={center.id}>{center.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="export-section">
        <h3>Export Results</h3>
        <div className="export-buttons">
          <button 
            className="btn btn-primary"
            onClick={() => handleExport('excel')}
          >
            Export to Excel
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => handleExport('csv')}
          >
            Export to CSV
          </button>
        </div>
      </div>

      <div className="results-section">
        {activeView === 'all' && renderAllResults()}
        {activeView === 'trade-wise' && renderTradeWiseResults()}
        {activeView === 'candidate-wise' && renderCandidateWiseResults()}
        
        {results.length === 0 && (
          <div className="empty-state">
            <p>No results found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
