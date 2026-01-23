const prisma = require("../config/prisma");
const { attachQuestionCounts } = require("../utils/questionCounts");
const { recalcSlotCurrentCount } = require("../utils/slotUtils");

// Function to auto-assign candidates to newly created slots
const autoAssignCandidatesToSlot = async (slotId) => {
  try {
    const slot = await prisma.examSlot.findUnique({
      where: { id: slotId },
      include: { trade: true, command: true, center: true }
    });

    if (!slot) {
      console.log('❌ Slot not found for auto-assignment:', slotId);
      return;
    }

    console.log('🔄 Auto-assigning candidates to new slot:', {
      slotId: slot.id,
      trade: slot.trade?.name,
      paperType: slot.paperType,
      command: slot.command?.name,
      center: slot.center?.name
    });

    // Find candidates who need this slot
    const candidatesNeedingSlot = await prisma.candidate.findMany({
      where: {
        tradeId: slot.tradeId,
        commandId: slot.commandId,
        centerId: slot.centerId,
        // Only candidates who don't already have a slot for this paper type
        examSlots: {
          none: {
            paperType: slot.paperType,
            isActive: true
          }
        }
      },
      include: {
        trade: true,
        command: true,
        center: true
      }
    });

    console.log(`📋 Found ${candidatesNeedingSlot.length} candidates needing ${slot.paperType} slots`);

    if (candidatesNeedingSlot.length === 0) {
      return;
    }

    // Assign candidates to the slot
    const assignedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      
      for (const candidate of candidatesNeedingSlot) {
        try {
          // Parse selectedExamTypes to check if candidate needs this paper type
          const selectedTypes = JSON.parse(candidate.selectedExamTypes || "[]");
          if (!selectedTypes.includes(slot.paperType)) {
            continue;
          }

          await tx.candidate.update({
            where: { id: candidate.id },
            data: {
              examSlots: {
                connect: { id: slot.id }
              }
            }
          });

          console.log(`✅ Assigned candidate ${candidate.armyNo} to slot ${slot.id}`);
          count++;
        } catch (error) {
          console.log(`⚠️ Failed to assign candidate ${candidate.armyNo}:`, error.message);
        }
      }

      // Update slot current count
      await recalcSlotCurrentCount(tx, slot.id);
      
      return count;
    });

    console.log(`🎯 Auto-assigned ${assignedCount} candidates to slot ${slot.id}`);
    return assignedCount;
  } catch (error) {
    console.error('💥 Error in auto-assignment:', error);
  }
};

const WRITTEN_PAPER_TYPES = [
  ["wp1", "WP-I"],
  ["wp2", "WP-II"],
  ["wp3", "WP-III"],
];
const WRITTEN_SEQUENCE = ["WP-I", "WP-II", "WP-III"];

