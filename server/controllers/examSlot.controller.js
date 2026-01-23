const prisma = require("../config/prisma");
const { attachQuestionCounts, attachQuestionCount } = require("../utils/questionCounts");
const { autoAssignCandidatesToSlot } = require("./candidate.controller");

/**
 * Create exam slot
 */
exports.createExamSlot = async (req, res) => {
  try {
    const {
      tradeId,
      paperType,
      startTime,
      endTime,
      commandId,
      centerId
    } = req.body;

    if (!tradeId || !paperType || !startTime || !endTime || !commandId || !centerId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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

    // Validate command
    const command = await prisma.command.findUnique({
      where: { id: Number(commandId) }
    });

    if (!command) {
      return res.status(404).json({ error: "Command not found" });
    }

    // Validate conducting center and ensure it belongs to command
    const center = await prisma.conductingCenter.findUnique({
      where: { id: Number(centerId) },
      include: { command: true }
    });

    if (!center) {
      return res.status(404).json({ error: "Conducting center not found" });
    }

    if (center.commandId !== Number(commandId)) {
      return res.status(400).json({ error: "Center does not belong to selected command" });
    }

    const examSlot = await prisma.examSlot.create({
      data: {
        tradeId: Number(tradeId),
        paperType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        commandId: Number(commandId),
        centerId: Number(centerId)
      },
      include: {
        trade: true,
        command: true,
        center: true
      }
    });

    // Auto-assign candidates to the newly created slot
    console.log('🔄 Auto-assigning candidates to newly created slot:', examSlot.id);
    const assignedCount = await autoAssignCandidatesToSlot(examSlot.id);
    console.log(`✅ Auto-assigned ${assignedCount} candidates to slot ${examSlot.id}`);

    const enrichedSlot = await attachQuestionCount(examSlot, prisma);

    res.json({
      ...enrichedSlot,
      autoAssignedCandidates: assignedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all exam slots
 */
exports.getExamSlots = async (req, res) => {
  try {
    const { tradeId, paperType, upcoming, commandId, centerId } = req.query;

    let whereClause = {};
    
    if (tradeId) {
      whereClause.tradeId = Number(tradeId);
    }
    
    if (commandId) {
      whereClause.commandId = Number(commandId);
    }
    
    if (centerId) {
      whereClause.centerId = Number(centerId);
    }
    
    if (paperType) {
      whereClause.paperType = paperType;
    }
    
    if (upcoming === 'true') {
      whereClause.startTime = {
        gte: new Date()
      };
    }

    const examSlotsRaw = await prisma.examSlot.findMany({
      where: whereClause,
      include: {
        trade: true,
        command: true,
        center: true,
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

    const examSlots = await attachQuestionCounts(examSlotsRaw, prisma);

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
      include: { trade: true, command: true, center: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Parse selected exam types
    const selectedTypes = candidate.selectedExamTypes 
      ? JSON.parse(candidate.selectedExamTypes) 
      : [];

    // Get available slots for candidate's trade and selected exam types
    const availableSlotsRaw = await prisma.examSlot.findMany({
      where: {
        tradeId: candidate.tradeId,
        paperType: { in: selectedTypes },
        startTime: { gte: new Date() },
        isActive: true,
        commandId: candidate.commandId,
        ...(candidate.centerId ? { centerId: candidate.centerId } : {})
      },
      include: {
        trade: true,
        command: true,
        center: true,
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

    const availableSlots = await attachQuestionCounts(availableSlotsRaw, prisma);

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
      include: { trade: true, command: true, center: true }
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Validate slot
    const slot = await prisma.examSlot.findUnique({
      where: { id: Number(slotId) },
      include: { trade: true, command: true, center: true }
    });

    if (!slot) {
      return res.status(404).json({ error: "Exam slot not found" });
    }

    // Ensure candidate belongs to the same command (and center if provided)
    if (candidate.commandId !== slot.commandId) {
      return res.status(403).json({ error: "Candidate does not belong to the slot's command" });
    }

    if (candidate.centerId && candidate.centerId !== slot.centerId) {
      return res.status(403).json({ error: "Candidate is not assigned to this conducting center" });
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
    const {
      tradeId,
      paperType,
      startTime,
      endTime,
      commandId,
      centerId
    } = req.body;

    const existingSlot = await prisma.examSlot.findUnique({
      where: { id: Number(id) }
    });

    if (!existingSlot) {
      return res.status(404).json({ error: "Exam slot not found" });
    }

    const resolvedTradeId = tradeId ? Number(tradeId) : existingSlot.tradeId;
    const resolvedPaperType = paperType || existingSlot.paperType;
    const resolvedCommandId = commandId ? Number(commandId) : existingSlot.commandId;
    const resolvedCenterId = centerId ? Number(centerId) : existingSlot.centerId;

    const trade = await prisma.trade.findUnique({ where: { id: resolvedTradeId } });
    if (!trade) {
      return res.status(404).json({ error: "Trade not found" });
    }

    // Validate paper type for trade
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

    const tradeField = paperTypeMap[resolvedPaperType];
    if (tradeField && !trade[tradeField]) {
      return res.status(400).json({ error: `${resolvedPaperType} is not enabled for trade ${trade.name}` });
    }

    const command = await prisma.command.findUnique({ where: { id: resolvedCommandId } });
    if (!command) {
      return res.status(404).json({ error: "Command not found" });
    }

    const center = await prisma.conductingCenter.findUnique({
      where: { id: resolvedCenterId },
      include: { command: true }
    });

    if (!center) {
      return res.status(404).json({ error: "Conducting center not found" });
    }

    if (center.commandId !== resolvedCommandId) {
      return res.status(400).json({ error: "Center does not belong to selected command" });
    }

    const updatePayload = {
      tradeId: resolvedTradeId,
      paperType: resolvedPaperType,
      commandId: resolvedCommandId,
      centerId: resolvedCenterId,
      ...(startTime ? { startTime: new Date(startTime) } : {}),
      ...(endTime ? { endTime: new Date(endTime) } : {})
    };

    const examSlotRaw = await prisma.examSlot.update({
      where: { id: Number(id) },
      data: updatePayload,
      include: {
        trade: true,
        command: true,
        center: true
      }
    });

    const examSlot = await attachQuestionCount(examSlotRaw, prisma);

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
 * Manually trigger auto-assignment of candidates to a slot
 */
exports.triggerAutoAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assignedCount = await autoAssignCandidatesToSlot(Number(id));
    
    res.json({
      success: true,
      message: `Auto-assigned ${assignedCount} candidates to slot ${id}`,
      assignedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getSlotDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const slotRaw = await prisma.examSlot.findUnique({
      where: { id: Number(id) },
      include: {
        trade: true,
        command: true,
        center: true,
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

    if (!slotRaw) {
      return res.status(404).json({ error: "Exam slot not found" });
    }

    const slot = await attachQuestionCount(slotRaw, prisma);

    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
