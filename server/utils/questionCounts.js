const attachQuestionCounts = async (slots = [], prismaClient) => {
  if (!Array.isArray(slots) || slots.length === 0) {
    return slots;
  }

  if (!prismaClient) {
    throw new Error("attachQuestionCounts requires a Prisma client instance");
  }

  // Create a map to store question counts for each trade-paperType combination
  const questionCountMap = new Map();

  // Get unique trade-paperType combinations from slots
  const uniquePairs = Array.from(
    new Set(
      slots.map((slot) => `${slot.tradeId}-${slot.paperType}`)
    )
  );

  if (uniquePairs.length > 0) {
    // For each unique pair, get the question count
    for (const pairKey of uniquePairs) {
      const [tradeId, paperType] = pairKey.split("-");
      
      try {
        // Find the exam paper for this trade and paper type
        const examPaper = await prismaClient.examPaper.findFirst({
          where: {
            tradeId: Number(tradeId),
            paperType: paperType,
            isActive: true
          },
          include: {
            _count: {
              select: { questions: true }
            }
          }
        });

        const questionCount = examPaper?._count?.questions || 0;
        questionCountMap.set(pairKey, questionCount);
        
      } catch (error) {
        console.error(`❌ Error getting question count for ${pairKey}:`, error);
        questionCountMap.set(pairKey, 0);
      }
    }
  }

  // Attach question counts to slots
  return slots.map((slot) => {
    const key = `${slot.tradeId}-${slot.paperType}`;
    const questionCount = questionCountMap.get(key) || 0;
    
    return {
      ...slot,
      questionCount
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
