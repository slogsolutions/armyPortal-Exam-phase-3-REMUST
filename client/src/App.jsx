import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminLogin from "./auth/AdminLogin";
import CandidateLogin from "./auth/CandidateLogin";
import Register from "./candidate/Register";
import Dashboard from "./admin/Dashboard";
import Masters from "./admin/Masters";
import TradeConfig from "./admin/TradeConfig";
import UploadPaper from "./admin/UploadPaper";
import ExamSlots from "./admin/ExamSlots";
import PracticalMarks from "./admin/PracticalMarks";
import Results from "./admin/Results";
import Exam from "./candidate/Exam";
import Result from "./candidate/Result";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/candidate/login" element={<CandidateLogin />} />
        <Route path="/candidate/register" element={<Register />} />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/masters" element={<Masters />} />
        <Route path="/admin/trade-config" element={<TradeConfig />} />
        <Route path="/admin/upload-paper" element={<UploadPaper />} />
        <Route path="/admin/exam-slots" element={<ExamSlots />} />
        <Route path="/admin/practical-marks" element={<PracticalMarks />} />
        <Route path="/admin/results" element={<Results />} />
        
        {/* Candidate Routes */}
        <Route path="/candidate/exam" element={<Exam />} />
        <Route path="/candidate/result" element={<Result />} />
      </Routes>
    </Router>
  );
}

export default App;
