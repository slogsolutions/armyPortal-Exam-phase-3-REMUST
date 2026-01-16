import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLogin from "./auth/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import Register from "./candidate/Register";
import Instructions from "./candidate/Instructions";
import Exam from "./candidate/Exam";
import CandidateResult from "./candidate/Result";
import Masters from "./admin/Masters";
import TradeConfig from "./admin/TradeConfig";
import UploadPaper from "./admin/UploadPaper";
import PracticalMarks from "./admin/PracticalMarks";
import Results from "./admin/Results";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/instructions" element={<Instructions />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/result" element={<CandidateResult />} />

        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/masters" element={<Masters />} />
        <Route path="/admin/trade-config" element={<TradeConfig />} />
        <Route path="/admin/upload" element={<UploadPaper/>} />
        <Route path="/admin/practical" element={<PracticalMarks />} />
        <Route path="/admin/results" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}
