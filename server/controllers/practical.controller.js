const prisma = require("../config/prisma");

/**
 * Evaluator submits practical marks
 */
exports.submitPractical = async (req, res) => {
  const { candidateId, tradeId, pr1, pr2, pr3, pr4, pr5, oral } = req.body;

  const record = await prisma.practicalMark.upsert({
    where: {
      candidateId_tradeId: {
        candidateId,
        tradeId
      }
    },
    update: { pr1, pr2, pr3, pr4, pr5, oral },
    create: { candidateId, tradeId, pr1, pr2, pr3, pr4, pr5, oral }
  });

  res.json(record);
};

/**
 * Get practical marks
 */
exports.getPractical = async (req, res) => {
  const { candidateId, tradeId } = req.params;

  const marks = await prisma.practicalMark.findFirst({
    where: {
      candidateId: Number(candidateId),
      tradeId: Number(tradeId)
    }
  });

  res.json(marks || { status: "NA" });
};
