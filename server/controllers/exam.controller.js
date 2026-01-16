const prisma = require("../config/prisma");

/**
 * Get exam paper for candidate (only mapped trade allowed)
 */
exports.getPaper = async (req, res) => {
  const { tradeId, paperType } = req.params;

  const paper = await prisma.examPaper.findFirst({
    where: { tradeId: Number(tradeId), paperType },
    include: { questions: true }
  });

  if (!paper) {
    return res.json({ status: "NA", message: "Paper not uploaded" });
  }

  res.json(paper);
};

/**
 * Start exam
 */
exports.startExam = async (req, res) => {
  const { candidateId, examPaperId } = req.body;

  const attempt = await prisma.examAttempt.create({
    data: {
      candidateId,
      examPaperId,
      score: 0,
      percentage: 0,
      status: "PENDING"
    }
  });

  res.json(attempt);
};

/**
 * Submit exam & evaluate
 */
exports.submitExam = async (req, res) => {
  const { attemptId, answers } = req.body;

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      examPaper: {
        include: {
          trade: true,
          questions: true
        }
      }
    }
  });

  let score = 0;
  const negative = attempt.examPaper.trade.negativeMarking || 0;

  for (let ans of answers) {
    const q = attempt.examPaper.questions.find(
      x => x.id === ans.questionId
    );

    if (!q) continue;

    if (q.correct === ans.selected) {
      score += q.marks;
    } else {
      score -= negative;
    }
  }

  const totalMarks = attempt.examPaper.questions.reduce(
    (sum, q) => sum + q.marks,
    0
  );

  const percentage = (score / totalMarks) * 100;
  const status =
    percentage >= attempt.examPaper.trade.minPercent
      ? "PASS"
      : "FAIL";

  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      score,
      percentage,
      status,
      submittedAt: new Date()
    }
  });

  res.json({ score, percentage, status });
};
