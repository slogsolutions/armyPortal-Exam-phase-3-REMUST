const prisma = require("../config/prisma");
const { attachQuestionCounts } = require("../utils/questionCounts");

/**
 * Get candidate briefing information
 */
exports.getCandidateBriefing = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
      include: {
        trade: true,
        rank: true,
        command: true,
        center: true,
        examSlots: {
          where: {
            startTime: { gte: new Date() },
            isActive: true
          },
          include: {
            trade: true,
            command: true,
            center: true
          },
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Parse selected exam types
    const selectedTypes = candidate.selectedExamTypes 
      ? JSON.parse(candidate.selectedExamTypes) 
      : [];

    // Get available papers for candidate's selected exams
    const availablePapers = await prisma.examPaper.findMany({
      where: { 
        tradeId: candidate.tradeId,
        paperType: { in: selectedTypes },
        isActive: true
      },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    // Get exam attempts status
    const examAttempts = await prisma.examAttempt.findMany({
      where: { candidateId: Number(candidateId) },
      include: {
        examPaper: true,
        examSlot: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const now = new Date();

    let candidateSlotsRaw = [];
    if (selectedTypes.length > 0) {
      candidateSlotsRaw = await prisma.examSlot.findMany({
        where: {
          tradeId: candidate.tradeId,
          paperType: { in: selectedTypes },
          endTime: { gte: now },
          isActive: true,
          ...(candidate.commandId ? { commandId: candidate.commandId } : {}),
          ...(candidate.centerId ? { centerId: candidate.centerId } : {})
        },
        include: {
          command: true,
          center: true,
          trade: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });
    }

    const enrichedSlots = await attachQuestionCounts(candidateSlotsRaw, prisma);

    // Build briefing data
    const briefing = {
      candidate: {
        id: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        rank: candidate.rank?.name || null,
        trade: candidate.trade?.name || null,
        command: candidate.command?.name || null,
        center: candidate.center?.name || null
      },
      selectedExamTypes: selectedTypes,
      tradeConfig: {
        negativeMarking: candidate.trade.negativeMarking,
        minPercent: candidate.trade.minPercent,
        wp1: candidate.trade.wp1,
        wp2: candidate.trade.wp2,
        wp3: candidate.trade.wp3,
        pr1: candidate.trade.pr1,
        pr2: candidate.trade.pr2,
        pr3: candidate.trade.pr3,
        pr4: candidate.trade.pr4,
        pr5: candidate.trade.pr5,
        oral: candidate.trade.oral
      },
      availablePapers: availablePapers.map(paper => ({
        id: paper.id,
        paperType: paper.paperType,
        questionCount: paper._count.questions,
        isActive: paper.isActive
      })),
      examSlots: enrichedSlots.map(slot => ({
        id: slot.id,
        paperType: slot.paperType,
        startTime: slot.startTime,
        endTime: slot.endTime,
        currentCount: slot.currentCount,
        canStart: now >= new Date(slot.startTime) && now <= new Date(slot.endTime),
        questionCount: slot.questionCount || 0,
        command: slot.command?.name || candidate.command?.name || null,
        center: slot.center?.name || candidate.center?.name || null
      })),
      examStatus: examAttempts.map(attempt => ({
        paperType: attempt.examPaper.paperType,
        status: attempt.status,
        score: attempt.score,
        percentage: attempt.percentage,
        submittedAt: attempt.submittedAt,
        slotInfo: attempt.examSlot ? {
          startTime: attempt.examSlot.startTime,
          endTime: attempt.examSlot.endTime,
          location: attempt.examSlot.location
        } : null
      })),
      instructions: {
        general: [
          "Please arrive at the exam center 30 minutes before your scheduled time",
          "Bring your Army ID card and this registration confirmation",
          "Mobile phones and electronic devices are strictly prohibited",
          "Read all questions carefully before answering",
          "Manage your time effectively"
        ],
        examSpecific: {
          "WP-I": "Written Paper I - Basic Trade Knowledge",
          "WP-II": "Written Paper II - Advanced Trade Skills", 
          "WP-III": "Written Paper III - Specialized Topics"
        }
      }
    };

    res.json(briefing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get exam instructions for specific paper type
 */
exports.getExamInstructions = async (req, res) => {
  try {
    const { candidateId, paperType } = req.params;

    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
      include: { trade: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Get exam slot for this paper type
    const examSlot = await prisma.examSlot.findFirst({
      where: {
        tradeId: candidate.tradeId,
        paperType,
        candidates: {
          some: { id: Number(candidateId) }
        },
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
        isActive: true
      }
    });

    if (!examSlot) {
      return res.status(403).json({ 
        error: "No active exam slot found for this paper type" 
      });
    }

    // Get paper details
    const paper = await prisma.examPaper.findFirst({
      where: {
        tradeId: candidate.tradeId,
        paperType,
        isActive: true
      },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    const instructions = {
      paperType,
      duration: calculateExamDuration(examSlot.startTime, examSlot.endTime),
      questionCount: paper?._count.questions || 0,
      negativeMarking: candidate.trade.negativeMarking || 0,
      passingMarks: candidate.trade.minPercent || 40,
      slotInfo: {
        id: examSlot.id,
        startTime: examSlot.startTime,
        endTime: examSlot.endTime,
        location: examSlot.location,
        instructions: examSlot.instructions
      },
      generalInstructions: [
        "Read each question carefully before selecting an answer",
        "You can navigate between questions using the navigation buttons",
        "Your answers are automatically saved",
        "You can change your answers anytime before final submission",
        "Once submitted, answers cannot be modified"
      ],
      paperSpecificInstructions: getPaperSpecificInstructions(paperType)
    };

    res.json(instructions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check if candidate can start exam
 */
exports.canStartExam = async (req, res) => {
  try {
    const { candidateId, paperType } = req.params;

    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
      include: { trade: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Check if candidate has selected this exam type
    const selectedTypes = JSON.parse(candidate.selectedExamTypes || "[]");
    if (!selectedTypes.includes(paperType)) {
      return res.status(403).json({ 
        error: "You have not registered for this exam type" 
      });
    }

    // Check if paper type is enabled for this trade
    const paperTypeMap = {
      'WP-I': 'wp1',
      'WP-II': 'wp2', 
      'WP-III': 'wp3'
    };

    const tradeField = paperTypeMap[paperType];
    if (tradeField && !candidate.trade[tradeField]) {
      return res.status(403).json({ 
        error: `${paperType} is not enabled for your trade` 
      });
    }

    // Check for active exam slot
    const examSlot = await prisma.examSlot.findFirst({
      where: {
        tradeId: candidate.tradeId,
        paperType,
        candidates: {
          some: { id: Number(candidateId) }
        },
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
        isActive: true
      }
    });

    if (!examSlot) {
      return res.json({
        canStart: false,
        reason: "No active exam slot found",
        nextSlot: await getNextSlot(candidate.tradeId, paperType)
      });
    }

    // Check if already attempted
    const existingAttempt = await prisma.examAttempt.findFirst({
      where: {
        candidateId: Number(candidateId),
        examPaper: {
          paperType
        },
        status: { in: ["IN_PROGRESS", "COMPLETED"] }
      }
    });

    if (existingAttempt) {
      return res.json({
        canStart: false,
        reason: existingAttempt.status === "COMPLETED" 
          ? "Exam already completed" 
          : "Exam already in progress",
        attemptId: existingAttempt.id
      });
    }

    res.json({
      canStart: true,
      slotId: examSlot.id,
      endTime: examSlot.endTime,
      location: examSlot.location
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper functions
function calculateExamDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.floor((end - start) / (1000 * 60)); // minutes
  return duration;
}

function getPaperSpecificInstructions(paperType) {
  const instructions = {
    "WP-I": [
      "This paper tests basic trade knowledge",
      "Focus on fundamental concepts and principles",
      "Time management is crucial for this section"
    ],
    "WP-II": [
      "This paper tests advanced trade skills",
      "Apply practical knowledge to theoretical questions",
      "Pay attention to technical details"
    ],
    "WP-III": [
      "This paper tests specialized topics",
      "Questions require in-depth understanding",
      "Refer to specialized study materials"
    ]
  };
  
  return instructions[paperType] || [];
}

async function getNextSlot(tradeId, paperType) {
  const nextSlot = await prisma.examSlot.findFirst({
    where: {
      tradeId,
      paperType,
      startTime: { gt: new Date() },
      isActive: true
    },
    orderBy: {
      startTime: 'asc'
    }
  });

  return nextSlot ? {
    startTime: nextSlot.startTime,
    endTime: nextSlot.endTime,
    location: nextSlot.location
  } : null;
}