const parseSelectedExamTypesString = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const normalizeSelectedExamTypesInput = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (error) {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const writtenTypesForTrade = (trade) => {
  if (!trade) return [];
  return WRITTEN_PAPER_TYPES
    .filter(([flag]) => Boolean(trade[flag]))
    .map(([, label]) => label);
};

const stringifySelectedExamTypes = (types) => JSON.stringify(Array.from(new Set(types)));

const parseDateInput = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeDateForComparison = (value) => {
  if (!value) return null;

  const ensureISO = (date) => (date ? date.toISOString().split("T")[0] : null);

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : ensureISO(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const normalized = trimmed.replace(/\//g, "-");
    const dashFormatMatch = /^([0-3]?\d)-([0-1]?\d)-(\d{4})$/.exec(normalized);

    if (dashFormatMatch) {
      const [, dayStr, monthStr, yearStr] = dashFormatMatch;
      const day = Number(dayStr);
      const month = Number(monthStr);
      const year = Number(yearStr);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        if (
          utcDate.getUTCFullYear() === year &&
          utcDate.getUTCMonth() === month - 1 &&
          utcDate.getUTCDate() === day
        ) {
          return ensureISO(utcDate);
        }
      }
      return null;
    }

    const directDate = new Date(normalized);
    return Number.isNaN(directDate.getTime()) ? null : ensureISO(directDate);
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : ensureISO(fallback);
};

const getOrderedWrittenTypes = (selectedTypes = []) =>
  WRITTEN_SEQUENCE.filter((type) => selectedTypes.includes(type));

const slotSummary = (slot) =>
  slot
    ? {
        id: slot.id,
        paperType: slot.paperType,
        startTime: slot.startTime,
        endTime: slot.endTime,
        command: slot.command?.name || null,
        center: slot.center?.name || null
      }
    : null;

const ensureSlotForPaper = async (candidate, paperType) => {
  if (!paperType) return null;
  const now = new Date();

  console.log('🎯 Ensuring slot for paper:', {
    candidateId: candidate.id,
    armyNo: candidate.armyNo,
    trade: candidate.trade?.name,
    paperType,
    command: candidate.command?.name,
    center: candidate.center?.name
  });

  // First check if candidate is already assigned to a slot for this paper type
  const existingSlot = await prisma.examSlot.findFirst({
    where: {
      tradeId: candidate.tradeId,
      paperType,
      isActive: true,
      endTime: { gte: now },
      candidates: {
        some: { id: candidate.id }
      }
    },
    orderBy: { startTime: "asc" },
    include: { command: true, center: true }
  });

  if (existingSlot) {
    console.log('✅ Found existing slot assignment:', existingSlot.id);
    return existingSlot;
  }

  // STRICT SLOT FILTERING: Must match trade, command, and center
  const slotFilters = {
    tradeId: candidate.tradeId,
    paperType,
    commandId: candidate.commandId, // MUST match command
    isActive: true,
    endTime: { gte: now } // Changed from startTime to endTime - allow assignment to ongoing slots
  };

  // MUST match center if candidate has one assigned
  if (candidate.centerId) {
    slotFilters.centerId = candidate.centerId;
  }

  console.log('🔍 Searching for available slots with filters:', slotFilters);

  const nextSlot = await prisma.examSlot.findFirst({
    where: slotFilters,
    orderBy: { startTime: "asc" },
    include: { command: true, center: true }
  });

  if (!nextSlot) {
    console.log('❌ No matching slots found for candidate:', {
      trade: candidate.trade?.name,
      paperType,
      command: candidate.command?.name,
      center: candidate.center?.name
    });
    return null;
  }

  console.log('✅ Found available slot:', {
    slotId: nextSlot.id,
    startTime: nextSlot.startTime,
    command: nextSlot.command?.name,
    center: nextSlot.center?.name
  });

  // Assign candidate to the slot
  try {
    await prisma.examSlot.update({
      where: { id: nextSlot.id },
      data: {
        currentCount: { increment: 1 },
        candidates: {
          connect: { id: candidate.id }
        }
      }
    });
    
    console.log('✅ Successfully assigned candidate to slot:', nextSlot.id);
  } catch (error) {
    console.log('⚠️ Slot assignment error (possibly already connected):', error.message);
    // Ignore duplicate connection errors and continue
  }

  return nextSlot;
};

const loadCandidateDetail = async (candidateId) => {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      rank: true,
      trade: true,
      command: true,
      center: true,
      practicalMarks: true,
      examSlots: {
        include: {
          trade: true,
          command: true,
          center: true
        }
      },
      examAttempts: {
        include: {
          examPaper: true,
          examSlot: true,
          answers: { select: { id: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!candidate) {
    return null;
  }

  const selectedExamTypes = parseSelectedExamTypesString(candidate.selectedExamTypes);
  const examSlots = await attachQuestionCounts(candidate.examSlots || [], prisma);

  return {
    ...candidate,
    examSlots,
    selectedExamTypes,
    examAttempts: candidate.examAttempts?.map((attempt) => ({
      id: attempt.id,
      status: attempt.status,
      score: attempt.score,
      percentage: attempt.percentage,
      totalMarks: attempt.totalMarks,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      examPaper: attempt.examPaper,
      examSlot: attempt.examSlot,
      answersRecorded: attempt.answers?.length ?? undefined
    })) || []
  };
};

/* ================= REGISTER CANDIDATE ================= */

exports.register = async (req, res) => {
  try {
    const {
      armyNo,
      name,
      unit,
      medCat,
      corps,
      dob,
      doe,
      rankId,
      tradeId,
      commandId,
      centerId,
      selectedExamTypes,
      slotIds
    } = req.body;

    // Validate selectedExamTypes
    if (!selectedExamTypes || !Array.isArray(selectedExamTypes) || selectedExamTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please select at least one exam type (WP-I or WP-II)"
      });
    }

    // Validate exam types - only allow WP-I and WP-II since WP-III is not enabled for any trade
    const validExamTypes = ["WP-I", "WP-II"];
    const invalidTypes = selectedExamTypes.filter(type => !validExamTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid exam types: ${invalidTypes.join(", ")}. Currently only WP-I and WP-II are available.`
      });
    }

    const trade = await prisma.trade.findUnique({ where: { id: Number(tradeId) } });

    if (!trade) {
      return res.status(400).json({
        success: false,
        error: "Selected trade not found"
      });
    }

    const allowedExamTypes = writtenTypesForTrade(trade);

    const normalizedExamTypes = normalizeSelectedExamTypesInput(selectedExamTypes).filter((type) =>
      allowedExamTypes.includes(type)
    );

    if (!normalizedExamTypes.length) {
      return res.status(400).json({
        success: false,
        error: "Selected exam types are not enabled for the chosen trade"
      });
    }

    // Validate slot assignments if provided
    const slotIdList = Array.isArray(slotIds)
      ? slotIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
      : [];

    if (slotIdList.length > 0) {
      const slots = await prisma.examSlot.findMany({
        where: { id: { in: slotIdList } },
        include: {
          trade: true,
          command: true,
          center: true
        }
      });

      if (slots.length !== slotIdList.length) {
        return res.status(400).json({
          success: false,
          error: "One or more exam slots not found"
        });
      }

      // Validate slot compatibility
      for (const slot of slots) {
        if (slot.tradeId !== Number(tradeId)) {
          return res.status(400).json({
            success: false,
            error: `Slot ${slot.id} trade does not match candidate trade`
          });
        }

        if (slot.commandId !== Number(commandId)) {
          return res.status(400).json({
            success: false,
            error: `Slot ${slot.id} command does not match candidate command`
          });
        }

        if (centerId && slot.centerId !== Number(centerId)) {
          return res.status(400).json({
            success: false,
            error: `Slot ${slot.id} center does not match candidate center`
          });
        }

        if (!normalizedExamTypes.includes(slot.paperType)) {
          return res.status(400).json({
            success: false,
            error: `Slot ${slot.id} paper type (${slot.paperType}) is not in selected exam types`
          });
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.create({
        data: {
          armyNo,
          name,
          unit,
          medCat,
          corps,
          dob: new Date(dob),
          doe: new Date(doe),
          selectedExamTypes: stringifySelectedExamTypes(normalizedExamTypes),
          rankId: Number(rankId),
          tradeId: Number(tradeId),
          commandId: Number(commandId),
          centerId: centerId ? Number(centerId) : null
        }
      });

      // Assign slots if provided
      if (slotIdList.length > 0) {
        await tx.candidate.update({
          where: { id: candidate.id },
          data: {
            examSlots: {
              connect: slotIdList.map((id) => ({ id }))
            }
          }
        });

        // Update slot current counts
        await Promise.all(
          slotIdList.map((slotId) => recalcSlotCurrentCount(tx, slotId))
        );
      }

      return candidate;
    });

    res.json({
      success: true,
      candidate: result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

/* ================= PEEK CANDIDATE (PUBLIC) ================= */

exports.peek = async (req, res) => {
  try {
    const { armyNo } = req.body;

    if (!armyNo) {
      return res.status(400).json({ candidate: null, error: "Army number required" });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { armyNo },
      include: {
        trade: true,
        command: true,
        center: true
      }
    });

    if (!candidate) {
      return res.json({ candidate: null });
    }

    res.json({
      candidate: {
        id: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        trade: candidate.trade ? { id: candidate.trade.id, name: candidate.trade.name } : null,
        command: candidate.command ? { id: candidate.command.id, name: candidate.command.name } : null,
        center: candidate.center ? { id: candidate.center.id, name: candidate.center.name } : null,
        selectedExamTypes: JSON.parse(candidate.selectedExamTypes || "[]")
      }
    });
  } catch (error) {
    res.status(500).json({ candidate: null, error: error.message });
  }
};

/* ================= LOGIN CANDIDATE ================= */

exports.login = async (req, res) => {
  try {
    console.log('🔐 Candidate login attempt:', req.body);
    
    const { armyNo, dob, paperType } = req.body;

    if (!armyNo || !dob) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        error: "Army number and date of birth are required"
      });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { armyNo },
      include: {
        rank: true,
        trade: true,
        command: true,
        center: true
      }
    });

    if (!candidate) {
      console.log('❌ Candidate not found:', armyNo);
      return res.status(401).json({
        success: false,
        error: "Invalid army number or date of birth"
      });
    }

    // Verify date of birth (convert to YYYY-MM-DD format for comparison)
    const candidateDob = normalizeDateForComparison(candidate.dob);
    const providedDob = normalizeDateForComparison(dob);

    if (!candidateDob || !providedDob || candidateDob !== providedDob) {
      console.log('❌ Date mismatch for:', armyNo);
      return res.status(401).json({
        success: false,
        error: "Invalid army number or date of birth"
      });
    }

    const selectedTypes = JSON.parse(candidate.selectedExamTypes || "[]");
    const orderedWrittenTypes = getOrderedWrittenTypes(selectedTypes);

    const attempts = await prisma.examAttempt.findMany({
      where: { candidateId: candidate.id },
      include: { examPaper: true }
    });

    const completedPapers = new Set(
      attempts
        .filter((attempt) => attempt.status === "COMPLETED" && attempt.examPaper)
        .map((attempt) => attempt.examPaper.paperType)
    );

    const inProgressAttempt = attempts.find(
      (attempt) => attempt.status === "IN_PROGRESS" && attempt.examPaper
    );

    let enforcedPaperType = null;

    if (inProgressAttempt) {
      enforcedPaperType = inProgressAttempt.examPaper.paperType;
    } else {
      enforcedPaperType = orderedWrittenTypes.find((type) => !completedPapers.has(type)) || null;
    }

    if (!enforcedPaperType) {
      return res.status(400).json({
        success: false,
        error: "All registered written papers are already completed. Please contact the exam cell for reactivation."
      });
    }

    if (paperType && paperType !== enforcedPaperType) {
      return res.status(400).json({
        success: false,
        error: `${paperType} is locked. Next available paper: ${enforcedPaperType}`,
        requiredPaper: enforcedPaperType
      });
    }

    const assignedSlot = await ensureSlotForPaper(candidate, enforcedPaperType);

    // CRITICAL FIX: Check if slot assignment was successful
    if (!assignedSlot) {
      console.log('❌ No exam slots available for candidate:', {
        armyNo: candidate.armyNo,
        trade: candidate.trade?.name,
        paperType: enforcedPaperType,
        command: candidate.command?.name,
        center: candidate.center?.name
      });
      
      return res.status(400).json({
        success: false,
        error: `No exam slots are available for ${enforcedPaperType} paper for your trade (${candidate.trade?.name}) in your command/center. Please contact the exam cell to create slots.`
      });
    }

    // Create a simple token for candidate
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { 
        id: candidate.id, 
        armyNo: candidate.armyNo,
        role: 'CANDIDATE'
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    console.log('✅ Candidate login successful:', armyNo);
    res.json({
      success: true,
      token,
      candidate: {
        id: candidate.id,
        armyNo: candidate.armyNo,
        name: candidate.name,
        rank: candidate.rank,
        trade: candidate.trade,
        command: candidate.command,
        center: candidate.center,
        selectedExamTypes: selectedTypes,
        paperSequence: orderedWrittenTypes,
        activePaperType: enforcedPaperType,
        completedPapers: Array.from(completedPapers),
        inProgressAttemptId: inProgressAttempt?.id || null,
        slotAssignment: slotSummary(assignedSlot)
      }
    });
  } catch (err) {
    console.error('💥 Candidate login error:', err);
    res.status(500).json({
      success: false,
      error: "Login failed"
    });
  }
};

/* ================= GET CANDIDATE BY ID ================= */

exports.getCandidateById = async (req, res) => {
  try {
    const candidateId = Number(req.params.candidateId);

    const candidate = await loadCandidateDetail(candidateId);

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= UPDATE CANDIDATE (ADMIN) ================= */

exports.updateCandidate = async (req, res) => {
  const candidateId = Number(req.params.candidateId);

  try {
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        trade: true,
        examSlots: { select: { id: true } }
      }
    });

    if (!existingCandidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const {
      name,
      unit,
      medCat,
      corps,
      dob,
      doe,
      rankId,
      tradeId,
      commandId,
      centerId,
      selectedExamTypes,
      slotIds
    } = req.body;

    const updatePayload = {};

    if (name !== undefined) updatePayload.name = name;
    if (unit !== undefined) updatePayload.unit = unit;
    if (medCat !== undefined) updatePayload.medCat = medCat;
    if (corps !== undefined) updatePayload.corps = corps;
    if (dob !== undefined) {
      const parsedDob = parseDateInput(dob);
      if (!parsedDob) {
        return res.status(400).json({ error: "Invalid date format for dob" });
      }
      updatePayload.dob = parsedDob;
    }
    if (doe !== undefined) {
      const parsedDoe = parseDateInput(doe);
      if (!parsedDoe) {
        return res.status(400).json({ error: "Invalid date format for doe" });
      }
      updatePayload.doe = parsedDoe;
    }
    if (rankId !== undefined) updatePayload.rankId = Number(rankId);
    if (commandId !== undefined) updatePayload.commandId = Number(commandId);
    if (centerId !== undefined) updatePayload.centerId = centerId ? Number(centerId) : null;

    let resolvedTrade = existingCandidate.trade;
    if (tradeId !== undefined) {
      resolvedTrade = await prisma.trade.findUnique({ where: { id: Number(tradeId) } });
      if (!resolvedTrade) {
        return res.status(400).json({ error: "Selected trade not found" });
      }
      updatePayload.tradeId = Number(tradeId);
    }

    const allowedExamTypes = writtenTypesForTrade(resolvedTrade);

    let normalizedExamTypes = parseSelectedExamTypesString(existingCandidate.selectedExamTypes);
    if (selectedExamTypes !== undefined) {
      normalizedExamTypes = normalizeSelectedExamTypesInput(selectedExamTypes).filter((type) =>
        allowedExamTypes.includes(type)
      );

      if (!normalizedExamTypes.length) {
        return res.status(400).json({
          error: "Selected exam types are not enabled for the chosen trade"
        });
      }

      updatePayload.selectedExamTypes = stringifySelectedExamTypes(normalizedExamTypes);
    }

    const slotIdList = Array.isArray(slotIds)
      ? slotIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
      : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const updatedCandidate = await tx.candidate.update({
        where: { id: candidateId },
        data: updatePayload
      });

      if (slotIdList) {
        const slots = await tx.examSlot.findMany({
          where: { id: { in: slotIdList } },
          include: {
            trade: true,
            command: true,
            center: true
          }
        });

        if (slots.length !== slotIdList.length) {
          throw new Error("One or more exam slots not found");
        }

        for (const slot of slots) {
          if (slot.tradeId !== updatedCandidate.tradeId) {
            throw new Error(`Slot ${slot.id} trade does not match candidate trade`);
          }

          if (slot.commandId !== updatedCandidate.commandId) {
            throw new Error(`Slot ${slot.id} command does not match candidate command`);
          }

          if (updatedCandidate.centerId && slot.centerId !== updatedCandidate.centerId) {
            throw new Error(`Slot ${slot.id} center does not match candidate center`);
          }
        }

        await tx.candidate.update({
          where: { id: candidateId },
          data: {
            examSlots: {
              set: [],
              connect: slotIdList.map((id) => ({ id }))
            }
          }
        });

        const affectedSlotIds = new Set([
          ...existingCandidate.examSlots.map((slot) => slot.id),
          ...slotIdList
        ]);

        await Promise.all(
          Array.from(affectedSlotIds).map((slotId) => recalcSlotCurrentCount(tx, slotId))
        );
      }

      return updatedCandidate;
    });

    const hydrated = await loadCandidateDetail(result.id);

    res.json({ success: true, candidate: hydrated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/* ================= DELETE CANDIDATE (ADMIN) ================= */

exports.deleteCandidate = async (req, res) => {
  const candidateId = Number(req.params.candidateId);

  try {
    const existing = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { examSlots: { select: { id: true } } }
    });

    if (!existing) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({ where: { examAttempt: { candidateId } } });
      await tx.examAttempt.deleteMany({ where: { candidateId } });
      await tx.practicalMarks.deleteMany({ where: { candidateId } });

      await tx.candidate.delete({ where: { id: candidateId } });

      if (existing.examSlots?.length) {
        await Promise.all(
          existing.examSlots.map((slot) => recalcSlotCurrentCount(tx, slot.id))
        );
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= GET ALL CANDIDATES (OPTIONAL) ================= */

exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        rank: true,
        trade: true,
        command: true,
        center: true,
        practicalMarks: true,
        examAttempts: {
          include: {
            examPaper: {
              select: { paperType: true }
            }
          }
        }
      },
      orderBy: { id: "desc" }
    });

    const mapped = candidates.map((candidate) => {
      const selectedExamTypes = parseSelectedExamTypesString(candidate.selectedExamTypes);
      const attempts = Array.isArray(candidate.examAttempts) ? candidate.examAttempts : [];
      const completedAttempts = attempts.filter((attempt) => attempt?.status === "COMPLETED");
      const inProgressAttempts = attempts.filter((attempt) => attempt?.status === "IN_PROGRESS");

      return {
        ...candidate,
        selectedExamTypes,
        attemptSummary: {
          completed: completedAttempts.length,
          inProgress: inProgressAttempts.length,
          total: attempts.length
        }
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("getAllCandidates error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Export the auto-assignment function for use by other controllers
exports.autoAssignCandidatesToSlot = autoAssignCandidatesToSlot;

// Function to assign all unassigned candidates to available slots
exports.assignAllUnassignedCandidates = async (req, res) => {
  try {
    console.log('🔄 Starting bulk assignment of unassigned candidates...');
    
    // Get all active slots
    const activeSlots = await prisma.examSlot.findMany({
      where: {
        isActive: true,
        endTime: { gte: new Date() }
      },
      include: {
        trade: true,
        command: true,
        center: true
      }
    });

    console.log(`📋 Found ${activeSlots.length} active slots`);

    let totalAssigned = 0;
    
    for (const slot of activeSlots) {
      const assignedCount = await autoAssignCandidatesToSlot(slot.id);
      totalAssigned += assignedCount;
    }

    res.json({
      success: true,
      message: `Bulk assignment completed. Assigned ${totalAssigned} candidates to slots.`,
      totalAssigned,
      slotsProcessed: activeSlots.length
    });
  } catch (error) {
    console.error('💥 Error in bulk assignment:', error);
    res.status(500).json({ error: error.message });
  }
};
