const prisma = require("../config/prisma");

/**
 * Full Army-style result
 */
exports.getResult = async (req, res) => {
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

  const attempts = await prisma.examAttempt.findMany({
    where: { candidateId },
    include: {
      examPaper: true
    }
  });

  const practical = await prisma.practicalMark.findFirst({
    where: { candidateId }
  });

  let totalObtained = 0;
  let totalMax = 0;

  const theoryResults = attempts.map(a => {
    if (!a.submittedAt) {
      return {
        paper: a.examPaper.paperType,
        status: "PENDING"
      };
    }

    totalObtained += a.score;
    totalMax += 100; // can be dynamic from paper

    return {
      paper: a.examPaper.paperType,
      score: a.score,
      percentage: a.percentage,
      status: a.status
    };
  });

  if (practical) {
    Object.values(practical).forEach(v => {
      if (typeof v === "number") {
        totalObtained += v;
        totalMax += 100; // configurable later
      }
    });
  }

  const overallPercent = totalMax
    ? (totalObtained / totalMax) * 100
    : 0;

  const overallResult =
    overallPercent >= candidate.trade.minPercent
      ? "PASS"
      : "FAIL";

  res.json({
    candidate,
    theoryResults,
    practical,
    overallPercent,
    overallResult
  });
};
