const prisma = require("../config/prisma");

/**
 * Full Army-style result
 */
exports.getResult = async (req, res) => {
  try {
    const candidateId = Number(req.params.candidateId);

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        trade: true,
        rank: true,
        command: true,
        center: true
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { candidateId },
      include: {
        examPaper: {
          include: {
            questions: true
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Create a map of paper types to results
    const resultsMap = {};
    
    attempts.forEach(attempt => {
      resultsMap[attempt.examPaper.paperType] = {
        paper: attempt.examPaper.paperType,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: parseFloat(attempt.percentage.toFixed(2)),
        status: attempt.status,
        submittedAt: attempt.submittedAt
      };
    });

    // Get all available exam types for this trade
    const trade = candidate.trade;
    const examTypes = [];
    
    if (trade.wp1) examTypes.push({ type: "WP-I", label: "WP-I" });
    if (trade.wp2) examTypes.push({ type: "WP-II", label: "WP-II" });
    if (trade.pr1) examTypes.push({ type: "PR-I", label: "PR-I" });
    if (trade.pr2) examTypes.push({ type: "PR-II", label: "PR-II" });
    if (trade.pr3) examTypes.push({ type: "PR-III", label: "PR-III" });
    if (trade.pr4) examTypes.push({ type: "PR-IV", label: "PR-IV" });
    if (trade.pr5) examTypes.push({ type: "PR-V", label: "PR-V" });
    if (trade.oral) examTypes.push({ type: "ORAL", label: "ORAL" });

    // Parse selected exam types
    const selectedTypes = candidate.selectedExamTypes 
      ? JSON.parse(candidate.selectedExamTypes) 
      : [];

    // Only show WP-I and WP-II for theory results
    const writtenExamTypes = examTypes.filter(et => 
      ["WP-I", "WP-II"].includes(et.type) && selectedTypes.includes(et.type)
    );

    // Build theory results array (only WP-I and WP-II)
    const theoryResults = writtenExamTypes.map(examType => {
      if (resultsMap[examType.type]) {
        return resultsMap[examType.type];
      }
      return {
        paper: examType.label,
        status: "NA",
        score: null,
        totalMarks: null,
        percentage: null
      };
    });

    // Get practical marks
    const practicalMarks = await prisma.practicalMarks.findUnique({
      where: { candidateId: candidate.id }
    });

    // Build practical results array
    const practicalResults = [];
    if (trade.pr1) practicalResults.push({ type: "PR-I", marks: practicalMarks?.pr1 || null });
    if (trade.pr2) practicalResults.push({ type: "PR-II", marks: practicalMarks?.pr2 || null });
    if (trade.pr3) practicalResults.push({ type: "PR-III", marks: practicalMarks?.pr3 || null });
    if (trade.pr4) practicalResults.push({ type: "PR-IV", marks: practicalMarks?.pr4 || null });
    if (trade.pr5) practicalResults.push({ type: "PR-V", marks: practicalMarks?.pr5 || null });
    if (trade.oral) practicalResults.push({ type: "ORAL", marks: practicalMarks?.oral || null });

    res.json({
      candidate: {
        id: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        rank: candidate.rank.name,
        trade: candidate.trade.name,
        unit: candidate.unit,
        medCat: candidate.medCat,
        corps: candidate.corps,
        command: candidate.command.name,
        center: candidate.center.name
      },
      theoryResults,
      practicalResults,
      trade
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
