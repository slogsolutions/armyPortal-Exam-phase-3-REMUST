import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import "./CandidateDashboard.css";

export default function CandidateDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const storedCandidate = localStorage.getItem("candidate");
    const token = localStorage.getItem("candidateToken");

    if (!storedCandidate || !token) {
      navigate("/candidate/login", { replace: true });
      return;
    }

    const parsedCandidate = JSON.parse(storedCandidate);

    const ensureBriefing = async () => {
      try {
        const briefingRes = await api.get(`/briefing/candidate/${parsedCandidate.id}`);
        const briefing = briefingRes.data;
        const upcoming = briefing?.examSlots?.find((slot) => slot.status === "PENDING" && slot.slot);

        if (!upcoming) {
          navigate(`/candidate/result?candidateId=${parsedCandidate.id}`, { replace: true });
          return;
        }
      } catch (err) {
        console.warn("Briefing load failed", err);
      }
    };

    ensureBriefing();

    const paperType = parsedCandidate.activePaperType;
    if (!paperType) {
      navigate("/candidate/login", { replace: true });
      return;
    }

    const params = new URLSearchParams({
      candidateId: String(parsedCandidate.id),
      paperType
    });
    if (parsedCandidate.slotAssignment?.id) {
      params.set("slotId", String(parsedCandidate.slotAssignment.id));
    }

    navigate(`/candidate/instructions?${params.toString()}`, { replace: true });
  }, [navigate]);

  return (
    <div className="candidate-dashboard loading">
      <div className="loader" />
      <p>Routing you to the exam instructions…</p>
    </div>
  );
}
