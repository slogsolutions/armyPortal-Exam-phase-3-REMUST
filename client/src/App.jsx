import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminLogin from "./auth/AdminLogin";
import CandidateLogin from "./auth/CandidateLogin";
import Register from "./candidate/Register";
import CandidateDashboard from "./candidate/CandidateDashboard";
import Instructions from "./candidate/Instructions";
import AdminDashboard from "./admin/AdminDashboard";
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
        <Route path="/" element={<AdminLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/candidate/login" element={<CandidateLogin />} />
        <Route path="/candidate/register" element={<Register />} />
        
        {/* Admin Routes - Wrapped in AdminDashboard */}
        <Route path="/admin/*" element={<AdminDashboard />} />
        
        {/* Candidate Routes */}
        <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
        <Route path="/candidate/instructions" element={<Instructions />} />
        <Route path="/candidate/exam" element={<Exam />} />
        <Route path="/candidate/result" element={<Result />} />
      </Routes>
    </Router>
  );
}

export default App;
