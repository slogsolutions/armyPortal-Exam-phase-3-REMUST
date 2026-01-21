const attachQuestionCounts = async (slots = [], prismaClient) => {
  if (!Array.isArray(slots) || slots.length === 0) {
    return slots;
  }

  if (!prismaClient) {
    throw new Error("attachQuestionCounts requires a Prisma client instance");
  }

  const uniquePairs = Array.from(
    new Set(
      slots.map((slot) => `${slot.tradeId}-${slot.paperType}`)
    )
  );

  const orConditions = uniquePairs.map((pairKey) => {
    const [tradeId, paperType] = pairKey.split("-");
    return {
      tradeId: Number(tradeId),
      paperType,
      isActive: true
    };
  });

  const pairToCount = new Map();

  if (orConditions.length > 0) {
    const papers = await prismaClient.examPaper.findMany({
      where: { OR: orConditions },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    papers.forEach((paper) => {
      const key = `${paper.tradeId}-${paper.paperType}`;
      pairToCount.set(key, paper._count?.questions ?? 0);
    });
  }

  return slots.map((slot) => {
    const key = `${slot.tradeId}-${slot.paperType}`;
    return {
      ...slot,
      questionCount: pairToCount.get(key) ?? 0
    };
  });
};

const attachQuestionCount = async (slot, prismaClient) => {
  if (!slot) return slot;
  const [enriched] = await attachQuestionCounts([slot], prismaClient);
  return enriched;
};

module.exports = {
  attachQuestionCounts,
  attachQuestionCount
};
