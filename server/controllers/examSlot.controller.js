const prisma = require("../config/prisma");

/**
 * Create exam slot
 */
exports.createExamSlot = async (req, res) => {
  try {
    const {
      tradeId,
      examPaperId,
      paperType,
      startTime,
      endTime,
      maxCandidates,
      location,
      instructions,
      password
    } = req.body;

    // Validate trade exists
    const trade = await prisma.trade.findUnique({
      where: { id: Number(tradeId) }
    });

    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Validate paper type is enabled for this trade
    const paperTypeMap = {
      'WP-I': 'wp1',
      'WP-II': 'wp2', 
      'WP-III': 'wp3',
      'PR-I': 'pr1',
      'PR-II': 'pr2',
      'PR-III': 'pr3',
      'PR-IV': 'pr4',
      'PR-V': 'pr5',
      'ORAL': 'oral'
    };

    const tradeField = paperTypeMap[paperType];
    if (tradeField && !trade[tradeField]) {
      return res.status(400).json({ 
        error: `${paperType} is not enabled for trade ${trade.name}` 
      });
    }

    // Validate exam paper if provided
    if (examPaperId) {
      const examPaper = await prisma.examPaper.findUnique({
        where: { id: Number(examPaperId) }
      });
      
      if (!examPaper) {
        return res.status(404).json({ error: "Exam paper not found" });
      }
    }

    const examSlot = await prisma.examSlot.create({
      data: {
        tradeId: Number(tradeId),
        examPaperId: examPaperId ? Number(examPaperId) : null,
        paperType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        maxCandidates: Number(maxCandidates) || 50,
        location,
        instructions,
        password
      },
      include: {
        trade: true,
        examPaper: true
      }
    });

    res.json(examSlot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all exam slots
 */
exports.getExamSlots = async (req, res) => {
  try {
    const { tradeId, paperType, upcoming } = req.query;

    let whereClause = {};
    
    if (tradeId) {
      whereClause.tradeId = Number(tradeId);
    }
    
    if (paperType) {
      whereClause.paperType = paperType;
    }
    
    if (upcoming === 'true') {
      whereClause.startTime = {
        gte: new Date()
      };
    }

    const examSlots = await prisma.examSlot.findMany({
      where: whereClause,
      include: {
        trade: true,
        examPaper: true,
        _count: {
          select: { 
            candidates: true,
            examAttempts: true 
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json(examSlots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get available slots for candidate
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
      include: { trade: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Parse selected exam types
    const selectedTypes = candidate.selectedExamTypes 
      ? JSON.parse(candidate.selectedExamTypes) 
      : [];

    // Get available slots for candidate's trade and selected exam types
    const availableSlots = await prisma.examSlot.findMany({
      where: {
        tradeId: candidate.tradeId,
        paperType: { in: selectedTypes },
        startTime: { gte: new Date() },
        isActive: true,
        currentCount: { lt: prisma.examSlot.fields.maxCandidates }
      },
      include: {
        trade: true,
        examPaper: true,
        _count: {
          select: { 
            candidates: true,
            examAttempts: true 
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Assign candidate to exam slot
 */
exports.assignToSlot = async (req, res) => {
  try {
    const { candidateId, slotId } = req.body;

    // Validate candidate
    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(candidateId) },
      include: { trade: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Validate slot
    const slot = await prisma.examSlot.findUnique({
      where: { id: Number(slotId) },
      include: { trade: true }
    });

    if (!slot) {
      return res.status(404).json({ error: "Exam slot not found" });
    }

    // Check if slot is full
    if (slot.currentCount >= slot.maxCandidates) {
      return res.status(400).json({ error: "Exam slot is full" });
    }

    // Check if slot has started
    if (new Date() > new Date(slot.endTime)) {
      return res.status(400).json({ error: "Exam slot has ended" });
    }

    // Check if candidate is already assigned to this slot
    const existingAssignment = await prisma.examSlot.findFirst({
      where: {
        id: Number(slotId),
        candidates: {
          some: { id: Number(candidateId) }
        }
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ error: "Candidate already assigned to this slot" });
    }

    // Assign candidate to slot
    await prisma.examSlot.update({
      where: { id: Number(slotId) },
      data: {
        currentCount: slot.currentCount + 1,
        candidates: {
          connect: { id: Number(candidateId) }
        }
      }
    });

    res.json({ message: "Candidate assigned to exam slot successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update exam slot
 */
exports.updateExamSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert date fields
    if (updateData.startTime) {
      updateData.startTime = new Date(updateData.startTime);
    }
    if (updateData.endTime) {
      updateData.endTime = new Date(updateData.endTime);
    }

    const examSlot = await prisma.examSlot.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        trade: true,
        examPaper: true
      }
    });

    res.json(examSlot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete exam slot
 */
exports.deleteExamSlot = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if slot has candidates assigned
    const slot = await prisma.examSlot.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });

    if (!slot) {
      return res.status(404).json({ error: "Exam slot not found" });
    }

    if (slot._count.candidates > 0) {
      return res.status(400).json({ 
        error: "Cannot delete slot with assigned candidates" 
      });
    }

    await prisma.examSlot.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Exam slot deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get slot details with candidates
 */
exports.getSlotDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await prisma.examSlot.findUnique({
      where: { id: Number(id) },
      include: {
        trade: true,
        examPaper: true,
        candidates: {
          include: {
            rank: true,
            command: true,
            center: true
          }
        },
        examAttempts: {
          include: {
            candidate: true
          }
        }
      }
    });

    if (!slot) {
      return res.status(404).json({ error: "Exam slot not found" });
    }

    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
